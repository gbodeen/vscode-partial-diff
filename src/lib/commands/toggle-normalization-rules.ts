import NormalizationRulePicker from '../normalization-rule-picker';
import NormalizationRuleStore from '../normalization-rule-store';
import { Command } from './command';
import WindowAdaptor from '../adaptors/window';

export default class ChangeDiffNormalizationCommand implements Command {
	private readonly normalizationRulePicker: NormalizationRulePicker;

	constructor(private readonly normalizationRuleStore: NormalizationRuleStore,
		private readonly windowAdaptor: WindowAdaptor) {
		this.normalizationRulePicker = new NormalizationRulePicker(windowAdaptor);
	}

	async execute() {
		const rules = this.normalizationRuleStore.getAllRules();
		if (rules.length > 0) {
			const newRules = await this.normalizationRulePicker.show(rules);
			this.normalizationRuleStore.specifyActiveRules(newRules);
		} else {
			await this.windowAdaptor.showInformationMessage(
				'Please set `partialDiff.preComparisonTextNormalizationRules` first'
			);
		}
	}

}
