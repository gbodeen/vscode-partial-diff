import * as vscode from 'vscode';
import WorkspaceAdaptor from './adaptors/workspace';
import WindowAdaptor from './adaptors/window';
import { DiffSession, DiffSessionSide } from './types/diff-session';
import { SelectionRange } from './types/selection-info';

export default class ApplyBackService {
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

	constructor(
		private readonly workspaceAdaptor: WorkspaceAdaptor,
		private readonly windowAdaptor: WindowAdaptor,
		private readonly debounceMs: number
	) { }

	scheduleApply(session: DiffSession, side: DiffSessionSide): void {
		const key = `${session.id}:${side.textKey}`;
		const existingTimer = this.timers.get(key);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const timer = setTimeout(() => {
			this.timers.delete(key);
			void this.applySide(session, side).catch(error => {
				console.error('Failed to apply editable diff changes back to source document.', error);
			});
		}, this.debounceMs);
		this.timers.set(key, timer);
	}

	cancelSession(session: DiffSession): void {
		[this.sessionKey(session, session.left), this.sessionKey(session, session.right)]
			.forEach(key => {
				const timer = this.timers.get(key);
				if (timer) {
					clearTimeout(timer);
					this.timers.delete(key);
				}
			});
	}

	private sessionKey(session: DiffSession, side: DiffSessionSide): string {
		return `${session.id}:${side.textKey}`;
	}

	private async applySide(_session: DiffSession, side: DiffSessionSide, force = false): Promise<void> {
		const info = side.selectionInfo;
		if (info.targetKind === 'clipboard' || !info.sourceUri) {
			return;
		}

		const tempDoc = await this.workspaceAdaptor.openTextDocument(side.tempUri);
		const nextText = tempDoc.getText();
		const sourceDoc = await this.workspaceAdaptor.openTextDocument(vscode.Uri.parse(info.sourceUri));
		const { range, text: currentTargetText } = this.getTargetRangeAndText(sourceDoc, info);

		if (!force && currentTargetText !== side.originalText) {
			if (!side.conflictNotified) {
				side.conflictNotified = true;
				const choice = await this.windowAdaptor.showWarningMessage(
					'Apply-back blocked: source changed since diff opened.',
					'Force Apply'
				);
				if (choice === 'Force Apply') {
					return this.applySide(_session, side, true);
				}
			}
			return;
		}

		const edit = new vscode.WorkspaceEdit();
		edit.replace(sourceDoc.uri, range, nextText);
		const applied = await this.workspaceAdaptor.applyEdit(edit);
		if (applied) {
			side.originalText = nextText;
			side.conflictNotified = false;
			const selectionRange = this.updateSelectionRange(side, range, nextText, sourceDoc);
			if (selectionRange) {
				this.windowAdaptor.setSelectionInVisibleEditor(sourceDoc.uri, selectionRange);
			}
		}
	}

	private updateSelectionRange(
		side: DiffSessionSide,
		replacedRange: vscode.Range,
		newText: string,
		doc: vscode.TextDocument
	): SelectionRange | undefined {
		if (side.selectionInfo.targetKind !== 'selection' || !side.selectionInfo.selectionRange) {
			return undefined;
		}
		const startOffset = doc.offsetAt(replacedRange.start);
		const newEnd = doc.positionAt(startOffset + newText.length);
		const selectionRange = {
			startLine: replacedRange.start.line,
			startChar: replacedRange.start.character,
			endLine: newEnd.line,
			endChar: newEnd.character
		};
		side.selectionInfo.selectionRange = selectionRange;
		return selectionRange;
	}

	private getTargetRangeAndText(doc: vscode.TextDocument, info: DiffSessionSide['selectionInfo']): { range: vscode.Range; text: string } {
		if (info.targetKind === 'selection' && info.selectionRange) {
			const range = new vscode.Range(
				new vscode.Position(info.selectionRange.startLine, info.selectionRange.startChar),
				new vscode.Position(info.selectionRange.endLine, info.selectionRange.endChar)
			);
			return { range, text: doc.getText(range) };
		}
		const text = doc.getText();
		const end = doc.positionAt(text.length);
		const range = new vscode.Range(new vscode.Position(0, 0), end);
		return { range, text };
	}
}
