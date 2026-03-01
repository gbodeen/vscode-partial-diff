import DiffPresenter from '../../lib/diff-presenter';
import { mock, mockType, verify } from '../helpers';
import SelectionInfoRegistry from '../../lib/selection-info-registry';
import NormalizationRuleStore from '../../lib/normalization-rule-store';
import CommandAdaptor from '../../lib/adaptors/command';
import WorkspaceAdaptor from '../../lib/adaptors/workspace';
import EditableDiffSessionManager from '../../lib/editable-diff-session-manager';
import { when } from '../helpers';

suite('DiffPresenter', () => {
	function createSelectionInfoRegistry(lineRanges1: { start: number; end: number }[] = [], lineRanges2: { start: number; end: number }[] = []) {
		const selectionInfoRegistry = new SelectionInfoRegistry();
		selectionInfoRegistry.set('TEXT1', { text: 'SELECTED_TEXT1', fileName: 'FILE1', lineRanges: lineRanges1 });
		selectionInfoRegistry.set('TEXT2', { text: 'SELECTED_TEXT2', fileName: 'FILE2', lineRanges: lineRanges2 });
		return selectionInfoRegistry;
	}

	test('it passes URI of 2 texts to compare', async () => {
		const commandAdaptor = mock(CommandAdaptor);
		const selectionInfoRegistry = createSelectionInfoRegistry();

		const diffPresenter = new DiffPresenter(
			selectionInfoRegistry,
			mock(NormalizationRuleStore),
			mockType<WorkspaceAdaptor>({ get: <T>() => false as T }),
			commandAdaptor,
			mock(EditableDiffSessionManager),
			() => new Date('2016-06-15T11:43:00Z')
		);

		await diffPresenter.takeDiff('TEXT1', 'TEXT2');

		verify(commandAdaptor.executeCommand(
			'vscode.diff',
			'partialdiff:text/TEXT1?_ts=1465990980000',
			'partialdiff:text/TEXT2?_ts=1465990980000',
			'FILE1 \u2194 FILE2'
		));
	});

	test('it opens editable diff when in-place edits are enabled', async () => {
		const commandAdaptor = mock(CommandAdaptor);
		const editableSessionManager = mock(EditableDiffSessionManager);
		const workspaceAdaptor = mock(WorkspaceAdaptor);
		const selectionInfoRegistry = createSelectionInfoRegistry();
		when(workspaceAdaptor.get('enableEditableDiffs')).thenReturn(true);

		const diffPresenter = new DiffPresenter(
			selectionInfoRegistry,
			mockType<NormalizationRuleStore>({ hasActiveRules: false }),
			workspaceAdaptor,
			commandAdaptor,
			editableSessionManager,
			() => new Date('2016-06-15T11:43:00Z')
		);

		await diffPresenter.takeDiff('TEXT1', 'TEXT2');

		verify(editableSessionManager.openDiff('TEXT1', 'TEXT2', 'FILE1 ↔ FILE2'));
	});

	test('it falls back to read-only diff when normalization rules are active', async () => {
		const commandAdaptor = mock(CommandAdaptor);
		const editableSessionManager = mock(EditableDiffSessionManager);
		const workspaceAdaptor = mock(WorkspaceAdaptor);
		const selectionInfoRegistry = createSelectionInfoRegistry();
		when(workspaceAdaptor.get('enableEditableDiffs')).thenReturn(true);

		const diffPresenter = new DiffPresenter(
			selectionInfoRegistry,
			mockType<NormalizationRuleStore>({ hasActiveRules: true }),
			workspaceAdaptor,
			commandAdaptor,
			editableSessionManager,
			() => new Date('2016-06-15T11:43:00Z')
		);

		await diffPresenter.takeDiff('TEXT1', 'TEXT2');

		verify(editableSessionManager.openDiff('TEXT1', 'TEXT2', 'FILE1 ↔ FILE2'), { times: 0 });
		verify(commandAdaptor.executeCommand(
			'vscode.diff',
			'partialdiff:text/TEXT1?_ts=1465990980000',
			'partialdiff:text/TEXT2?_ts=1465990980000',
			'FILE1 ~ FILE2'
		));
	});

	test('it falls back to read-only diff for multi-selection even if editable mode is enabled', async () => {
		const commandAdaptor = mock(CommandAdaptor);
		const editableSessionManager = mock(EditableDiffSessionManager);
		const workspaceAdaptor = mock(WorkspaceAdaptor);
		const selectionInfoRegistry = createSelectionInfoRegistry([{ start: 1, end: 1 }, { start: 3, end: 3 }], []);
		when(workspaceAdaptor.get('enableEditableDiffs')).thenReturn(true);

		const diffPresenter = new DiffPresenter(
			selectionInfoRegistry,
			mockType<NormalizationRuleStore>({ hasActiveRules: false }),
			workspaceAdaptor,
			commandAdaptor,
			editableSessionManager,
			() => new Date('2016-06-15T11:43:00Z')
		);

		await diffPresenter.takeDiff('TEXT1', 'TEXT2');

		verify(editableSessionManager.openDiff('TEXT1', 'TEXT2', 'FILE1 ↔ FILE2'), { times: 0 });
		verify(commandAdaptor.executeCommand(
			'vscode.diff',
			'partialdiff:text/TEXT1?_ts=1465990980000',
			'partialdiff:text/TEXT2?_ts=1465990980000',
			'FILE1 (l.2,l.4) ↔ FILE2'
		));
	});
});
