import * as assert from 'assert';
import * as vscode from 'vscode';
import EditableDiffSessionManager from '../../lib/editable-diff-session-manager';
import SelectionInfoRegistry from '../../lib/selection-info-registry';
import WorkspaceAdaptor from '../../lib/adaptors/workspace';
import CommandAdaptor from '../../lib/adaptors/command';
import ApplyBackService from '../../lib/apply-back-service';
import { EDITABLE_DIFF_SCHEME } from '../../lib/const';
import { any, mockMethods, verify, when } from '../helpers';

suite('EditableDiffSessionManager', () => {
	function wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function createSelectionInfoRegistry(): SelectionInfoRegistry {
		const selectionInfoRegistry = new SelectionInfoRegistry();
		selectionInfoRegistry.set('left', { text: 'LEFT', fileName: 'a.ts', lineRanges: [] });
		selectionInfoRegistry.set('right', { text: 'RIGHT', fileName: 'b.ts', lineRanges: [] });
		return selectionInfoRegistry;
	}

	function createWorkspaceAdaptor(
		writtenUris: vscode.Uri[],
		deletedUris: vscode.Uri[],
		listeners?: {
			onChange?: (event: vscode.TextDocumentChangeEvent) => void;
			onClose?: (doc: vscode.TextDocument) => void;
		}
	): WorkspaceAdaptor {
		const workspaceAdaptor = mockMethods<WorkspaceAdaptor>([
			'createDirectory',
			'writeFile',
			'deleteFile',
			'openTextDocument',
			'onDidChangeTextDocument',
			'onDidCloseTextDocument',
			'getConfigurationValue',
			'updateConfigurationValue'
		]);
		(workspaceAdaptor.createDirectory as unknown as (_uri: vscode.Uri) => Promise<void>) =
			async () => undefined;
		(workspaceAdaptor.writeFile as unknown as (uri: vscode.Uri, _content: Uint8Array) => Promise<void>) =
			async (uri: vscode.Uri) => {
				writtenUris.push(uri);
			};
		(workspaceAdaptor.deleteFile as unknown as (uri: vscode.Uri) => Promise<void>) =
			async (uri: vscode.Uri) => {
				deletedUris.push(uri);
			};
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			(listener: (event: vscode.TextDocumentChangeEvent) => void) => {
				if (listeners) {
					listeners.onChange = listener;
				}
				return { dispose() { } };
			};
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			(listener: (doc: vscode.TextDocument) => void) => {
				if (listeners) {
					listeners.onClose = listener;
				}
				return { dispose() { } };
			};
		return workspaceAdaptor;
	}

	test('it does not pre-open non-diff documents when launching editable diff', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (_listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (_listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => undefined;
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await manager.openDiff('left', 'right', 'TITLE');

		verify(workspaceAdaptor.openTextDocument(any()), { times: 0 });
	});

	test('it creates temp files and starts a diff', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		let changeListener: ((event: vscode.TextDocumentChangeEvent) => void) | undefined;
		let closeListener: ((doc: vscode.TextDocument) => void) | undefined;
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris, {
			onChange: changeListener,
			onClose: closeListener
		});
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			(listener: (event: vscode.TextDocumentChangeEvent) => void) => {
				changeListener = listener;
				return { dispose() { } };
			};
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			(listener: (doc: vscode.TextDocument) => void) => {
				closeListener = listener;
				return { dispose() { } };
			};
		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		let diffCallCount = 0;
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => {
				diffCallCount += 1;
			};
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await manager.openDiff('left', 'right', 'TITLE');

		assert.equal(writtenUris.length, 2);
		assert.equal(writtenUris[0].scheme, EDITABLE_DIFF_SCHEME);
		assert.equal(writtenUris[1].scheme, EDITABLE_DIFF_SCHEME);
		assert.equal(diffCallCount, 1);
		assert.ok(changeListener);
		assert.ok(closeListener);
		assert.equal(deletedUris.length, 0);
	});

	test('it disables editing on original side when left side is clipboard', async () => {
		const selectionInfoRegistry = new SelectionInfoRegistry();
		selectionInfoRegistry.set('left', {
			text: 'CLIP',
			fileName: 'Clipboard',
			lineRanges: [],
			targetKind: 'clipboard'
		});
		selectionInfoRegistry.set('right', {
			text: 'RIGHT',
			fileName: 'a.ts',
			lineRanges: [{ start: 0, end: 0 }],
			sourceUri: 'file:///a.ts',
			targetKind: 'selection',
			selectionRange: { startLine: 0, startChar: 0, endLine: 0, endChar: 5 }
		});
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (_listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (_listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			() => ({ dispose() { } });

		let capturedOptions: { originalEditable?: boolean } | undefined;
		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (
			_left: vscode.Uri,
			_right: vscode.Uri,
			_title: string,
			options?: { originalEditable?: boolean }
		) => Promise<void>) = async (_left: vscode.Uri, _right: vscode.Uri, _title: string, options?: { originalEditable?: boolean }) => {
			capturedOptions = options;
		};
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await manager.openDiff('left', 'right', 'TITLE');

		assert.deepEqual(capturedOptions, { originalEditable: false });
		const uriStrings = writtenUris.map(uri => uri.toString());
		assert.ok(uriStrings.some(uri => uri.includes('-left-') && uri.includes('-readonly.txt')));
		assert.ok(uriStrings.some(uri => uri.includes('-right-') && !uri.includes('-readonly.txt')));
	});

	test('it applies and restores diff layout settings for editable sessions', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		let closeListener: ((doc: vscode.TextDocument) => void) | undefined;
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (_listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			(listener: (doc: vscode.TextDocument) => void) => {
				closeListener = listener;
				return { dispose() { } };
			};
		when(workspaceAdaptor.getConfigurationValue('diffEditor.renderSideBySide')).thenReturn(false);
		when(workspaceAdaptor.getConfigurationValue('diffEditor.useInlineViewWhenSpaceIsLimited')).thenReturn(true);

		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => undefined;
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await manager.openDiff('left', 'right', 'TITLE');

		verify(workspaceAdaptor.updateConfigurationValue('diffEditor.renderSideBySide', true, any()), { times: 1 });
		verify(workspaceAdaptor.updateConfigurationValue('diffEditor.useInlineViewWhenSpaceIsLimited', false, any()), { times: 1 });

		closeListener!({ uri: writtenUris[0] } as vscode.TextDocument);
		await wait(10);

		verify(workspaceAdaptor.updateConfigurationValue('diffEditor.renderSideBySide', false, any()), { times: 1 });
		verify(workspaceAdaptor.updateConfigurationValue('diffEditor.useInlineViewWhenSpaceIsLimited', true, any()), { times: 1 });
	});

	test('it serializes layout override cleanup and next open to avoid capturing override values', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		let closeListener: ((doc: vscode.TextDocument) => void) | undefined;
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (_listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			(listener: (doc: vscode.TextDocument) => void) => {
				closeListener = listener;
				return { dispose() { } };
			};

		const settings = {
			renderSideBySide: false,
			useInlineViewWhenSpaceIsLimited: true
		};
		let allowRestore: (() => void) | undefined;
		let restoreGate: Promise<void> | undefined;
		let blockFirstRestore = true;
		(workspaceAdaptor.getConfigurationValue as unknown as (_section: string) => boolean | undefined) =
			(section: string) => {
				if (section === 'diffEditor.renderSideBySide') {
					return settings.renderSideBySide;
				}
				if (section === 'diffEditor.useInlineViewWhenSpaceIsLimited') {
					return settings.useInlineViewWhenSpaceIsLimited;
				}
				return undefined;
			};
		(workspaceAdaptor.updateConfigurationValue as unknown as (
			_section: string,
			_value: unknown,
			_target: vscode.ConfigurationTarget
		) => Promise<void>) = async (section: string, value: unknown) => {
			const isRestoreAttempt = (section === 'diffEditor.renderSideBySide' && value === false)
				|| (section === 'diffEditor.useInlineViewWhenSpaceIsLimited' && value === true);
			if (blockFirstRestore && isRestoreAttempt) {
				if (!restoreGate) {
					restoreGate = new Promise<void>(resolve => {
						allowRestore = resolve;
					});
				}
				await restoreGate;
			}
			if (section === 'diffEditor.renderSideBySide') {
				settings.renderSideBySide = value as boolean;
				return;
			}
			if (section === 'diffEditor.useInlineViewWhenSpaceIsLimited') {
				settings.useInlineViewWhenSpaceIsLimited = value as boolean;
			}
		};

		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => undefined;
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await manager.openDiff('left', 'right', 'TITLE1');
		assert.equal(settings.renderSideBySide, true);
		assert.equal(settings.useInlineViewWhenSpaceIsLimited, false);

		closeListener!({ uri: writtenUris[0] } as vscode.TextDocument);

		let secondOpenResolved = false;
		const secondOpen = manager.openDiff('left', 'right', 'TITLE2').then(() => {
			secondOpenResolved = true;
		});
		await wait(10);
		assert.equal(secondOpenResolved, false);
		assert.ok(allowRestore);

		blockFirstRestore = false;
		allowRestore!();
		await secondOpen;

		closeListener!({ uri: writtenUris[2] } as vscode.TextDocument);
		await wait(10);

		assert.equal(settings.renderSideBySide, false);
		assert.equal(settings.useInlineViewWhenSpaceIsLimited, true);
	});

	test('it routes temp document changes to apply-back and cleans up on close', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		let changeListener: ((event: vscode.TextDocumentChangeEvent) => void) | undefined;
		let closeListener: ((doc: vscode.TextDocument) => void) | undefined;
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			(listener: (event: vscode.TextDocumentChangeEvent) => void) => {
				changeListener = listener;
				return { dispose() { } };
			};
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			(listener: (doc: vscode.TextDocument) => void) => {
				closeListener = listener;
				return { dispose() { } };
			};

		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => undefined;
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);
		await manager.openDiff('left', 'right', 'TITLE');
		const onChange = changeListener!;
		const onClose = closeListener!;
		const leftDoc = { uri: writtenUris[0] } as vscode.TextDocument;

		onChange({ document: leftDoc } as vscode.TextDocumentChangeEvent);
		verify(applyBackService.scheduleApply(any(), any()), { times: 1 });

		onClose(leftDoc);
		verify(applyBackService.cancelSession(any()), { times: 1 });
		assert.equal(deletedUris.length, 2);
	});

	test('it generates unique session IDs in temp file names across rapid opens', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (_listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (_listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => undefined;
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);

		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await manager.openDiff('left', 'right', 'TITLE1');
		await manager.openDiff('left', 'right', 'TITLE2');

		assert.equal(writtenUris.length, 4);
		const uriStrings = writtenUris.map(uri => uri.toString());
		assert.ok(uriStrings.some(uri => uri.includes('session-0-left')));
		assert.ok(uriStrings.some(uri => uri.includes('session-0-right')));
		assert.ok(uriStrings.some(uri => uri.includes('session-1-left')));
		assert.ok(uriStrings.some(uri => uri.includes('session-1-right')));
	});

	test('it cleans up temp files if diff command fails', async () => {
		const selectionInfoRegistry = createSelectionInfoRegistry();
		const writtenUris: vscode.Uri[] = [];
		const deletedUris: vscode.Uri[] = [];
		const workspaceAdaptor = createWorkspaceAdaptor(writtenUris, deletedUris);
		(workspaceAdaptor.onDidChangeTextDocument as unknown as (_listener: (event: vscode.TextDocumentChangeEvent) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		(workspaceAdaptor.onDidCloseTextDocument as unknown as (_listener: (doc: vscode.TextDocument) => void) => vscode.Disposable) =
			() => ({ dispose() { } });
		const commandAdaptor = mockMethods<CommandAdaptor>(['executeDiffUris']);
		(commandAdaptor.executeDiffUris as unknown as (_left: vscode.Uri, _right: vscode.Uri, _title: string) => Promise<void>) =
			async () => {
				throw new Error('diff failed');
			};
		const applyBackService = mockMethods<ApplyBackService>(['scheduleApply', 'cancelSession']);
		const manager = new EditableDiffSessionManager(
			selectionInfoRegistry,
			workspaceAdaptor,
			commandAdaptor,
			applyBackService
		);

		await assert.rejects(
			manager.openDiff('left', 'right', 'TITLE'),
			(err: unknown) => (err as Error).message === 'diff failed'
		);
		assert.equal(writtenUris.length, 2);
		assert.equal(deletedUris.length, 2);
	});
});
