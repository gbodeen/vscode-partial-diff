import { EXTENSION_ID } from '../const';
import type * as vscode from 'vscode';
import type ContentProvider from '../content-provider';

export default class WorkspaceAdaptor {
	constructor(private readonly workspace: typeof vscode.workspace) { }

	get<T>(configName: string): T {
		const extensionConfig = this.workspace.getConfiguration(EXTENSION_ID);
		return extensionConfig.get(configName) as T;
	}

	getConfigurationValue<T>(section: string): T | undefined {
		return this.workspace.getConfiguration().get<T>(section);
	}

	updateConfigurationValue(
		section: string,
		value: unknown,
		target: vscode.ConfigurationTarget
	): Thenable<void> {
		return this.workspace.getConfiguration().update(section, value, target);
	}

	registerTextDocumentContentProvider(EXTENSION_SCHEME: string, contentProvider: ContentProvider): vscode.Disposable {
		return this.workspace.registerTextDocumentContentProvider(EXTENSION_SCHEME, contentProvider);
	}

	registerFileSystemProvider(
		scheme: string,
		provider: vscode.FileSystemProvider,
		options?: { isCaseSensitive?: boolean; isReadonly?: boolean | vscode.MarkdownString }
	): vscode.Disposable {
		return this.workspace.registerFileSystemProvider(scheme, provider, options);
	}

	openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
	openTextDocument(options: { content: string; language?: string }): Thenable<vscode.TextDocument>;
	openTextDocument(uriOrOptions: vscode.Uri | { content: string; language?: string }): Thenable<vscode.TextDocument> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return this.workspace.openTextDocument(uriOrOptions as any);
	}

	onDidChangeTextDocument(listener: (event: vscode.TextDocumentChangeEvent) => void): vscode.Disposable {
		return this.workspace.onDidChangeTextDocument(listener);
	}

	onDidCloseTextDocument(listener: (document: vscode.TextDocument) => void): vscode.Disposable {
		return this.workspace.onDidCloseTextDocument(listener);
	}

	applyEdit(edit: vscode.WorkspaceEdit): Thenable<boolean> {
		return this.workspace.applyEdit(edit);
	}

	createDirectory(uri: vscode.Uri): Thenable<void> {
		return this.workspace.fs.createDirectory(uri);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void> {
		return this.workspace.fs.writeFile(uri, content);
	}

	deleteFile(uri: vscode.Uri): Thenable<void> {
		return this.workspace.fs.delete(uri);
	}
}
