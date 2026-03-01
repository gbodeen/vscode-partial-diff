import DiffPresenter from '../../lib/diff-presenter';
import { mock, mockType, verify } from '../helpers';
import SelectionInfoRegistry from '../../lib/selection-info-registry';
import NormalizationRuleStore from '../../lib/normalization-rule-store';
import CommandAdaptor from '../../lib/adaptors/command';
import WorkspaceAdaptor from '../../lib/adaptors/workspace';
import WindowAdaptor from '../../lib/adaptors/window';
import EditableDiffSessionManager from '../../lib/editable-diff-session-manager';
import { when } from '../helpers';

suite('DiffPresenter', () => {
	const selectionInfoRegistry = new SelectionInfoRegistry();
	selectionInfoRegistry.set('TEXT1', { text: 'SELECTED_TEXT1', fileName: 'FILE1', lineRanges: [] });
	selectionInfoRegistry.set('TEXT2', { text: 'SELECTED_TEXT2', fileName: 'FILE2', lineRanges: [] });

	test('it passes URI of 2 texts to compare', async () => {
		const commandAdaptor = mock(CommandAdaptor);

		const diffPresenter = new DiffPresenter(
			selectionInfoRegistry,
			mock(NormalizationRuleStore),
			mockType<WorkspaceAdaptor>({ get: <T>() => false as T }),
			commandAdaptor,
			mock(WindowAdaptor),
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
		when(workspaceAdaptor.get('enableEditableDiffs')).thenReturn(true);

		const diffPresenter = new DiffPresenter(
			selectionInfoRegistry,
			mock(NormalizationRuleStore),
			workspaceAdaptor,
			commandAdaptor,
			mock(WindowAdaptor),
			editableSessionManager,
			() => new Date('2016-06-15T11:43:00Z')
		);

		await diffPresenter.takeDiff('TEXT1', 'TEXT2');

		verify(editableSessionManager.openDiff('TEXT1', 'TEXT2', 'FILE1 ↔ FILE2'));
	});
});
