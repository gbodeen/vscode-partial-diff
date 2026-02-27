import { Command } from './commands/command';
import { Logger } from './types/logger';
import * as vscode from 'vscode';
import TextEditor from './adaptors/text-editor';

export default class CommandWrapper {
	constructor(private readonly command: Command,
		private readonly logger: Logger) {
		this.command = command;
		this.logger = logger;
	}

	async execute(editor?: vscode.TextEditor) {
		try {
			return await this.command.execute(editor && new TextEditor(editor));
		} catch (e) {
			this.handleError(e);
		}
	}

	private handleError(e: unknown) {
		if (e instanceof Error) {
			this.logger.error(e.stack || e.message);
			return;
		}

		this.logger.error(String(e));
	}
}
