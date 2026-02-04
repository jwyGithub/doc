import { useDialogStore } from '@/store';
import type { DialogType } from '@/types';

export function useDialog(type: DialogType) {
	const { isOpen, open, close, toggle } = useDialogStore();

	return {
		isOpen: isOpen(type),
		open: () => open(type),
		close: () => close(type),
		toggle: () => toggle(type),
		setOpen: (value: boolean) => (value ? open(type) : close(type)),
	};
}
