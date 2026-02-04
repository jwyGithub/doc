export interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export type DialogType =
	| 'aiConfig'
	| 'aiChat'
	| 'users'
	| 'settings'
	| 'shares'
	| 'blobManager';
