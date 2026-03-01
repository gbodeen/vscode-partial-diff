
export type SavedNormalizationRule = {
	name?: string;
	match: string;
	replaceWith: string | { letterCase: 'upper' | 'lower' };
	enableOnStart?: boolean;
};

export interface LoadedNormalizationRule extends Exclude<SavedNormalizationRule, 'enableOnStart'> {
	active: boolean;
} 
