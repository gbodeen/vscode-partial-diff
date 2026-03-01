import { mock, mockMethods, mockType, verify, when } from '../../helpers';
import SelectionInfoRegistry from '../../../lib/selection-info-registry';
import WindowAdaptor from '../../../lib/adaptors/window';
import CommandFactory from '../../../lib/command-factory';
import CommandAdaptor from '../../../lib/adaptors/command';
import NormalizationRuleStore from '../../../lib/normalization-rule-store';
import { SelectionInfo } from '../../../lib/types/selection-info';
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('CompareOpenEditorsCommand', () => {

	test('it compares 2 open editors', async () => {
		const openInfos: SelectionInfo[] = [
			{ text: 'OPEN_TEXT_1', fileName: 'OPEN_FILE1', lineRanges: [] },
			{ text: 'OPEN_TEXT_2', fileName: 'OPEN_FILE2', lineRanges: [] }
		];
		const { command, deps } = createCommand(openInfos);
		await command.execute();

		assert.deepEqual(deps.selectionInfoRegistry.get('open1'), openInfos[0]);
		assert.deepEqual(deps.selectionInfoRegistry.get('open2'), openInfos[1]);
		verify(deps.commandAdaptor.executeCommand(
			'vscode.diff',
			'partialdiff:text/open1?_ts=1465990980000',
			'partialdiff:text/open2?_ts=1465990980000',
			'OPEN_FILE1 ↔ OPEN_FILE2'
		));
	});

	test('it tells you that it needs 2 open editors', async () => {
		const { command, deps } = createCommand([
			{ text: 'ONLY_ONE', fileName: 'ONLY_FILE', lineRanges: [] }
		]);
		await command.execute();

		verify(deps.windowAdaptor.showInformationMessage('Please first open exactly 2 documents to compare.'));
	});

	function createCommand(openEditorInfos: SelectionInfo[]) {
		const dependencies = {
			windowAdaptor: mockMethods<WindowAdaptor>(['showInformationMessage', 'getOpenEditorInfos'], {}),
			selectionInfoRegistry: new SelectionInfoRegistry(),
			commandAdaptor: mock(CommandAdaptor)
		};
		when(dependencies.windowAdaptor.getOpenEditorInfos()).thenResolve(openEditorInfos);
		const commandFactory = new CommandFactory(
			dependencies.selectionInfoRegistry,
			mock(NormalizationRuleStore),
			dependencies.commandAdaptor,
			dependencies.windowAdaptor,
			mockType<typeof vscode.env.clipboard>(),
			() => new Date('2016-06-15T11:43:00Z')
		);
		return {
			command: commandFactory.createCompareOpenEditorsCommand(),
			deps: dependencies
		};
	}
});
