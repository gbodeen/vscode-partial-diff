import NormalizationRuleStore from './normalization-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import { makeUriString } from './utils/text-resource';
import CommandAdaptor from './adaptors/command';
import DiffTitleBuilder from './diff-title-builder';
import WorkspaceAdaptor from './adaptors/workspace';
import EditableDiffSessionManager from './editable-diff-session-manager';

export default class DiffPresenter {
	private readonly diffTitleBuilder: DiffTitleBuilder;

	constructor(
		private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly normalizationRuleStore: NormalizationRuleStore,
		private readonly workspaceAdaptor: WorkspaceAdaptor,
		private readonly commandAdaptor: CommandAdaptor,
		private readonly editableDiffSessionManager: EditableDiffSessionManager,
		private readonly getCurrentDate: () => Date) {
		this.diffTitleBuilder = new DiffTitleBuilder(normalizationRuleStore, selectionInfoRegistry);
	}

	async takeDiff(textKey1: string, textKey2: string): Promise<unknown> {
		const editableDiffsEnabled = this.workspaceAdaptor.get<boolean>('enableEditableDiffs');
		if (editableDiffsEnabled) {
			if (!this.normalizationRuleStore.hasActiveRules) {
				const left = this.selectionInfoRegistry.get(textKey1);
				const right = this.selectionInfoRegistry.get(textKey2);
				if (!(left.lineRanges.length > 1 || right.lineRanges.length > 1)) {
					const title = this.diffTitleBuilder.build(textKey1, textKey2, false);
					return this.editableDiffSessionManager.openDiff(textKey1, textKey2, title);
				}
			}
		}
		const getUri = (textKey: string) => makeUriString(textKey, this.getCurrentDate());
		const title = this.diffTitleBuilder.build(textKey1, textKey2, true);
		return this.commandAdaptor.executeCommand('vscode.diff', getUri(textKey1), getUri(textKey2), title);
	}
}
