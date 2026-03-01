import * as vscode from 'vscode';
import SelectionInfoRegistry from './selection-info-registry';
import WorkspaceAdaptor from './adaptors/workspace';
import CommandAdaptor from './adaptors/command';
import { DiffSession, DiffSessionSide } from './types/diff-session';
import ApplyBackService from './apply-back-service';
import { EDITABLE_DIFF_SCHEME } from './const';

export default class EditableDiffSessionManager {
	private readonly sessionsByTempUri = new Map<string, DiffSession>();
	private readonly listeners: vscode.Disposable[];
	private nextSessionId = 0;
	private editableDiffLayoutOverrideRefCount = 0;
	private layoutOverrideOperationQueue: Promise<void> = Promise.resolve();
	private originalLayoutSettings?: {
		renderSideBySide: boolean | undefined;
		useInlineViewWhenSpaceIsLimited: boolean | undefined;
	};

	constructor(
		private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly workspaceAdaptor: WorkspaceAdaptor,
		private readonly commandAdaptor: CommandAdaptor,
		private readonly applyBackService: ApplyBackService
	) {
		this.listeners = [
			this.workspaceAdaptor.onDidChangeTextDocument(event => this.onDidChangeTextDocument(event)),
			this.workspaceAdaptor.onDidCloseTextDocument(doc => this.onDidCloseTextDocument(doc))
		];
	}

	dispose(): void {
		this.listeners.forEach(listener => listener.dispose());
		const sessionsById = new Map<string, DiffSession>();
		this.sessionsByTempUri.forEach(session => sessionsById.set(session.id, session));
		sessionsById.forEach(session => {
			this.applyBackService.cancelSession(session);
			void this.deleteTempFile(session.left.tempUri);
			void this.deleteTempFile(session.right.tempUri);
		});
		this.sessionsByTempUri.clear();
		this.editableDiffLayoutOverrideRefCount = 0;
		void this.withLayoutOverrideLock(async () => {
			this.editableDiffLayoutOverrideRefCount = 0;
			await this.restoreOriginalLayoutSettings();
		});
	}

	async openDiff(textKey1: string, textKey2: string, title: string): Promise<void> {
		await this.acquireEditableDiffLayoutOverride();
		const leftInfo = this.selectionInfoRegistry.get(textKey1);
		const rightInfo = this.selectionInfoRegistry.get(textKey2);
		try {
			const sessionId = String(this.nextSessionId++);
			const [leftTempUri, rightTempUri] = await Promise.all([
				this.createTempFile(sessionId, 'left', leftInfo.text, leftInfo.targetKind === 'clipboard'),
				this.createTempFile(sessionId, 'right', rightInfo.text, rightInfo.targetKind === 'clipboard')
			]);
			const leftSide: DiffSessionSide = {
				textKey: textKey1,
				selectionInfo: leftInfo,
				originalText: leftInfo.text,
				tempUri: leftTempUri,
				conflictNotified: false
			};
			const rightSide: DiffSessionSide = {
				textKey: textKey2,
				selectionInfo: rightInfo,
				originalText: rightInfo.text,
				tempUri: rightTempUri,
				conflictNotified: false
			};
			const session: DiffSession = {
				id: sessionId,
				title,
				left: leftSide,
				right: rightSide
			};
			this.sessionsByTempUri.set(leftTempUri.toString(), session);
			this.sessionsByTempUri.set(rightTempUri.toString(), session);
			try {
				await this.commandAdaptor.executeDiffUris(leftTempUri, rightTempUri, title, {
					originalEditable: leftInfo.targetKind !== 'clipboard'
				});
			} catch (error) {
				this.sessionsByTempUri.delete(leftTempUri.toString());
				this.sessionsByTempUri.delete(rightTempUri.toString());
				await Promise.all([this.deleteTempFile(leftTempUri), this.deleteTempFile(rightTempUri)]);
				throw error;
			}
		} catch (error) {
			await this.releaseEditableDiffLayoutOverride();
			throw error;
		}
	}

