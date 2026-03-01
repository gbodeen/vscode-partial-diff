import * as vscode from 'vscode';
import TextEditor from './text-editor';
import { QuickPickItem, TextEditor as VsTextEditor, Uri } from 'vscode';
import { SelectionInfo } from '../types/selection-info';
import { basename } from 'path';

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
		return this.window.tabGroups.all
			.flatMap(group => group.tabs)
			.filter(tab => isTabInputText(tab.input))
			.length;
	}

	async getOpenEditorInfos(): Promise<SelectionInfo[]> {
		const tabs = this.window.tabGroups.all
			.flatMap(group => group.tabs)
			.filter(tab => isTabInputText(tab.input));

		const infos: SelectionInfo[] = [];
		for (const tab of tabs) {
			const input = tab.input as { uri: Uri };
			const doc = await this.workspace.openTextDocument(input.uri);
			infos.push({
				text: doc.getText(),
				fileName: basename(doc.fileName),
				lineRanges: []
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

	onDidChangeWindowState(listener: (e: vscode.WindowState) => void): vscode.Disposable {
		return this.window.onDidChangeWindowState(listener);
	}

	onDidChangeVisibleTextEditors(listener: (editors: readonly VsTextEditor[]) => void): vscode.Disposable {
		return this.window.onDidChangeVisibleTextEditors(listener);
	}
}
