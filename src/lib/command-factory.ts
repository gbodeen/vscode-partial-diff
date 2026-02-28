import SaveText1Command from './commands/save-text-1';
import CompareSelectionWithText1Command from './commands/compare-selection-with-text1';
import DiffPresenter from './diff-presenter';
import ToggleNormalisationRulesCommand from './commands/toggle-normalisation-rules';
import NormalisationRuleStore from './normalisation-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import CommandAdaptor from './adaptors/command';
import WindowAdaptor from './adaptors/window';
import { Command } from './commands/command';

export default class CommandFactory {
	constructor(private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly normalisationRuleStore: NormalisationRuleStore,
		private readonly commandAdaptor: CommandAdaptor,
		private readonly windowAdaptor: WindowAdaptor,
		private readonly getCurrentDate: () => Date) {
	}

	crateSaveText1Command(): Command {
		return new SaveText1Command(
			this.selectionInfoRegistry,
			() => { this.commandAdaptor.setContext('partialDiff.hasSelection1', true); }
		);
	}

	createCompareSelectionWithText1Command(): Command {
		return new CompareSelectionWithText1Command(
			new DiffPresenter(
				this.selectionInfoRegistry,
				this.normalisationRuleStore,
				this.commandAdaptor,
				this.getCurrentDate
			),
			this.selectionInfoRegistry
		);
	}

	createToggleNormalisationRulesCommand(): Command {
		return new ToggleNormalisationRulesCommand(
			this.normalisationRuleStore,
			this.windowAdaptor
		);
	}
}
