import { create } from 'zustand';

export type PendingActionType = 'revoking' | 'editing';

interface PendingAction {
    readonly type: PendingActionType;
    readonly startedAt: number;
}

interface PendingActionsState {
    /** Map of approval ID → pending action info */
    actions: Map<string, PendingAction>;
    setPending: (approvalId: string, type: PendingActionType) => void;
    clearPending: (approvalId: string) => void;
    isPending: (approvalId: string) => boolean;
    getAction: (approvalId: string) => PendingAction | undefined;
}

export const usePendingActionsStore = create<PendingActionsState>()((set, get) => ({
    actions: new Map(),

    setPending: (approvalId: string, type: PendingActionType): void => {
        set((state) => {
            const next = new Map(state.actions);
            next.set(approvalId, { type, startedAt: Date.now() });
            return { actions: next };
        });
    },

    clearPending: (approvalId: string): void => {
        set((state) => {
            const next = new Map(state.actions);
            next.delete(approvalId);
            return { actions: next };
        });
    },

    isPending: (approvalId: string): boolean => {
        return get().actions.has(approvalId);
    },

    getAction: (approvalId: string): PendingAction | undefined => {
        return get().actions.get(approvalId);
    },
}));
