import { useMemo } from 'react';
import { useWallet } from './useWallet';
import { getFreeRevokesRemaining, isFeeRequired, getDevFeeSats } from '../services/feeService';

interface DevFeeInfo {
    freeRemaining: number;
    feeRequired: boolean;
    feeSats: bigint;
}

export function useDevFee(): DevFeeInfo {
    const { walletAddress } = useWallet();

    return useMemo((): DevFeeInfo => {
        if (!walletAddress) {
            return { freeRemaining: 0, feeRequired: false, feeSats: 0n };
        }
        return {
            freeRemaining: getFreeRevokesRemaining(walletAddress),
            feeRequired: isFeeRequired(walletAddress),
            feeSats: getDevFeeSats(),
        };
    }, [walletAddress]);
}
