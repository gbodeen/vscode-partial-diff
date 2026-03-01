import Bootstrapper from './bootstrapper';
import CommandFactory from './command-factory';
import WorkspaceAdaptor from './adaptors/workspace';
import ContentProvider from './content-provider';
import NormalizationRuleStore from './normalization-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import * as vscode from 'vscode';
import CommandAdaptor from './adaptors/command';
import WindowAdaptor from './adaptors/window';

export default class BootstrapperFactory {
	create() {
		const logger = console;
		const selectionInfoRegistry = new SelectionInfoRegistry();
		const workspaceAdaptor = new WorkspaceAdaptor(vscode.workspace);
		const commandAdaptor = new CommandAdaptor(vscode.commands, vscode.Uri.parse, logger);
		const normalizationRuleStore = new NormalizationRuleStore(workspaceAdaptor);
		const windowAdaptor = new WindowAdaptor(vscode.window, vscode.workspace);
		const commandFactory = new CommandFactory(
			selectionInfoRegistry,
			normalizationRuleStore,
			commandAdaptor,
			windowAdaptor,
			vscode.env.clipboard,
			() => new Date()
		);
		const contentProvider = new ContentProvider(selectionInfoRegistry, normalizationRuleStore);
		return new Bootstrapper(commandFactory, contentProvider, workspaceAdaptor, commandAdaptor, windowAdaptor, vscode.env.clipboard);
	}
} 
