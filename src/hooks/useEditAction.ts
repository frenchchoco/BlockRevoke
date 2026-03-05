import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Approval } from '../types/approval';
import { editAllowance } from '../services/approvalService';
import { isFeeRequired, recordRevokeUsage } from '../services/feeService';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';
import { useFeeRevisionStore } from './useDevFee';
import { calculateRiskScore } from '../lib/riskScoring';
import { UNLIMITED_THRESHOLD } from '../config/constants';

interface UseEditActionReturn {
    targetApproval: Approval | null;
    isModalOpen: boolean;
    isLoading: boolean;
    error: string | null;
    startEdit: (approval: Approval) => void;
    confirmEdit: (newAllowance: bigint) => Promise<void>;
    cancelEdit: () => void;
}

export function useEditAction(): UseEditActionReturn {
    const [targetApproval, setTargetApproval] = useState<Approval | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { walletAddress, networkId } = useWallet();
    const updateAllowance = useApprovalStore((s) => s.updateAllowance);

    const isModalOpen = targetApproval !== null;

    const startEdit = useCallback((approval: Approval): void => {
        setTargetApproval(approval);
        setError(null);
    }, []);

    const cancelEdit = useCallback((): void => {
        setTargetApproval(null);
        setError(null);
    }, []);

    const confirmEdit = useCallback(
        async (newAllowance: bigint): Promise<void> => {
            if (!targetApproval || !walletAddress) return;

            setIsLoading(true);
            setError(null);

            try {
                const devFeeRequired = isFeeRequired(walletAddress);

                await editAllowance(
                    networkId,
                    walletAddress,
                    targetApproval.tokenAddress,
                    targetApproval.spenderAddress,
                    targetApproval.allowance,
                    newAllowance,
                    devFeeRequired,
                );

                recordRevokeUsage(walletAddress);
                useFeeRevisionStore.getState().bump();

                const isKnown = targetApproval.spenderLabel !== null;
                const newRiskScore = calculateRiskScore(newAllowance, 0n, isKnown);
                const isUnlimited = newAllowance >= UNLIMITED_THRESHOLD;

                updateAllowance(targetApproval.id, newAllowance, isUnlimited, newRiskScore);
                setTargetApproval(null);
                toast.success('Allowance updated');
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                toast.error('Edit failed', { description: msg });
            } finally {
                setIsLoading(false);
            }
        },
        [targetApproval, walletAddress, networkId, updateAllowance],
    );

    return {
        targetApproval,
        isModalOpen,
        isLoading,
        error,
        startEdit,
        confirmEdit,
        cancelEdit,
    };
}
