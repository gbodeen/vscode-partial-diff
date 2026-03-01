import * as assert from 'assert';
import * as vscode from 'vscode';
import { any, mockMethods, verify, when } from '../helpers';
import WorkspaceAdaptor from '../../lib/adaptors/workspace';
import WindowAdaptor from '../../lib/adaptors/window';
import ApplyBackService from '../../lib/apply-back-service';
import { DiffSession } from '../../lib/types/diff-session';

suite('ApplyBackService', () => {
	function wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function makeUri(raw: string): vscode.Uri {
		return { toString: () => raw } as unknown as vscode.Uri;
	}

	function makeWindowAdaptor(): WindowAdaptor {
		return mockMethods<WindowAdaptor>(['showWarningMessage', 'setSelectionInVisibleEditor']);
	}

	test('it applies edited temp text back to a selection target', async () => {
		let sourceTextAtRange = 'ORIGINAL';
		const tempUri = makeUri('untitled:left');
		const sourceUri = makeUri('file:///source');
		const tempDoc = {
			uri: tempUri,
			getText: () => 'UPDATED'
		} as unknown as vscode.TextDocument;
		const sourceDoc = {
			uri: sourceUri,
			getText: () => sourceTextAtRange,
			positionAt: (offset: number) => new vscode.Position(0, offset),
			offsetAt: (pos: vscode.Position) => pos.character
		} as unknown as vscode.TextDocument;
		const workspaceAdaptor = mockMethods<WorkspaceAdaptor>(['openTextDocument', 'applyEdit']);
		when(workspaceAdaptor.openTextDocument(any())).thenDo(
			(arg: unknown) => {
				if ((arg as vscode.Uri).toString && (arg as vscode.Uri).toString() === tempUri.toString()) {
					return tempDoc;
				}
				return sourceDoc;
			}
		);
		when(workspaceAdaptor.applyEdit(any())).thenDo(
			() => {
				sourceTextAtRange = 'UPDATED';
				return true;
			}
		);
		const windowAdaptor = makeWindowAdaptor();
		const service = new ApplyBackService(workspaceAdaptor, windowAdaptor, 1);
		const session: DiffSession = {
			id: '1',
			title: 'title',
			left: {
				textKey: 'left',
				tempUri,
				originalText: 'ORIGINAL',
				conflictNotified: false,
				selectionInfo: {
					text: 'ORIGINAL',
					fileName: 'a.ts',
					lineRanges: [{ start: 1, end: 1 }],
					sourceUri: sourceUri.toString(),
					targetKind: 'selection',
					selectionRange: { startLine: 1, startChar: 0, endLine: 1, endChar: 8 }
				}
			},
			right: {
				textKey: 'right',
				tempUri: makeUri('untitled:right'),
				originalText: '',
				conflictNotified: false,
				selectionInfo: { text: '', fileName: '', lineRanges: [], targetKind: 'clipboard' }
			}
		};

		service.scheduleApply(session, session.left);
		await wait(10);

		assert.equal(session.left.originalText, 'UPDATED');
	});

	test('it updates selectionRange after successful apply', async () => {
		const tempUri = makeUri('untitled:left');
		const sourceUri = makeUri('file:///source');
		const tempDoc = {
			uri: tempUri,
			getText: () => 'LONGER_UPDATED_TEXT'
		} as unknown as vscode.TextDocument;
		const sourceDoc = {
			uri: sourceUri,
			getText: () => 'ORIGINAL',
			positionAt: (offset: number) => new vscode.Position(1, offset - 10),
			offsetAt: (pos: vscode.Position) => pos.line * 10 + pos.character
		} as unknown as vscode.TextDocument;
		const workspaceAdaptor = mockMethods<WorkspaceAdaptor>(['openTextDocument', 'applyEdit']);
		when(workspaceAdaptor.openTextDocument(any())).thenDo(
			(arg: unknown) => ((arg as vscode.Uri).toString() === tempUri.toString() ? tempDoc : sourceDoc)
		);
		when(workspaceAdaptor.applyEdit(any())).thenDo(() => true);
		const windowAdaptor = makeWindowAdaptor();
		const service = new ApplyBackService(workspaceAdaptor, windowAdaptor, 1);
		const session: DiffSession = {
			id: '1',
			title: 'title',
			left: {
				textKey: 'left',
				tempUri,
				originalText: 'ORIGINAL',
				conflictNotified: false,
				selectionInfo: {
					text: 'ORIGINAL',
					fileName: 'a.ts',
					lineRanges: [{ start: 1, end: 1 }],
					sourceUri: sourceUri.toString(),
					targetKind: 'selection',
					selectionRange: { startLine: 1, startChar: 0, endLine: 1, endChar: 8 }
				}
			},
			right: {
				textKey: 'right',
				tempUri: makeUri('untitled:right'),
				originalText: '',
				conflictNotified: false,
				selectionInfo: { text: '', fileName: '', lineRanges: [], targetKind: 'clipboard' }
			}
		};

		service.scheduleApply(session, session.left);
		await wait(10);

		const range = session.left.selectionInfo.selectionRange!;
		assert.equal(range.startLine, 1);
		assert.equal(range.startChar, 0);
		assert.equal(range.endLine, 1);
		assert.equal(range.endChar, 19);
		verify(windowAdaptor.setSelectionInVisibleEditor(sourceUri, {
			startLine: 1,
			startChar: 0,
			endLine: 1,
			endChar: 19
		}), { times: 1 });
	});

	test('it blocks apply and warns once when source changed', async () => {
		const tempUri = makeUri('untitled:left');
		const sourceUri = makeUri('file:///source');
		const tempDoc = { uri: tempUri, getText: () => 'UPDATED' } as unknown as vscode.TextDocument;
		const sourceDoc = {
			uri: sourceUri,
			getText: () => 'DIFFERENT',
			positionAt: () => new vscode.Position(0, 0)
		} as unknown as vscode.TextDocument;
		const workspaceAdaptor = mockMethods<WorkspaceAdaptor>(['openTextDocument', 'applyEdit']);
		when(workspaceAdaptor.openTextDocument(any())).thenDo(
			(arg: unknown) => ((arg as vscode.Uri).toString() === tempUri.toString() ? tempDoc : sourceDoc)
		);
		const windowAdaptor = makeWindowAdaptor();
		const service = new ApplyBackService(workspaceAdaptor, windowAdaptor, 1);
		const session: DiffSession = {
			id: '1',
			title: 'title',
			left: {
				textKey: 'left',
				tempUri,
				originalText: 'ORIGINAL',
				conflictNotified: false,
				selectionInfo: {
					text: 'ORIGINAL',
					fileName: 'a.ts',
					lineRanges: [{ start: 0, end: 0 }],
					sourceUri: sourceUri.toString(),
					targetKind: 'selection',
					selectionRange: { startLine: 0, startChar: 0, endLine: 0, endChar: 8 }
				}
			},
			right: {
				textKey: 'right',
				tempUri: makeUri('untitled:right'),
				originalText: '',
				conflictNotified: false,
				selectionInfo: { text: '', fileName: '', lineRanges: [], targetKind: 'clipboard' }
			}
		};

		service.scheduleApply(session, session.left);
		await wait(10);
		service.scheduleApply(session, session.left);
		await wait(10);

		assert.equal(session.left.originalText, 'ORIGINAL');
		verify(windowAdaptor.showWarningMessage('Apply-back blocked: source changed since diff opened.', 'Force Apply'), { times: 1 });
		verify(workspaceAdaptor.applyEdit(any()), { times: 0 });
	});

	test('it force-applies when user chooses Force Apply', async () => {
		let sourceTextAtRange = 'DIFFERENT';
		const tempUri = makeUri('untitled:left');
		const sourceUri = makeUri('file:///source');
		const tempDoc = { uri: tempUri, getText: () => 'UPDATED' } as unknown as vscode.TextDocument;
		const sourceDoc = {
			uri: sourceUri,
			getText: () => sourceTextAtRange,
			positionAt: (offset: number) => new vscode.Position(0, offset),
			offsetAt: (pos: vscode.Position) => pos.character
		} as unknown as vscode.TextDocument;
		const workspaceAdaptor = mockMethods<WorkspaceAdaptor>(['openTextDocument', 'applyEdit']);
		when(workspaceAdaptor.openTextDocument(any())).thenDo(
			(arg: unknown) => ((arg as vscode.Uri).toString() === tempUri.toString() ? tempDoc : sourceDoc)
		);
		let applyEditCallCount = 0;
		(workspaceAdaptor.applyEdit as unknown as (_edit: vscode.WorkspaceEdit) => Promise<boolean>) = async () => {
			applyEditCallCount += 1;
			sourceTextAtRange = 'UPDATED';
			return true;
		};
		const windowAdaptor = makeWindowAdaptor();
		when(windowAdaptor.showWarningMessage(any(), any())).thenDo(() => 'Force Apply');
		const service = new ApplyBackService(workspaceAdaptor, windowAdaptor, 1);
		const session: DiffSession = {
			id: '1',
			title: 'title',
			left: {
				textKey: 'left',
				tempUri,
				originalText: 'ORIGINAL',
				conflictNotified: false,
				selectionInfo: {
					text: 'ORIGINAL',
					fileName: 'a.ts',
					lineRanges: [{ start: 0, end: 0 }],
					sourceUri: sourceUri.toString(),
					targetKind: 'selection',
					selectionRange: { startLine: 0, startChar: 0, endLine: 0, endChar: 8 }
				}
			},
			right: {
				textKey: 'right',
				tempUri: makeUri('untitled:right'),
				originalText: '',
				conflictNotified: false,
				selectionInfo: { text: '', fileName: '', lineRanges: [], targetKind: 'clipboard' }
			}
		};

		service.scheduleApply(session, session.left);
		await wait(10);

		assert.equal(session.left.originalText, 'UPDATED');
		assert.equal(applyEditCallCount, 1);
	});

	test('it catches apply-back errors from debounce callback', async () => {
		const tempUri = makeUri('untitled:left');
		const sourceUri = makeUri('file:///source');
		const workspaceAdaptor = mockMethods<WorkspaceAdaptor>(['openTextDocument', 'applyEdit']);
		when(workspaceAdaptor.openTextDocument(any())).thenDo(() => {
			throw new Error('open failed');
		});
		const windowAdaptor = makeWindowAdaptor();
		const service = new ApplyBackService(workspaceAdaptor, windowAdaptor, 1);
		const session: DiffSession = {
			id: '1',
			title: 'title',
			left: {
				textKey: 'left',
				tempUri,
				originalText: 'ORIGINAL',
				conflictNotified: false,
				selectionInfo: {
					text: 'ORIGINAL',
					fileName: 'a.ts',
					lineRanges: [{ start: 0, end: 0 }],
					sourceUri: sourceUri.toString(),
					targetKind: 'selection',
					selectionRange: { startLine: 0, startChar: 0, endLine: 0, endChar: 8 }
				}
			},
			right: {
				textKey: 'right',
				tempUri: makeUri('untitled:right'),
				originalText: '',
				conflictNotified: false,
				selectionInfo: { text: '', fileName: '', lineRanges: [], targetKind: 'clipboard' }
			}
		};

		const originalConsoleError = console.error;
		const loggedErrors: unknown[][] = [];
		console.error = (...args: unknown[]) => {
			loggedErrors.push(args);
		};
		try {
			service.scheduleApply(session, session.left);
			await wait(10);
		} finally {
			console.error = originalConsoleError;
		}

		assert.equal(loggedErrors.length, 1);
		assert.equal(loggedErrors[0][0], 'Failed to apply editable diff changes back to source document.');
	});
});