	private onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
		const session = this.sessionsByTempUri.get(event.document.uri.toString());
		if (!session) {
			return;
		}
		const side = this.getSideByUri(session, event.document.uri);
		if (!side) {
			return;
		}
		this.applyBackService.scheduleApply(session, side);
	}

	private onDidCloseTextDocument(document: vscode.TextDocument): void {
		const session = this.sessionsByTempUri.get(document.uri.toString());
		if (!session) {
			return;
		}
		this.cleanupSession(session);
	}

	private cleanupSession(session: DiffSession): void {
		this.applyBackService.cancelSession(session);
		this.sessionsByTempUri.delete(session.left.tempUri.toString());
		this.sessionsByTempUri.delete(session.right.tempUri.toString());
		void this.deleteTempFile(session.left.tempUri);
		void this.deleteTempFile(session.right.tempUri);
		void this.releaseEditableDiffLayoutOverride();
	}

	private getSideByUri(session: DiffSession, uri: vscode.Uri): DiffSessionSide | undefined {
		const key = uri.toString();
		if (session.left.tempUri.toString() === key) {
			return session.left;
		}
		if (session.right.tempUri.toString() === key) {
			return session.right;
		}
		return undefined;
	}

	private async createTempFile(
		sessionId: string,
		side: 'left' | 'right',
		text: string,
		readOnly: boolean
	): Promise<vscode.Uri> {
		const readOnlySuffix = readOnly ? '-readonly' : '';
		const fileName = `session-${sessionId}-${side}-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}${readOnlySuffix}.txt`;
		const uri = vscode.Uri.from({
			scheme: EDITABLE_DIFF_SCHEME,
			path: `/${fileName}`
		});
		await this.workspaceAdaptor.writeFile(uri, Buffer.from(text, 'utf8'));
		return uri;
	}

	private async deleteTempFile(uri: vscode.Uri): Promise<void> {
		try {
			await this.workspaceAdaptor.deleteFile(uri);
		} catch {
			// Ignore cleanup failures for already-removed files.
		}
	}

	private async acquireEditableDiffLayoutOverride(): Promise<void> {
		await this.withLayoutOverrideLock(async () => {
			if (this.editableDiffLayoutOverrideRefCount === 0) {
				this.originalLayoutSettings = {
					renderSideBySide: this.workspaceAdaptor.getConfigurationValue<boolean>('diffEditor.renderSideBySide'),
					useInlineViewWhenSpaceIsLimited: this.workspaceAdaptor.getConfigurationValue<boolean>('diffEditor.useInlineViewWhenSpaceIsLimited')
				};
				await Promise.all([
					this.updateDiffEditorSetting('diffEditor.renderSideBySide', true),
					this.updateDiffEditorSetting('diffEditor.useInlineViewWhenSpaceIsLimited', false)
				]);
			}
			this.editableDiffLayoutOverrideRefCount += 1;
		});
	}

	private async releaseEditableDiffLayoutOverride(): Promise<void> {
		await this.withLayoutOverrideLock(async () => {
			if (this.editableDiffLayoutOverrideRefCount === 0) {
				return;
			}
			this.editableDiffLayoutOverrideRefCount -= 1;
			if (this.editableDiffLayoutOverrideRefCount > 0) {
				return;
			}
			await this.restoreOriginalLayoutSettings();
		});
	}

	private withLayoutOverrideLock(operation: () => Promise<void>): Promise<void> {
		const run = this.layoutOverrideOperationQueue.then(operation, operation);
		this.layoutOverrideOperationQueue = run.catch(() => undefined);
		return run;
	}

	private async restoreOriginalLayoutSettings(): Promise<void> {
		const settings = this.originalLayoutSettings;
		if (!settings) {
			return;
		}
		this.originalLayoutSettings = undefined;
		await Promise.all([
			this.updateDiffEditorSetting('diffEditor.renderSideBySide', settings.renderSideBySide),
			this.updateDiffEditorSetting('diffEditor.useInlineViewWhenSpaceIsLimited', settings.useInlineViewWhenSpaceIsLimited)
		]);
	}

	private async updateDiffEditorSetting(
		section: string,
		value: boolean | undefined
	): Promise<void> {
		try {
			await this.workspaceAdaptor.updateConfigurationValue(
				section,
				value,
				vscode.ConfigurationTarget.Workspace
			);
		} catch {
			await this.workspaceAdaptor.updateConfigurationValue(
				section,
				value,
				vscode.ConfigurationTarget.Global
			);
		}
	}
}
