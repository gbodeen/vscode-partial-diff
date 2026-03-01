import BootstrapperFactory from './lib/bootstrapper-factory';
import type { ExtensionContext } from 'vscode';

const bootstrapperFactory = new BootstrapperFactory();

exports.activate = (context: ExtensionContext) => {
	const bootstrapper = bootstrapperFactory.create();
	bootstrapper.initiate(context);
}; 
