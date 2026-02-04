import { create } from 'zustand';
import type { DialogType } from '@/types';

interface DialogState {
    openDialogs: Set<DialogType>;
    isOpen: (type: DialogType) => boolean;
    open: (type: DialogType) => void;
    close: (type: DialogType) => void;
    toggle: (type: DialogType) => void;
    closeAll: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
    openDialogs: new Set(),

    isOpen: type => get().openDialogs.has(type),

    open: type =>
        set(state => ({
            openDialogs: new Set(state.openDialogs).add(type)
        })),

    close: type =>
        set(state => {
            const newDialogs = new Set(state.openDialogs);
            newDialogs.delete(type);
            return { openDialogs: newDialogs };
        }),

    toggle: type => {
        const state = get();
        if (state.isOpen(type)) {
            state.close(type);
        } else {
            state.open(type);
        }
    },

    closeAll: () => set({ openDialogs: new Set() })
}));

