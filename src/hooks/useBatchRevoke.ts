import { useState, useCallback, useRef } from 'react';
import type { Approval, BatchRevokeItem } from '../types/approval';
import { revokeApproval } from '../services/approvalService';
import { recordRevokeUsage } from '../services/feeService';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';

interface BatchRevokeState {
    items: BatchRevokeItem[];
    isRunning: boolean;
    completedCount: number;
    totalCount: number;
}

interface UseBatchRevokeReturn {
    batchState: BatchRevokeState | null;
    startBatch: (approvals: Approval[]) => void;
    executeBatch: () => Promise<void>;
    cancelBatch: () => void;
    reset: () => void;
}

export function useBatchRevoke(): UseBatchRevokeReturn {
    const [batchState, setBatchState] = useState<BatchRevokeState | null>(null);
    const cancelledRef = useRef(false);
    const approvalsRef = useRef<Approval[]>([]);

    const { walletAddress, networkId } = useWallet();
    const removeApproval = useApprovalStore((s) => s.removeApproval);

    const startBatch = useCallback((approvals: Approval[]): void => {
        approvalsRef.current = approvals;
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

    const executeBatch = useCallback(async (): Promise<void> => {
        if (!walletAddress || !batchState) return;

        cancelledRef.current = false;
        const approvals = approvalsRef.current;
        const items = [...batchState.items];

        setBatchState((prev) =>
            prev ? { ...prev, isRunning: true, completedCount: 0 } : prev,
        );

        let completed = 0;

        for (let i = 0; i < items.length; i++) {
            if (cancelledRef.current) break;

            const item = items[i];
            if (!item) continue;

            const approval = approvals.find((a) => a.id === item.approvalId);
            if (!approval) continue;

            // Set status to signing
            items[i] = { ...item, status: 'signing', txHash: null, error: null };
            setBatchState({
                items: [...items],
                isRunning: true,
                completedCount: completed,
                totalCount: items.length,
            });

            try {
                const txHash = await revokeApproval(
                    networkId,
                    walletAddress,
                    approval.tokenAddress,
                    approval.spenderAddress,
                    approval.allowance,
                );

                recordRevokeUsage(walletAddress);
                removeApproval(approval.id);

                items[i] = { ...item, status: 'success', txHash, error: null };
                completed++;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                items[i] = { ...item, status: 'failed', txHash: null, error: msg };
                completed++;
            }

            setBatchState({
                items: [...items],
                isRunning: !cancelledRef.current && i < items.length - 1,
                completedCount: completed,
                totalCount: items.length,
            });
        }

        setBatchState((prev) =>
            prev ? { ...prev, isRunning: false } : prev,
        );
    }, [walletAddress, networkId, batchState, removeApproval]);

    const cancelBatch = useCallback((): void => {
        cancelledRef.current = true;
        setBatchState((prev) =>
            prev ? { ...prev, isRunning: false } : prev,
        );
    }, []);

    const reset = useCallback((): void => {
        cancelledRef.current = true;
        approvalsRef.current = [];
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
