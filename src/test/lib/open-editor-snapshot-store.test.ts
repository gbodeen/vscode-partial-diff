import OpenEditorSnapshotStore from '../../lib/open-editor-snapshot-store';
import * as assert from 'assert';

suite('OpenEditorSnapshotStore', () => {
	test('it stores and returns snapshots by URI', () => {
		const store = new OpenEditorSnapshotStore();
		const snapshot = {
			text: 'SELECTED_TEXT',
			fileName: 'file.ts',
			lineRanges: [{ start: 1, end: 3 }]
		};
		store.set('file:///a.ts', snapshot);

		assert.deepEqual(store.get('file:///a.ts'), snapshot);
	});

	test('it prunes snapshots for closed editors', () => {
		const store = new OpenEditorSnapshotStore();
		store.set('file:///a.ts', { text: 'A', fileName: 'a.ts', lineRanges: [] });
		store.set('file:///b.ts', { text: 'B', fileName: 'b.ts', lineRanges: [] });

		store.prune(new Set(['file:///a.ts']));

		assert.equal(store.get('file:///a.ts')?.text, 'A');
		assert.equal(store.get('file:///b.ts'), undefined);
	});
});
