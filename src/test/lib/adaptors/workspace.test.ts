import WorkspaceAdaptor from '../../../lib/adaptors/workspace';
import { mockMethods, when } from '../../helpers';
import * as assert from 'assert';
import type { WorkspaceConfiguration } from 'vscode';

suite('WorkspaceAdaptor', () => {
	test('it reads text normalization rules from vscode.workspace', () => {
		const extensionConfig = mockMethods<WorkspaceConfiguration>(['get']);
		when(extensionConfig.get('preComparisonTextNormalizationRules')).thenReturn(
			'RULES'
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const workspace = mockMethods<any>(['getConfiguration']);
		when(workspace.getConfiguration('partialDiff')).thenReturn(extensionConfig);

		const workspaceAdaptor = new WorkspaceAdaptor(workspace);
		assert.deepEqual(workspaceAdaptor.get('preComparisonTextNormalizationRules'), 'RULES');
	});
});
