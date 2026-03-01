import DiffPresenter from '../diff-presenter';
import SelectionInfoRegistry from '../selection-info-registry';
import { TextKey } from '../const';
import { Command } from './command';
import WindowAdaptor from '../adaptors/window';

export default class CompareOpenEditorsCommand implements Command {
	constructor(private readonly diffPresenter: DiffPresenter,
		private readonly selectionInfoRegistry: SelectionInfoRegistry,
		private readonly windowAdaptor: WindowAdaptor) { }

	async execute() {
		const openEditorInfos = await this.windowAdaptor.getOpenEditorInfos();
		if (openEditorInfos.length !== 2) {
			this.windowAdaptor.showInformationMessage('Please first open exactly 2 documents to compare.');
			return;
		}
		this.selectionInfoRegistry.set(TextKey.OPEN_EDITOR1, openEditorInfos[0]);
		this.selectionInfoRegistry.set(TextKey.OPEN_EDITOR2, openEditorInfos[1]);

		await 'HACK'; // HACK: Avoid "TextEditor has been disposed" error
		await this.diffPresenter.takeDiff(TextKey.OPEN_EDITOR1, TextKey.OPEN_EDITOR2);
	}

}
