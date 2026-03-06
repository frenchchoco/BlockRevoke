import { create } from 'zustand';
import { useWallet } from './useWallet';
import { getFreeRevokesRemaining, isFeeRequired, getDevFeeSats } from '../services/feeService';

interface FeeRevisionState {
    readonly revision: number;
    readonly bump: () => void;
}

export const useFeeRevisionStore = create<FeeRevisionState>((set) => ({
    revision: 0,
    bump: (): void => { set((s) => ({ revision: s.revision + 1 })); },
}));

interface DevFeeInfo {
    readonly freeRemaining: number;
    readonly feeRequired: boolean;
    readonly feeSats: bigint;
}

export function useDevFee(): DevFeeInfo {
    const { walletAddress } = useWallet();
    // Subscribe to revision so the hook re-renders after each revoke usage.
    // The value itself is intentionally unused — it only triggers recalculation.
    useFeeRevisionStore((s) => s.revision);

    if (!walletAddress) {
        return { freeRemaining: 0, feeRequired: false, feeSats: 0n };
    }

    return {
        freeRemaining: getFreeRevokesRemaining(walletAddress),
        feeRequired: isFeeRequired(walletAddress),
        feeSats: getDevFeeSats(),
    };
}
