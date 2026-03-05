import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { Approval, BatchRevokeItem } from '../types/approval';
import { revokeApproval } from '../services/approvalService';
import { isFeeRequired, recordRevokeUsage } from '../services/feeService';
import { removeCachedApproval } from '../services/cacheService';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';
import { useFeeRevisionStore } from './useDevFee';

export interface BatchRevokeState {
    items: BatchRevokeItem[];
    isRunning: boolean;
    completedCount: number;
    totalCount: number;
}

interface UseBatchRevokeReturn {
    batchState: BatchRevokeState | null;
    startBatch: (approvals: Approval[]) => void;
    executeBatch: (approvals: Approval[]) => Promise<void>;
    cancelBatch: () => void;
    reset: () => void;
}

export function useBatchRevoke(): UseBatchRevokeReturn {
    const [batchState, setBatchState] = useState<BatchRevokeState | null>(null);
    const cancelledRef = useRef(false);

    const { walletAddress, networkId } = useWallet();
    const removeApproval = useApprovalStore((s) => s.removeApproval);

    const startBatch = useCallback((approvals: Approval[]): void => {
        cancelledRef.current = false;

        const items: BatchRevokeItem[] = approvals.map((a) => ({
            approvalId: a.id,
            status: 'pending' as const,
            txHash: null,
            error: null,
        }));

        setBatchState({
            items,
            isRunning: false,
            completedCount: 0,
            totalCount: approvals.length,
        });
    }, []);

    const executeBatch = useCallback(async (approvals: Approval[]): Promise<void> => {
        if (!walletAddress || approvals.length === 0) return;

        cancelledRef.current = false;

        const items: BatchRevokeItem[] = approvals.map((a) => ({
            approvalId: a.id,
            status: 'pending' as const,
            txHash: null,
            error: null,
        }));

        setBatchState({
            items: [...items],
            isRunning: true,
            completedCount: 0,
            totalCount: items.length,
        });

        let completed = 0;

        for (let i = 0; i < approvals.length; i++) {
            if (cancelledRef.current) break;

            const approval = approvals[i];
            if (!approval) continue;

            // Set status to signing
            items[i] = { approvalId: approval.id, status: 'signing', txHash: null, error: null };
            setBatchState({
                items: [...items],
                isRunning: true,
                completedCount: completed,
                totalCount: items.length,
            });

            try {
                const devFeeRequired = isFeeRequired(walletAddress);

                const txHash = await revokeApproval(
                    networkId,
                    walletAddress,
                    approval.tokenAddress,
                    approval.spenderAddress,
                    approval.allowance,
                    devFeeRequired,
                );

                recordRevokeUsage(walletAddress);
                useFeeRevisionStore.getState().bump();
                removeApproval(approval.id);
                void removeCachedApproval(approval.id);

                items[i] = { approvalId: approval.id, status: 'success', txHash, error: null };
                completed++;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                items[i] = { approvalId: approval.id, status: 'failed', txHash: null, error: msg };
                completed++;
            }

            setBatchState({
                items: [...items],
                isRunning: !cancelledRef.current && i < approvals.length - 1,
                completedCount: completed,
                totalCount: items.length,
            });
        }

        const successCount = items.filter((item) => item.status === 'success').length;
        toast.success(`${successCount}/${items.length} approvals revoked`);

        setBatchState((prev) =>
            prev ? { ...prev, isRunning: false } : prev,
        );
    }, [walletAddress, networkId, removeApproval]);

    const cancelBatch = useCallback((): void => {
        cancelledRef.current = true;
        setBatchState((prev) =>
            prev ? { ...prev, isRunning: false } : prev,
        );
    }, []);

    const reset = useCallback((): void => {
        cancelledRef.current = true;
        setBatchState(null);
    }, []);

    return {
        batchState,
        startBatch,
        executeBatch,
        cancelBatch,
        reset,
    };
}
