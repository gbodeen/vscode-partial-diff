import { SelectionInfo } from './types/selection-info';

export default class SelectionInfoRegistry {
	private readonly data: Record<string, SelectionInfo>;

	constructor() {
		this.data = Object.create(null);
	}

	set(key: string, textInfo: SelectionInfo): void {
		const normalized: SelectionInfo = {
			text: textInfo.text,
			fileName: textInfo.fileName,
			lineRanges: textInfo.lineRanges || []
		};
		if (textInfo.sourceUri) {
			normalized.sourceUri = textInfo.sourceUri;
		}
		if (textInfo.targetKind) {
			normalized.targetKind = textInfo.targetKind;
		}
		if (textInfo.selectionRange) {
			normalized.selectionRange = textInfo.selectionRange;
		}
		this.data[key] = normalized;
	}

	get(key: string): SelectionInfo {
		return this.data[key];
	}
}
