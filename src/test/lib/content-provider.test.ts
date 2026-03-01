import ContentProvider from '../../lib/content-provider';
import * as assert from 'assert';
import { mockType } from '../helpers';
import NormalizationRuleStore from '../../lib/normalization-rule-store';
import * as vscode from 'vscode';
import SelectionInfoRegistry from '../../lib/selection-info-registry';

suite('ContentProvider', () => {

	const selectionInfoRegistry = new SelectionInfoRegistry();
	selectionInfoRegistry.set('key1', {
		text: 'TEXT_1',
		fileName: 'FILE_1',
		lineRanges: []
	});

	suite('When normalization rules are given', () => {
		const normalizationRuleStore = mockType<NormalizationRuleStore>({
			activeRules: [{ match: '_', replaceWith: ':', active: true }]
		});
		const contentProvider = new ContentProvider(selectionInfoRegistry, normalizationRuleStore);

		test('it extracts text key from the given uri and uses it to retrieve text', () => {
			const uri = mockType<vscode.Uri>({ path: 'text/key1' });
			assert.deepEqual(contentProvider.provideTextDocumentContent(uri), 'TEXT:1');
		});

		test('it returns an empty string if a text is not yet selected', () => {
			const uri = mockType<vscode.Uri>({ path: 'text/keyNotExist' });
			assert.deepEqual(contentProvider.provideTextDocumentContent(uri), '');
		});
	});

	suite('When normalization rules are NOT given', () => {
		const normalizationRuleStore = mockType<NormalizationRuleStore>({ activeRules: [] });
		const contentProvider = new ContentProvider(selectionInfoRegistry, normalizationRuleStore);

		test('it returns the registered text as is', () => {
			const uri = mockType<vscode.Uri>({ path: 'text/key1' });
			assert.deepEqual(contentProvider.provideTextDocumentContent(uri), 'TEXT_1');
		});
	});
});
