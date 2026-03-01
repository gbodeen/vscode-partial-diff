import DiffPresenter from '../diff-presenter';
import SelectionInfoRegistry from '../selection-info-registry';
import { TextKey } from '../const';
import { SelectionInfo } from '../types/selection-info';
import { Command } from './command';
import WindowAdaptor from '../adaptors/window';
import OpenEditorSnapshotStore from '../open-editor-snapshot-store';

export default class CompareOpenEditorsCommand implements Command {
	constructor(private readonly diffPresenter: DiffPresenter,
		private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly windowAdaptor: WindowAdaptor,
		private readonly openEditorSnapshotStore: OpenEditorSnapshotStore) { }

	async execute() {
		const openEditors = await this.windowAdaptor.getOpenTextEditorInfos();
		const openEditorInfos = openEditors.map(editor =>
			this.openEditorSnapshotStore.get(editor.uri) || this.toSelectionInfo(editor.text, editor.fileName)
		);
		if (openEditorInfos.length !== 2) {
			this.windowAdaptor.showInformationMessage('Please first open exactly 2 documents to compare.');
			return;
		}
		this.selectionInfoRegistry.set(TextKey.OPEN_EDITOR1, openEditorInfos[0]);
		this.selectionInfoRegistry.set(TextKey.OPEN_EDITOR2, openEditorInfos[1]);

		await 'HACK'; // HACK: Avoid "TextEditor has been disposed" error
		await this.diffPresenter.takeDiff(TextKey.OPEN_EDITOR1, TextKey.OPEN_EDITOR2);
	}

	private toSelectionInfo(text: string, fileName: string): SelectionInfo {
		return { text, fileName, lineRanges: [] };
	}
}
