import TextProcessRuleApplier from './text-process-rule-applier';
import SelectionInfoRegistry from './selection-info-registry';
import { extractTextKey } from './utils/text-resource';
import NormalizationRuleStore from './normalization-rule-store';
import * as vscode from 'vscode';
import { TextDocumentContentProvider } from 'vscode';

export default class ContentProvider implements TextDocumentContentProvider {
	private readonly textProcessRuleApplier: TextProcessRuleApplier;

	constructor(private readonly selectionInfoRegistry: SelectionInfoRegistry,
		normalizationRuleStore: NormalizationRuleStore) {
		this.textProcessRuleApplier = new TextProcessRuleApplier(normalizationRuleStore);
	}

	provideTextDocumentContent(uri: vscode.Uri): string {
		const textKey = extractTextKey(uri);
		const registeredText = (
			this.selectionInfoRegistry.get(textKey) || { text: '' }
		).text;
		return this.textProcessRuleApplier.applyTo(registeredText);
	}
}
