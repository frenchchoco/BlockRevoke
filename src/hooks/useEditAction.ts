import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Approval } from '../types/approval';
import { editAllowance } from '../services/approvalService';
import { useApprovalStore } from '../stores/approvalStore';
import { usePendingActionsStore } from '../stores/pendingActionsStore';
import { useWallet } from './useWallet';
import { calculateRiskScore } from '../lib/riskScoring';
import { UNLIMITED_THRESHOLD } from '../config/constants';

interface UseEditActionReturn {
    targetApproval: Approval | null;
    isModalOpen: boolean;
    isLoading: boolean;
    error: string | null;
    startEdit: (approval: Approval) => void;
    confirmEdit: (newAllowance: bigint, feeRate?: number) => Promise<void>;
    cancelEdit: () => void;
}

export function useEditAction(): UseEditActionReturn {
    const [targetApproval, setTargetApproval] = useState<Approval | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { walletAddress, address, networkId } = useWallet();
    const updateAllowance = useApprovalStore((s) => s.updateAllowance);
    const setPending = usePendingActionsStore((s) => s.setPending);
    const clearPending = usePendingActionsStore((s) => s.clearPending);

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
        async (newAllowance: bigint, feeRate?: number): Promise<void> => {
            if (!targetApproval || !walletAddress || !address) return;

            setIsLoading(true);
            setError(null);
            setPending(targetApproval.id, 'editing');

            try {
                await editAllowance(
                    networkId,
                    address,
                    targetApproval.tokenAddress,
                    targetApproval.spenderAddress,
                    targetApproval.allowance,
                    newAllowance,
                    true,
                    feeRate,
                );

                clearPending(targetApproval.id);
                const isKnown = targetApproval.spenderLabel !== null;
                const newRiskScore = calculateRiskScore(newAllowance, 0n, isKnown);
                const isUnlimited = newAllowance >= UNLIMITED_THRESHOLD;

                updateAllowance(targetApproval.id, newAllowance, isUnlimited, newRiskScore);
                setTargetApproval(null);
                toast.success('Allowance updated');
            } catch (err: unknown) {
                clearPending(targetApproval.id);
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                toast.error('Edit failed', { description: msg });
            } finally {
                setIsLoading(false);
            }
        },
        [targetApproval, walletAddress, address, networkId, updateAllowance],
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
