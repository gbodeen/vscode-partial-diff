import TextEditor from '../adaptors/text-editor';

export interface Command {
	execute(editor?: TextEditor): Promise<unknown> | unknown;
}