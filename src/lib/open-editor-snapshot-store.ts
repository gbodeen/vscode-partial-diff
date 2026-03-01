import { SelectionInfo } from './types/selection-info';

export default class OpenEditorSnapshotStore {
	private readonly snapshots = new Map<string, SelectionInfo>();

	set(uri: string, snapshot: SelectionInfo): void {
		this.snapshots.set(uri, snapshot);
	}

	get(uri: string): SelectionInfo | undefined {
		return this.snapshots.get(uri);
	}

	prune(openUris: Set<string>): void {
		for (const uri of this.snapshots.keys()) {
			if (!openUris.has(uri)) {
				this.snapshots.delete(uri);
			}
		}
	}
}
