import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { Approval, BatchRevokeItem } from '../types/approval';
import { revokeApproval } from '../services/approvalService';
import { removeCachedApproval } from '../services/cacheService';
import { useApprovalStore } from '../stores/approvalStore';
import { usePendingActionsStore } from '../stores/pendingActionsStore';
import { useWallet } from './useWallet';

export interface BatchRevokeState {
    items: BatchRevokeItem[];
    isRunning: boolean;
    completedCount: number;
    totalCount: number;
}

interface UseBatchRevokeReturn {
    batchState: BatchRevokeState | null;
    startBatch: (approvals: Approval[]) => void;
    executeBatch: (approvals: Approval[], feeRate?: number) => Promise<void>;
    cancelBatch: () => void;
    reset: () => void;
}

export function useBatchRevoke(): UseBatchRevokeReturn {
    const [batchState, setBatchState] = useState<BatchRevokeState | null>(null);
    const cancelledRef = useRef(false);

    const { walletAddress, address, networkId } = useWallet();
    const removeApproval = useApprovalStore((s) => s.removeApproval);
    const setPending = usePendingActionsStore((s) => s.setPending);
    const clearPending = usePendingActionsStore((s) => s.clearPending);

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

    const executeBatch = useCallback(async (approvals: Approval[], feeRate?: number): Promise<void> => {
        if (!walletAddress || !address || approvals.length === 0) return;

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

            // Set status to signing + mark pending
            setPending(approval.id, 'revoking');
            items[i] = { approvalId: approval.id, status: 'signing', txHash: null, error: null };
            setBatchState({
                items: [...items],
                isRunning: true,
                completedCount: completed,
                totalCount: items.length,
            });

            try {
                // Only charge the dev fee on the first revoke of the batch
                const txHash = await revokeApproval(
                    networkId,
                    address,
                    approval.tokenAddress,
                    approval.spenderAddress,
                    approval.allowance,
                    i === 0,
                    feeRate,
                );

                clearPending(approval.id);
                removeApproval(approval.id);
                void removeCachedApproval(approval.id);

                items[i] = { approvalId: approval.id, status: 'success', txHash, error: null };
                completed++;
            } catch (err: unknown) {
                clearPending(approval.id);
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
    }, [walletAddress, address, networkId, removeApproval]);

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
