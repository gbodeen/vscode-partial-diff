import { QuickPickItem } from 'vscode';
import { LoadedNormalizationRule } from './types/normalization-rule';
import WindowAdaptor from './adaptors/window';

interface NormalizationRuleQuickPickItem extends QuickPickItem {
	picked: boolean;
	ruleIndex: number;
}

export default class NormalizationRulePicker {
	constructor(private readonly windowAdaptor: WindowAdaptor) { }

	async show(rules: LoadedNormalizationRule[]): Promise<number[]> {
		const items = this.convertToQuickPickItems(rules);
		const userSelection = await this.windowAdaptor.showQuickPick(items);
		const activeItems = userSelection || items.filter(item => item.picked);
		return this.convertToRules(activeItems);
	}

	private convertToQuickPickItems(rules: LoadedNormalizationRule[]): NormalizationRuleQuickPickItem[] {
		return rules.map((rule, index) => ({
			label: rule.name || '(no "name" set for this rule)',
			picked: rule.active,
			ruleIndex: index,
			description: ''
		}));
	}

	private convertToRules(pickedItems: NormalizationRuleQuickPickItem[]) {
		return pickedItems.map(pickedItem => pickedItem.ruleIndex);
	}
}
