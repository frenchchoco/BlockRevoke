import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';
import { discoverKnownApprovals } from '../services/approvalService';
import type { Approval, ApprovalHistory } from '../types/approval';

interface UseApprovalsReturn {
    approvals: Approval[];
    history: ApprovalHistory[];
    isLoading: boolean;
    error: string | null;
}

export function useApprovals(): UseApprovalsReturn {
    const { walletAddress, networkId, isReady } = useWallet();
    const approvals = useApprovalStore((s) => s.approvals);
    const history = useApprovalStore((s) => s.history);
    const addApprovals = useApprovalStore((s) => s.addApprovals);
    const clearAll = useApprovalStore((s) => s.clearAll);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isReady || !walletAddress) {
            clearAll();
            return;
        }

        let cancelled = false;

        const discover = async (): Promise<void> => {
            setIsLoading(true);
            setError(null);
            try {
                const found = await discoverKnownApprovals(networkId, walletAddress);
                if (!cancelled) {
                    addApprovals(found);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setError(msg);
                    toast.error('Failed to load approvals', { description: msg });
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void discover();

        return (): void => {
            cancelled = true;
        };
    }, [walletAddress, networkId, isReady, addApprovals, clearAll]);

    return { approvals, history, isLoading, error };
}
