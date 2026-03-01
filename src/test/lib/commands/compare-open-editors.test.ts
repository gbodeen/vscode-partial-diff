import { mock, mockMethods, mockType, verify, when } from '../../helpers';
import SelectionInfoRegistry from '../../../lib/selection-info-registry';
import WindowAdaptor, { OpenTextEditorInfo } from '../../../lib/adaptors/window';
import CommandFactory from '../../../lib/command-factory';
import CommandAdaptor from '../../../lib/adaptors/command';
import NormalizationRuleStore from '../../../lib/normalization-rule-store';
import OpenEditorSnapshotStore from '../../../lib/open-editor-snapshot-store';
import * as assert from 'assert';
import * as vscode from 'vscode';
import WorkspaceAdaptor from '../../../lib/adaptors/workspace';
import EditableDiffSessionManager from '../../../lib/editable-diff-session-manager';

suite('CompareOpenEditorsCommand', () => {

	test('it compares 2 open editors', async () => {
		const openInfos: OpenTextEditorInfo[] = [
			{ uri: 'file:///1', text: 'OPEN_TEXT_1', fileName: 'OPEN_FILE1' },
			{ uri: 'file:///2', text: 'OPEN_TEXT_2', fileName: 'OPEN_FILE2' }
		];
		const { command, deps } = createCommand(openInfos);
		await command.execute();

		assert.deepEqual(deps.selectionInfoRegistry.get('open1'), {
			text: 'OPEN_TEXT_1',
			fileName: 'OPEN_FILE1',
			lineRanges: [],
			sourceUri: 'file:///1',
			targetKind: 'document'
		});
		assert.deepEqual(deps.selectionInfoRegistry.get('open2'), {
			text: 'OPEN_TEXT_2',
			fileName: 'OPEN_FILE2',
			lineRanges: [],
			sourceUri: 'file:///2',
			targetKind: 'document'
		});
		verify(deps.commandAdaptor.executeCommand(
			'vscode.diff',
			'partialdiff:text/open1?_ts=1465990980000',
			'partialdiff:text/open2?_ts=1465990980000',
			'OPEN_FILE1 ↔ OPEN_FILE2'
		));
	});

	test('it tells you that it needs 2 open editors', async () => {
		const { command, deps } = createCommand([
			{ uri: 'file:///1', text: 'ONLY_ONE', fileName: 'ONLY_FILE' }
		]);
		await command.execute();

		verify(deps.windowAdaptor.showInformationMessage('Please first open exactly 2 documents to compare.'));
	});

	test('it uses cached snapshots when present', async () => {
		const openInfos: OpenTextEditorInfo[] = [
			{ uri: 'file:///1', text: 'OPEN_TEXT_1', fileName: 'OPEN_FILE1' },
			{ uri: 'file:///2', text: 'OPEN_TEXT_2', fileName: 'OPEN_FILE2' }
		];
		const snapshotStore = new OpenEditorSnapshotStore();
		snapshotStore.set('file:///2', { text: 'SELECTED_TEXT_2', fileName: 'OPEN_FILE2', lineRanges: [{ start: 3, end: 5 }] });
		const { command, deps } = createCommand(openInfos, snapshotStore);
		await command.execute();

		assert.deepEqual(deps.selectionInfoRegistry.get('open1'), {
			text: 'OPEN_TEXT_1',
			fileName: 'OPEN_FILE1',
			lineRanges: [],
			sourceUri: 'file:///1',
			targetKind: 'document'
		});
		assert.deepEqual(deps.selectionInfoRegistry.get('open2'), { text: 'SELECTED_TEXT_2', fileName: 'OPEN_FILE2', lineRanges: [{ start: 3, end: 5 }] });
	});

	function createCommand(openEditorInfos: OpenTextEditorInfo[], snapshotStore = new OpenEditorSnapshotStore()) {
		const dependencies = {
			windowAdaptor: mockMethods<WindowAdaptor>(['showInformationMessage', 'getOpenTextEditorInfos'], {}),
			selectionInfoRegistry: new SelectionInfoRegistry(),
			commandAdaptor: mock(CommandAdaptor)
		};
		when(dependencies.windowAdaptor.getOpenTextEditorInfos()).thenResolve(openEditorInfos);
		const commandFactory = new CommandFactory(
			dependencies.selectionInfoRegistry,
			mock(NormalizationRuleStore),
			mockType<WorkspaceAdaptor>({ get: <T>() => false as T }),
			dependencies.commandAdaptor,
			dependencies.windowAdaptor,
			mock(EditableDiffSessionManager),
			snapshotStore,
			mockType<typeof vscode.env.clipboard>(),
			() => new Date('2016-06-15T11:43:00Z')
		);
		return {
			command: commandFactory.createCompareOpenEditorsCommand(),
			deps: dependencies
		};
	}
});
