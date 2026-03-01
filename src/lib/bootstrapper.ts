import CommandFactory from './command-factory';
import ContentProvider from './content-provider';
import { EXTENSION_NAMESPACE, EXTENSION_SCHEME } from './const';
import WorkspaceAdaptor from './adaptors/workspace';
import CommandAdaptor, { CommandItem } from './adaptors/command';
import WindowAdaptor from './adaptors/window';
import TextEditor from './adaptors/text-editor';
import OpenEditorSnapshotStore from './open-editor-snapshot-store';
import * as vscode from 'vscode';

export default class Bootstrapper {
	constructor(private readonly commandFactory: CommandFactory,
		private readonly contentProvider: ContentProvider,
		private readonly workspaceAdaptor: WorkspaceAdaptor,
		private readonly commandAdaptor: CommandAdaptor,
		private readonly windowAdaptor: WindowAdaptor,
		private readonly openEditorSnapshotStore: OpenEditorSnapshotStore,
		private readonly clipboard: typeof vscode.env.clipboard) { }

	initiate(context: vscode.ExtensionContext) {
		this.registerProviders(context);
		this.registerCommands(context);
		this.monitorClipboard(context);
		this.monitorVisibleEditors(context);
		this.monitorTextSelections(context);
		this.monitorOpenEditors(context);
	}

	private registerProviders(context: vscode.ExtensionContext) {
		const disposable = this.workspaceAdaptor.registerTextDocumentContentProvider(
			EXTENSION_SCHEME,
			this.contentProvider
		);
		context.subscriptions.push(disposable);
	}

	private registerCommands(context: vscode.ExtensionContext) {
		this.commandList.forEach(cmd => {
			const disposable = this.commandAdaptor.registerCommand(cmd);
			context.subscriptions.push(disposable);
		});
	}

	private monitorClipboard(context: vscode.ExtensionContext) {
		this.updateClipboardContext();
		const disposable = this.windowAdaptor.onDidChangeWindowState(state => {
			if (state.focused) {
				this.updateClipboardContext();
			}
		});
		context.subscriptions.push(disposable);
	}

	private async updateClipboardContext() {
		const text = await this.clipboard.readText();
		this.commandAdaptor.setContext('partialDiff.clipboardHasText', text.length > 0);
	}

	private monitorVisibleEditors(context: vscode.ExtensionContext) {
		const visibleEditors = this.windowAdaptor.visibleTextEditors;
		this.updateVisibleEditorsContext(visibleEditors);
		this.syncVisibleEditorSnapshots(visibleEditors);
		const disposable = this.windowAdaptor.onDidChangeVisibleTextEditors(() => {
			const currentVisibleEditors = this.windowAdaptor.visibleTextEditors;
			this.updateVisibleEditorsContext(currentVisibleEditors);
			this.syncVisibleEditorSnapshots(currentVisibleEditors);
		});
		context.subscriptions.push(disposable);
	}

	private updateVisibleEditorsContext(visibleEditors: TextEditor[]) {
		this.commandAdaptor.setContext('partialDiff.hasTwoVisibleEditors',
			visibleEditors.length === 2);
	}

	private monitorTextSelections(context: vscode.ExtensionContext) {
		const disposable = this.windowAdaptor.onDidChangeTextEditorSelection(event => {
			this.cacheEditorSelection(new TextEditor(event.textEditor));
		});
		context.subscriptions.push(disposable);
	}

	private syncVisibleEditorSnapshots(visibleEditors: TextEditor[]) {
		visibleEditors.forEach(editor => this.cacheEditorSelection(editor));
	}

	private cacheEditorSelection(editor: TextEditor) {
		this.openEditorSnapshotStore.set(editor.uri, {
			text: editor.selectedText,
			fileName: editor.fileName,
			lineRanges: editor.selectedLineRanges
		});
	}

	private monitorOpenEditors(context: vscode.ExtensionContext) {
		this.updateOpenEditorsContext();
		const disposable = this.windowAdaptor.onDidChangeTabs(() => {
			this.updateOpenEditorsContext();
		});
		context.subscriptions.push(disposable);
	}

	private updateOpenEditorsContext() {
		this.openEditorSnapshotStore.prune(new Set(this.windowAdaptor.openTextEditorUris));
		this.commandAdaptor.setContext('partialDiff.hasTwoOpenEditors',
			this.windowAdaptor.openTextEditorCount === 2);
	}

	private get commandList(): CommandItem[] {
		return [
			{
				name: `${EXTENSION_NAMESPACE}.compareVisibleEditors`,
				type: 'GENERAL',
				command: this.commandFactory.createCompareVisibleEditorsCommand()
			},
			{
				name: `${EXTENSION_NAMESPACE}.compareOpenEditors`,
				type: 'GENERAL',
				command: this.commandFactory.createCompareOpenEditorsCommand()
			},
			{
				name: `${EXTENSION_NAMESPACE}.selectForCompare`,
				type: 'TEXT_EDITOR',
				command: this.commandFactory.createSelectForCompareCommand()
			},
			{
				name: `${EXTENSION_NAMESPACE}.compareWithSelected`,
				type: 'TEXT_EDITOR',
				command: this.commandFactory.createCompareWithSelectedCommand()
			},
			{
				name: `${EXTENSION_NAMESPACE}.compareWithClipboard`,
				type: 'TEXT_EDITOR',
				command: this.commandFactory.createCompareWithClipboardCommand()
			},
			{
				name: `${EXTENSION_NAMESPACE}.changeDiffNormalization`,
				type: 'GENERAL',
				command: this.commandFactory.createChangeDiffNormalizationCommand()
			}
		];
	}
}
