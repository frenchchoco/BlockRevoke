import { useMemo } from 'react';
import { create } from 'zustand';
import { useWallet } from './useWallet';
import { getFreeRevokesRemaining, isFeeRequired, getDevFeeSats } from '../services/feeService';

interface FeeRevisionState {
    revision: number;
    bump: () => void;
}

export const useFeeRevisionStore = create<FeeRevisionState>((set) => ({
    revision: 0,
    bump: (): void => { set((s) => ({ revision: s.revision + 1 })); },
}));

interface DevFeeInfo {
    freeRemaining: number;
    feeRequired: boolean;
    feeSats: bigint;
}

export function useDevFee(): DevFeeInfo {
    const { walletAddress } = useWallet();
    const revision = useFeeRevisionStore((s) => s.revision);

    return useMemo((): DevFeeInfo => {
        if (!walletAddress) {
            return { freeRemaining: 0, feeRequired: false, feeSats: 0n };
        }
        return {
            freeRemaining: getFreeRevokesRemaining(walletAddress),
            feeRequired: isFeeRequired(walletAddress),
            feeSats: getDevFeeSats(),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision triggers re-evaluation after revoke usage
    }, [walletAddress, revision]);
}
