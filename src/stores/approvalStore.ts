import { create } from 'zustand';
import type { Approval, ApprovalHistory, RiskLevel } from '../types/approval';

interface ApprovalState {
  approvals: Approval[];
  history: ApprovalHistory[];
  addApprovals: (newApprovals: Approval[]) => void;
  removeApproval: (id: string) => void;
  updateAllowance: (id: string, newAllowance: bigint, isUnlimited: boolean, riskScore: RiskLevel) => void;
  addHistory: (entry: ApprovalHistory) => void;
  clearAll: () => void;
}

export const useApprovalStore = create<ApprovalState>()((set) => ({
  approvals: [],
  history: [],

  addApprovals: (newApprovals: Approval[]): void => {
    set((state) => {
      const merged = [...state.approvals];
      for (const incoming of newApprovals) {
        const existingIndex = merged.findIndex((a) => a.id === incoming.id);
        if (incoming.allowance === 0n) {
          // Zero-allowance = revoked → remove instead of adding
          if (existingIndex !== -1) {
            merged.splice(existingIndex, 1);
          }
          continue;
        }
        if (existingIndex !== -1) {
          merged[existingIndex] = incoming;
        } else {
          merged.push(incoming);
        }
      }
      return { approvals: merged };
    });
  },

  removeApproval: (id: string): void => {
    set((state) => ({
      approvals: state.approvals.filter((a) => a.id !== id),
    }));
  },

  updateAllowance: (
    id: string,
    newAllowance: bigint,
    isUnlimited: boolean,
    riskScore: RiskLevel,
  ): void => {
    set((state) => ({
      approvals: newAllowance === 0n
        ? state.approvals.filter((a) => a.id !== id) // Remove if allowance set to 0
        : state.approvals.map((a) =>
            a.id === id
              ? { ...a, allowance: newAllowance, isUnlimited, riskScore }
              : a,
          ),
    }));
  },

  addHistory: (entry: ApprovalHistory): void => {
    set((state) => ({
      history: [...state.history, entry],
    }));
  },

  clearAll: (): void => {
    set({ approvals: [], history: [] });
  },
}));
