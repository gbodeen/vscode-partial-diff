import * as vscode from 'vscode';
import TextEditor from './text-editor';
import {
	QuickPickItem,
	TextEditor as VsTextEditor,
	Uri,
	TextEditorSelectionChangeEvent
} from 'vscode';
import { basename } from 'path';
import { SelectionRange } from '../types/selection-info';

export interface OpenTextEditorInfo {
	uri: string;
	text: string;
	fileName: string;
}

// Duck-type check for TabInputText to avoid a runtime reference to the
// vscode module (which is only available inside the extension host).
function isTabInputText(input: unknown): input is { uri: Uri } {
	return input != null && typeof input === 'object'
		&& 'uri' in input && !('modified' in input)
		&& !('viewType' in input) && !('notebookType' in input);
}

export default class WindowAdaptor {
	constructor(private readonly window: typeof vscode.window,
		private readonly workspace: typeof vscode.workspace) { }

	get visibleTextEditors(): TextEditor[] {
		return this.window.visibleTextEditors.map((editor: VsTextEditor) => new TextEditor(editor));
	}

	get openTextEditorCount(): number {
		return this.getOpenTextTabInputs().length;
	}

	get openTextEditorUris(): string[] {
		return this.getOpenTextTabInputs()
			.map(tab => (tab.input as { uri: Uri }).uri.toString());
	}

	async getOpenTextEditorInfos(): Promise<OpenTextEditorInfo[]> {
		const tabs = this.getOpenTextTabInputs();
		const infos: OpenTextEditorInfo[] = [];
		for (const tab of tabs) {
			const input = tab.input as { uri: Uri };
			const doc = await this.workspace.openTextDocument(input.uri);
			infos.push({
				uri: input.uri.toString(),
				text: doc.getText(),
				fileName: basename(doc.fileName)
			});
		}
		return infos;
	}

	onDidChangeTabs(listener: (e: vscode.TabChangeEvent) => void): vscode.Disposable {
		return this.window.tabGroups.onDidChangeTabs(listener);
	}

	async showQuickPick<T extends QuickPickItem>(items: T[]): Promise<T[] | undefined> {
		return this.window.showQuickPick(items, { canPickMany: true });
	}

	async showInformationMessage(message: string): Promise<string | undefined> {
		return this.window.showInformationMessage(message);
	}

	async showWarningMessage(message: string, ...actions: string[]): Promise<string | undefined> {
		return this.window.showWarningMessage(message, ...actions);
	}

	showTextDocument(document: vscode.TextDocument, viewColumn?: vscode.ViewColumn): Thenable<VsTextEditor> {
		return this.window.showTextDocument(document, viewColumn);
	}

	setSelectionInVisibleEditor(uri: vscode.Uri, selectionRange: SelectionRange): void {
		const editor = this.window.visibleTextEditors
			.find(visibleEditor => visibleEditor.document.uri.toString() === uri.toString());
		if (!editor) {
			return;
		}
		const selection = new vscode.Selection(
			new vscode.Position(selectionRange.startLine, selectionRange.startChar),
			new vscode.Position(selectionRange.endLine, selectionRange.endChar)
		);
		editor.selections = [selection];
	}

	async closeNonDiffTabsByUri(uris: vscode.Uri[]): Promise<void> {
		const uriStrings = new Set(uris.map(u => u.toString()));
		const strayTabs = this.window.tabGroups.all
			.flatMap(group => group.tabs)
			.filter(tab => isTabInputText(tab.input) && uriStrings.has((tab.input as { uri: Uri }).uri.toString()));
		for (const tab of strayTabs) {
			await this.window.tabGroups.close(tab);
		}
	}

	onDidChangeWindowState(listener: (e: vscode.WindowState) => void): vscode.Disposable {
		return this.window.onDidChangeWindowState(listener);
	}

	onDidChangeVisibleTextEditors(listener: (editors: readonly VsTextEditor[]) => void): vscode.Disposable {
		return this.window.onDidChangeVisibleTextEditors(listener);
	}

	onDidChangeTextEditorSelection(listener: (e: TextEditorSelectionChangeEvent) => void): vscode.Disposable {
		return this.window.onDidChangeTextEditorSelection(listener);
	}

	private getOpenTextTabInputs(): vscode.Tab[] {
		return this.window.tabGroups.all
			.flatMap(group => group.tabs)
			.filter(tab => isTabInputText(tab.input));
	}
}
