import { mock, mockType, verify, when, mockMethods } from '../../helpers';
import SelectionInfoRegistry from '../../../lib/selection-info-registry';
import TextEditor from '../../../lib/adaptors/text-editor';
import CommandFactory from '../../../lib/command-factory';
import WindowAdaptor from '../../../lib/adaptors/window';
import NormalizationRuleStore from '../../../lib/normalization-rule-store';
import CommandAdaptor from '../../../lib/adaptors/command';
import OpenEditorSnapshotStore from '../../../lib/open-editor-snapshot-store';
import * as assert from 'assert';
import * as vscode from 'vscode';
import WorkspaceAdaptor from '../../../lib/adaptors/workspace';
import EditableDiffSessionManager from '../../../lib/editable-diff-session-manager';

suite('CompareWithClipboardCommand', () => {

	const editor = mockType<TextEditor>({
		selectedText: 'SELECTED_TEXT',
		fileName: 'FILE2',
		uri: 'file:///2',
		selectedLineRanges: [{ start: 5, end: 10 }],
		singleSelectionRange: { startLine: 5, startChar: 0, endLine: 10, endChar: 1 }
	});
	const selectionInfoRegistry = new SelectionInfoRegistry();

	test('it compares selected text with clipboard text', async () => {
		const clipboard = mockMethods<typeof vscode.env.clipboard>(['readText']);
		when(clipboard.readText()).thenReturn(Promise.resolve('CLIPBOARD_TEXT'));

		const commandAdaptor = mock(CommandAdaptor);
		const windowAdaptor = mock(WindowAdaptor);
		const normalizationRuleStore = mock(NormalizationRuleStore);
		const commandFactory = new CommandFactory(
			selectionInfoRegistry,
			normalizationRuleStore,
			mockType<WorkspaceAdaptor>({ get: <T>() => false as T }),
			commandAdaptor,
			windowAdaptor,
			mock(EditableDiffSessionManager),
			new OpenEditorSnapshotStore(),
			clipboard,
			() => new Date('2016-06-15T11:43:00Z')
		);

		const command = commandFactory.createCompareWithClipboardCommand();

		await command.execute(editor);

		assert.deepEqual(selectionInfoRegistry.get('clipboard'), {
			text: 'CLIPBOARD_TEXT',
			fileName: 'Clipboard',
			lineRanges: [],
			targetKind: 'clipboard'
		});
		assert.deepEqual(selectionInfoRegistry.get('reg2'), {
			fileName: 'FILE2',
			lineRanges: [{ 'start': 5, 'end': 10 }],
			text: 'SELECTED_TEXT',
			sourceUri: 'file:///2',
			targetKind: 'selection',
			selectionRange: { startLine: 5, startChar: 0, endLine: 10, endChar: 1 }
		});
		verify(commandAdaptor.executeCommand(
			'vscode.diff',
			'partialdiff:text/clipboard?_ts=1465990980000',
			'partialdiff:text/reg2?_ts=1465990980000',
			'Clipboard ↔ FILE2 (ll.6-11)'
		));
	});
});
