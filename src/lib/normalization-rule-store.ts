import WorkspaceAdaptor from './adaptors/workspace';
import type { LoadedNormalizationRule, SavedNormalizationRule } from './types/normalization-rule';
import { isDeepStrictEqual as isEqual } from 'node:util';

const clone = (value: unknown) => JSON.parse(JSON.stringify(value));

export default class NormalizationRuleStore {
	private baseRules?: SavedNormalizationRule[];
	private rules?: LoadedNormalizationRule[];

	constructor(private readonly workspace: WorkspaceAdaptor) {
		this.setupRules(this.workspace.get<SavedNormalizationRule[]>('preComparisonTextNormalizationRules'));
	}

	private setupRules(rules: SavedNormalizationRule[]): void {
		this.baseRules = clone(rules);
		this.rules = this.resetRuleStatus(this.baseRules!);
	}

	private resetRuleStatus(rules: SavedNormalizationRule[]): LoadedNormalizationRule[] {
		return rules.map(rule => {
			const { enableOnStart, ...rest } = rule;
			return Object.assign({}, rest, {
				active: rule.enableOnStart !== false
			})
		});
	}

	getAllRules(): LoadedNormalizationRule[] {
		const newBaseRules = this.workspace.get<SavedNormalizationRule[]>('preComparisonTextNormalizationRules');
		if (!isEqual(newBaseRules, this.baseRules)) {
			this.setupRules(newBaseRules);
		}
		return this.rules!;
	}

	get activeRules(): LoadedNormalizationRule[] {
		return this.getAllRules().filter(rule => rule.active);
	}

	get hasActiveRules(): boolean {
		return this.activeRules.length > 0;
	}

	specifyActiveRules(ruleIndices: number[]): void {
		this.rules = this.rules!.map((rule, index) =>
			Object.assign({}, rule, { active: ruleIndices.includes(index) })
		);
	}
}
