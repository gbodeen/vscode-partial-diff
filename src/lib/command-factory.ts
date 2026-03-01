import SetSelectionCommand from './commands/set-selection';
import CompareWithSelectedCommand from './commands/compare-with-selected';
import CompareWithClipboardCommand from './commands/compare-with-clipboard';
import CompareVisibleEditorsCommand from './commands/compare-visible-editors';
import CompareOpenEditorsCommand from './commands/compare-open-editors';
import DiffPresenter from './diff-presenter';
import ChangeDiffNormalizationCommand from './commands/toggle-normalization-rules';
import NormalizationRuleStore from './normalization-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import CommandAdaptor from './adaptors/command';
import WindowAdaptor from './adaptors/window';
import OpenEditorSnapshotStore from './open-editor-snapshot-store';
import { Command } from './commands/command';
import * as vscode from 'vscode';

export default class CommandFactory {
	private diffPresenter?: DiffPresenter;

	constructor(private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly normalizationRuleStore: NormalizationRuleStore,
		private readonly commandAdaptor: CommandAdaptor,
		private readonly windowAdaptor: WindowAdaptor,
		private readonly openEditorSnapshotStore: OpenEditorSnapshotStore,
		private readonly clipboard: typeof vscode.env.clipboard,
		private readonly getCurrentDate: () => Date) {
	}

	createSelectForCompareCommand(): Command {
		return new SetSelectionCommand(
			this.selectionInfoRegistry,
			() => { this.commandAdaptor.setContext('partialDiff.hasSelection1', true); }
		);
	}

	createCompareWithSelectedCommand(): Command {
		return new CompareWithSelectedCommand(
			this.getDiffPresenter(),
			this.selectionInfoRegistry
		);
	}

	createCompareWithClipboardCommand(): Command {
		return new CompareWithClipboardCommand(
			this.getDiffPresenter(),
			this.selectionInfoRegistry,
			this.clipboard
		);
	}

	createCompareVisibleEditorsCommand(): Command {
		return new CompareVisibleEditorsCommand(
			this.getDiffPresenter(),
			this.selectionInfoRegistry,
			this.windowAdaptor
		);
	}

	createCompareOpenEditorsCommand(): Command {
		return new CompareOpenEditorsCommand(
			this.getDiffPresenter(),
			this.selectionInfoRegistry,
			this.windowAdaptor,
			this.openEditorSnapshotStore
		);
	}

	createChangeDiffNormalizationCommand(): Command {
		return new ChangeDiffNormalizationCommand(
			this.normalizationRuleStore,
			this.windowAdaptor
		);
	}

	private getDiffPresenter(): DiffPresenter {
		this.diffPresenter = this.diffPresenter || new DiffPresenter(
			this.selectionInfoRegistry,
			this.normalizationRuleStore,
			this.commandAdaptor,
			this.getCurrentDate
		);
		return this.diffPresenter;
	}
}
