import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';
import { discoverKnownApprovals } from '../services/approvalService';
import { getCachedApprovals } from '../services/cacheService';
import { UNLIMITED_THRESHOLD } from '../config/constants';
import { calculateRiskScore } from '../lib/riskScoring';
import type { Approval, ApprovalHistory, DiscoverySource } from '../types/approval';

interface UseApprovalsReturn {
    approvals: Approval[];
    history: ApprovalHistory[];
    isLoading: boolean;
    error: string | null;
}

export function useApprovals(): UseApprovalsReturn {
    const { walletAddress, address, networkId, isReady } = useWallet();
    const approvals = useApprovalStore((s) => s.approvals);
    const history = useApprovalStore((s) => s.history);
    const addApprovals = useApprovalStore((s) => s.addApprovals);
    const clearAll = useApprovalStore((s) => s.clearAll);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isReady || !walletAddress || !address) {
            clearAll();
            return;
        }

        let cancelled = false;

        const loadCachedAndDiscover = async (): Promise<void> => {
            setIsLoading(true);
            setError(null);

            // Load cached approvals from IndexedDB first for instant display
            try {
                const cached = await getCachedApprovals(networkId, walletAddress);
                if (!cancelled && cached.length > 0) {
                    const cachedApprovals: Approval[] = cached.map((c) => {
                        const allowance = BigInt(c.allowance);
                        const isKnown = c.spenderLabel !== null;
                        return {
                            id: `${c.tokenAddress}:${c.spenderAddress}`,
                            tokenAddress: c.tokenAddress,
                            tokenName: c.tokenName,
                            tokenSymbol: c.tokenSymbol,
                            tokenDecimals: c.tokenDecimals,
                            spenderAddress: c.spenderAddress,
                            spenderLabel: c.spenderLabel,
                            allowance,
                            isUnlimited: allowance >= UNLIMITED_THRESHOLD,
                            riskScore: calculateRiskScore(allowance, 0n, isKnown),
                            discoveredVia: (c.discoveredVia === 'scan' ? 'scan' : 'known') as DiscoverySource,
                            lastUpdatedBlock: c.lastUpdatedBlock,
                            lastUpdatedTxHash: c.lastUpdatedTxHash,
                        };
                    });
                    addApprovals(cachedApprovals);
                }
            } catch {
                // IndexedDB read failed; continue with RPC discovery
            }

            // Then discover fresh approvals via RPC
            try {
                const found = await discoverKnownApprovals(networkId, address);
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

        void loadCachedAndDiscover();

        return (): void => {
            cancelled = true;
        };
    }, [walletAddress, address, networkId, isReady, addApprovals, clearAll]);

    return { approvals, history, isLoading, error };
}
