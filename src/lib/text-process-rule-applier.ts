import NormalizationRuleStore from './normalization-rule-store';
import { LoadedNormalizationRule } from './types/normalization-rule';

export default class TextProcessRuleApplier {
	constructor(private readonly normalizationRuleStore: NormalizationRuleStore) { }

	applyTo(text: string): string {
		const rules = this.normalizationRuleStore.activeRules;
		return rules.length !== 0 ? this.applyRulesToText(rules, text) : text;
	}

	private applyRulesToText(rules: LoadedNormalizationRule[], text: string): string {
		return rules.reduce(
			(newText, rule) => this.applyRuleToText(rule, newText),
			text
		);
	}

	private applyRuleToText(rule: LoadedNormalizationRule, text: string): string {
		const pattern = new RegExp(rule.match, 'g');

		if (typeof rule.replaceWith === 'string') {
			return text.replace(pattern, rule.replaceWith);
		}

		const { letterCase } = rule.replaceWith;
		return text.replace(pattern, matched => {
			switch (letterCase) {
				case 'lower':
					return matched.toLowerCase();
				case 'upper':
					return matched.toUpperCase();
				default:
					return matched;
			}
		});
	}
}
