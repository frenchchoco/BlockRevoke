import { useState, useCallback } from 'react';
import type { Approval } from '../types/approval';
import { revokeApproval } from '../services/approvalService';
import { recordRevokeUsage } from '../services/feeService';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';

interface UseRevokeActionReturn {
    targetApproval: Approval | null;
    isDialogOpen: boolean;
    isLoading: boolean;
    error: string | null;
    startRevoke: (approval: Approval) => void;
    confirmRevoke: () => Promise<void>;
    cancelRevoke: () => void;
}

export function useRevokeAction(): UseRevokeActionReturn {
    const [targetApproval, setTargetApproval] = useState<Approval | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { walletAddress, networkId } = useWallet();
    const removeApproval = useApprovalStore((s) => s.removeApproval);

    const isDialogOpen = targetApproval !== null;

    const startRevoke = useCallback((approval: Approval): void => {
        setTargetApproval(approval);
        setError(null);
    }, []);

    const cancelRevoke = useCallback((): void => {
        setTargetApproval(null);
        setError(null);
    }, []);

    const confirmRevoke = useCallback(async (): Promise<void> => {
        if (!targetApproval || !walletAddress) return;

        setIsLoading(true);
        setError(null);

        try {
            await revokeApproval(
                networkId,
                walletAddress,
                targetApproval.tokenAddress,
                targetApproval.spenderAddress,
                targetApproval.allowance,
            );

            recordRevokeUsage(walletAddress);
            removeApproval(targetApproval.id);
            setTargetApproval(null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [targetApproval, walletAddress, networkId, removeApproval]);

    return {
        targetApproval,
        isDialogOpen,
        isLoading,
        error,
        startRevoke,
        confirmRevoke,
        cancelRevoke,
    };
}
