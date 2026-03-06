import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Approval } from '../types/approval';
import { revokeApproval } from '../services/approvalService';
import { isFeeRequired, recordRevokeUsage } from '../services/feeService';
import { removeCachedApproval } from '../services/cacheService';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';
import { useFeeRevisionStore } from './useDevFee';

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

    const { walletAddress, address, networkId } = useWallet();
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
        if (!targetApproval || !walletAddress || !address) return;

        setIsLoading(true);
        setError(null);

        try {
            const devFeeRequired = isFeeRequired(walletAddress);

            await revokeApproval(
                networkId,
                address,
                targetApproval.tokenAddress,
                targetApproval.spenderAddress,
                targetApproval.allowance,
                devFeeRequired,
            );

            recordRevokeUsage(walletAddress);
            useFeeRevisionStore.getState().bump();
            removeApproval(targetApproval.id);
            void removeCachedApproval(targetApproval.id);
            setTargetApproval(null);
            toast.success('Approval revoked successfully');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            toast.error('Revoke failed', { description: msg });
        } finally {
            setIsLoading(false);
        }
    }, [targetApproval, walletAddress, address, networkId, removeApproval]);

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
