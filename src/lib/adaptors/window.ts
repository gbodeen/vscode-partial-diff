import * as vscode from 'vscode';
import {QuickPickItem} from 'vscode';

export default class WindowAdaptor {
    constructor(private readonly window: typeof vscode.window) {}

    async showQuickPick<T extends QuickPickItem>(items: T[]): Promise<T[] | undefined> {
        // @ts-ignore
        return this.window.showQuickPick(items, {canPickMany: true});
    }

    async showInformationMessage(message: string): Promise<string | undefined> {
        return this.window.showInformationMessage(message);
    }
}
