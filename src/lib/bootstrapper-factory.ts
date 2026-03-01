import Bootstrapper from './bootstrapper';
import CommandFactory from './command-factory';
import WorkspaceAdaptor from './adaptors/workspace';
import ContentProvider from './content-provider';
import NormalizationRuleStore from './normalization-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import * as vscode from 'vscode';
import CommandAdaptor from './adaptors/command';
import WindowAdaptor from './adaptors/window';
import OpenEditorSnapshotStore from './open-editor-snapshot-store';
import EditableDiffSessionManager from './editable-diff-session-manager';
import ApplyBackService from './apply-back-service';
import EditableDiffFileSystemProvider from './editable-diff-file-system-provider';

export default class BootstrapperFactory {
	create() {
		const logger = console;
		const selectionInfoRegistry = new SelectionInfoRegistry();
		const workspaceAdaptor = new WorkspaceAdaptor(vscode.workspace);
		const commandAdaptor = new CommandAdaptor(vscode.commands, vscode.Uri.parse, logger);
		const normalizationRuleStore = new NormalizationRuleStore(workspaceAdaptor);
		const windowAdaptor = new WindowAdaptor(vscode.window, vscode.workspace);
		const applyBackService = new ApplyBackService(workspaceAdaptor, windowAdaptor, 400);
		const editableDiffSessionManager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);
		const editableDiffFileSystemProvider = new EditableDiffFileSystemProvider();
		const openEditorSnapshotStore = new OpenEditorSnapshotStore();
		const commandFactory = new CommandFactory(
			selectionInfoRegistry,
			normalizationRuleStore,
			workspaceAdaptor,
			commandAdaptor,
			windowAdaptor,
			editableDiffSessionManager,
			openEditorSnapshotStore,
			vscode.env.clipboard,
			() => new Date()
		);
		const contentProvider = new ContentProvider(selectionInfoRegistry, normalizationRuleStore);
		return new Bootstrapper(
			commandFactory,
			contentProvider,
			editableDiffFileSystemProvider,
			workspaceAdaptor,
			commandAdaptor,
			windowAdaptor,
			openEditorSnapshotStore,
			editableDiffSessionManager,
			vscode.env.clipboard
		);
	}
} 
