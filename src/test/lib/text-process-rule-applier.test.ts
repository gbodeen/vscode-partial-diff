import * as assert from 'assert';
import { mockType } from '../helpers';
import NormalizationRuleStore from '../../lib/normalization-rule-store';
import TextProcessRuleApplier from '../../lib/text-process-rule-applier';
import type { SavedNormalizationRule } from '../../lib/types/normalization-rule';

suite('Text process rule applications', () => {
	const text = 'TEXT_1';

	test('it uses a user defined rule to preprocess text to compare', () => {
		const activeRules = [{ match: '_', replaceWith: ':' }];
		const applier = createTextProcessRuleApplier(activeRules);
		assert.deepEqual(applier.applyTo(text), 'TEXT:1');
	});

	test('it replaces all occurence of specified pattern', () => {
		const activeRules = [{ match: 'T', replaceWith: 't' }];
		const applier = createTextProcessRuleApplier(activeRules);
		assert.deepEqual(applier.applyTo(text), 'tEXt_1');
	});

	test('it can use part of matched text as replace text', () => {
		const activeRules = [{ match: '(TE)(XT)', replaceWith: '$2$1' }];
		const applier = createTextProcessRuleApplier(activeRules);
		assert.deepEqual(applier.applyTo(text), 'XTTE_1');
	});

	test('it can change matched text to lower case', () => {
		const activeRules = [
			{
				match: 'TE',
				replaceWith: { letterCase: 'lower' } as const
			}
		];
		const applier = createTextProcessRuleApplier(activeRules);
		assert.deepEqual(applier.applyTo(text), 'teXT_1');
	});

	test('it can change all characters to upper case', () => {
		const activeRules = [
			{
				match: 'Register',
				replaceWith: { letterCase: 'upper' } as const
			}
		];
		const applier = createTextProcessRuleApplier(activeRules);
		assert.deepEqual(applier.applyTo('Registered Text'), 'REGISTERed Text');
	});

	test('it applies all given rules to preprocess text', () => {
		const activeRules = [
			{ match: '_', replaceWith: ':' },
			{ match: 'T', replaceWith: 't' }
		];
		const applier = createTextProcessRuleApplier(activeRules);
		assert.deepEqual(applier.applyTo(text), 'tEXt:1');
	});

	function createTextProcessRuleApplier(activeRules: SavedNormalizationRule[]) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const normalizationRuleStore = mockType<NormalizationRuleStore>({ activeRules: activeRules || [] } as any);
		return new TextProcessRuleApplier(normalizationRuleStore);
	}
});
