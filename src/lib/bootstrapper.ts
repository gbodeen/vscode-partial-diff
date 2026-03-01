import CommandFactory from './command-factory';
import ContentProvider from './content-provider';
import { EXTENSION_NAMESPACE, EXTENSION_SCHEME } from './const';
import { ExecutionContextLike } from './types/vscode';
import WorkspaceAdaptor from './adaptors/workspace';
import CommandAdaptor, { CommandItem } from './adaptors/command';
import WindowAdaptor from './adaptors/window';
import * as vscode from 'vscode';

export default class Bootstrapper {
	constructor(private readonly commandFactory: CommandFactory,
		private readonly contentProvider: ContentProvider,
		private readonly workspaceAdaptor: WorkspaceAdaptor,
		private readonly commandAdaptor: CommandAdaptor,
		private readonly windowAdaptor: WindowAdaptor,
		private readonly clipboard: typeof vscode.env.clipboard) { }

	initiate(context: ExecutionContextLike) {
		this.registerProviders(context);
		this.registerCommands(context);
		this.monitorClipboard(context);
		this.monitorVisibleEditors(context);
		this.monitorOpenEditors(context);
	}

	private registerProviders(context: ExecutionContextLike) {
		const disposable = this.workspaceAdaptor.registerTextDocumentContentProvider(
			EXTENSION_SCHEME,
			this.contentProvider
		);
		context.subscriptions.push(disposable);
	}

	private registerCommands(context: ExecutionContextLike) {
		this.commandList.forEach(cmd => {
			const disposable = this.commandAdaptor.registerCommand(cmd);
			context.subscriptions.push(disposable);
		});
	}

	private monitorClipboard(context: ExecutionContextLike) {
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

	private monitorVisibleEditors(context: ExecutionContextLike) {
		this.updateVisibleEditorsContext();
		const disposable = this.windowAdaptor.onDidChangeVisibleTextEditors(() => {
			this.updateVisibleEditorsContext();
		});
		context.subscriptions.push(disposable);
	}

	private updateVisibleEditorsContext() {
		this.commandAdaptor.setContext('partialDiff.hasTwoVisibleEditors',
			this.windowAdaptor.visibleTextEditors.length === 2);
	}

	private monitorOpenEditors(context: ExecutionContextLike) {
		this.updateOpenEditorsContext();
		const disposable = this.windowAdaptor.onDidChangeTabs(() => {
			this.updateOpenEditorsContext();
		});
		context.subscriptions.push(disposable);
	}

	private updateOpenEditorsContext() {
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
