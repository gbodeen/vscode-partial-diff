import SelectText1Command from '../../../lib/commands/save-text-1';
import {mockType} from '../../helpers';
import SelectionInfoRegistry from '../../../lib/selection-info-registry';
import TextEditor from '../../../lib/adaptors/text-editor';
import * as assert from 'assert';

suite('SelectText1Command', () => {

    const editor = mockType<TextEditor>({
        selectedText: 'SELECTED_TEXT',
        fileName: 'FILENAME',
        selectedLineRanges: [{start: 0, end: 1}]
    });
    const selectionInfoRegistry = new SelectionInfoRegistry();
    let onSavedCalled = false;
    const command = new SelectText1Command(selectionInfoRegistry, () => { onSavedCalled = true; });

    test('it saves selected text', () => {
        command.execute(editor);

        assert.deepEqual(selectionInfoRegistry.get('reg1'), {
            text: 'SELECTED_TEXT',
            fileName: 'FILENAME',
            lineRanges: [{start: 0, end: 1}]
        });
    });

    test('it calls onSaved callback', () => {
        assert.strictEqual(onSavedCalled, true);
    });
});
