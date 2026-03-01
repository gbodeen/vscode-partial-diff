import SelectionInfoRegistry from '../selection-info-registry';
import { TextKey } from '../const';
import { Command } from './command';
import TextEditor from '../adaptors/text-editor';
import { SelectionInfo } from '../types/selection-info';

export default class SetSelectionCommand implements Command {
	constructor(private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly onSaved: () => void) { }

	execute(editor: TextEditor) {
		const textInfo: SelectionInfo = {
			text: editor.selectedText,
			fileName: editor.fileName,
			lineRanges: editor.selectedLineRanges,
			sourceUri: editor.uri,
			targetKind: editor.selectedLineRanges.length === 0 ? 'document' : 'selection',
			selectionRange: editor.singleSelectionRange
		};
		this.selectionInfoRegistry.set(TextKey.REGISTER1, textInfo);
		this.onSaved();
	}

}
