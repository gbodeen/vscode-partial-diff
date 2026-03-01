import NormalizationRuleStore from './normalization-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import TextTitleBuilder from './text-title-builder';

const DiffModeSymbols = {
	NORMALIZED: '\u007e',
	AS_IS: '\u2194'
};

export default class DiffTitleBuilder {
	private textTitleBuilder: TextTitleBuilder;

	constructor(private readonly normalizationRuleStore: NormalizationRuleStore,
		private readonly selectionInfoRegistry: SelectionInfoRegistry) {
		this.textTitleBuilder = new TextTitleBuilder();
	}

	build(textKey1: string, textKey2: string): string {
		const title1 = this.buildTextTitle(textKey1);
		const title2 = this.buildTextTitle(textKey2);
		const comparisonSymbol = this.normalizationRuleStore.hasActiveRules
			? DiffModeSymbols.NORMALIZED
			: DiffModeSymbols.AS_IS;
		return `${title1} ${comparisonSymbol} ${title2}`;
	}

	private buildTextTitle(textKey: string): string {
		const textInfo = this.selectionInfoRegistry.get(textKey);
		return this.textTitleBuilder.build(textInfo);
	}
}
