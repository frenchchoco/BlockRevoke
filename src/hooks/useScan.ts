import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useWallet } from './useWallet';
import { useScanStore } from '../stores/scanStore';
import { useApprovalStore } from '../stores/approvalStore';
import {
    BlockScanner,
    type DiscoveredApproval,
} from '../services/scannerService';
import {
    getLastScannedBlock,
    setLastScannedBlock,
    cacheApproval,
    addHistoryEntry,
} from '../services/cacheService';
import { fetchTokenMeta } from '../services/tokenService';
import { KNOWN_SPENDERS } from '../config/knownSpenders';
import { UNLIMITED_THRESHOLD } from '../config/constants';
import { calculateRiskScore } from '../lib/riskScoring';
import type { Approval, ApprovalHistory } from '../types/approval';

interface UseScanReturn {
    readonly isScanning: boolean;
    readonly currentBlock: number;
    readonly latestBlock: number;
    readonly lastScannedBlock: number;
    readonly progress: number;
    readonly startScan: () => void;
    readonly stopScan: () => void;
}

export function useScan(): UseScanReturn {
    const { walletAddress, networkId, isReady } = useWallet();
    const {
        isScanning,
        currentBlock,
        latestBlock,
        lastScannedBlock,
        progress,
        setScanning,
        updateProgress,
        setLastScanned,
    } = useScanStore();
    const addApprovals = useApprovalStore((s) => s.addApprovals);
    const addHistory = useApprovalStore((s) => s.addHistory);

    const scannerRef = useRef<BlockScanner | null>(null);
    const foundCountRef = useRef(0);

    const startScan = useCallback((): void => {
        if (!isReady || !walletAddress) return;
        if (isScanning) return;

        const ownerAddress = walletAddress;
        const net = networkId;

        setScanning(true);
        foundCountRef.current = 0;

        void (async (): Promise<void> => {
            try {
                const start = await getLastScannedBlock(net, ownerAddress);
                // Start from the next block after the last scanned one, or 0 if never scanned
                const fromBlock = start > 0 ? start + 1 : 0;

                const scanner = new BlockScanner(net, ownerAddress);
                scannerRef.current = scanner;

                const spenders = KNOWN_SPENDERS[net];

                await scanner.scan(fromBlock, {
                    onApprovalFound: (discovered: DiscoveredApproval): void => {
                        void (async (): Promise<void> => {
                            try {
                                const meta = await fetchTokenMeta(
                                    discovered.tokenAddress,
                                    net,
                                );

                                const spenderLabel =
                                    spenders.find(
                                        (s) =>
                                            s.address.toLowerCase() ===
                                            discovered.spenderAddress.toLowerCase(),
                                    )?.label ?? null;

                                const isKnown = spenderLabel !== null;
                                const riskScore = calculateRiskScore(
                                    discovered.allowance,
                                    0n,
                                    isKnown,
                                );

                                const approval: Approval = {
                                    id: `${discovered.tokenAddress}:${discovered.spenderAddress}`,
                                    tokenAddress: discovered.tokenAddress,
                                    tokenName: meta.name,
                                    tokenSymbol: meta.symbol,
                                    tokenDecimals: meta.decimals,
                                    spenderAddress: discovered.spenderAddress,
                                    spenderLabel,
                                    allowance: discovered.allowance,
                                    isUnlimited:
                                        discovered.allowance >= UNLIMITED_THRESHOLD,
                                    riskScore,
                                    discoveredVia: 'scan',
                                    lastUpdatedBlock: discovered.blockNumber,
                                    lastUpdatedTxHash: discovered.txHash,
                                };

                                addApprovals([approval]);
                                foundCountRef.current++;

                                // Persist to IndexedDB
                                await cacheApproval(net, ownerAddress, {
                                    tokenAddress: discovered.tokenAddress,
                                    tokenName: meta.name,
                                    tokenSymbol: meta.symbol,
                                    tokenDecimals: meta.decimals,
                                    spenderAddress: discovered.spenderAddress,
                                    spenderLabel,
                                    allowance: discovered.allowance,
                                    discoveredVia: 'scan',
                                    lastUpdatedBlock: discovered.blockNumber,
                                    lastUpdatedTxHash: discovered.txHash,
                                });

                                // Add history entry
                                const historyEntry: ApprovalHistory = {
                                    id: `${discovered.txHash}-${discovered.tokenAddress}-${discovered.spenderAddress}`,
                                    tokenAddress: discovered.tokenAddress,
                                    spenderAddress: discovered.spenderAddress,
                                    previousAllowance: 0n,
                                    newAllowance: discovered.allowance,
                                    txHash: discovered.txHash,
                                    blockNumber: discovered.blockNumber,
                                    timestamp: null,
                                };

                                addHistory(historyEntry);

                                await addHistoryEntry(net, ownerAddress, {
                                    tokenAddress: discovered.tokenAddress,
                                    spenderAddress: discovered.spenderAddress,
                                    previousAllowance: 0n,
                                    newAllowance: discovered.allowance,
                                    txHash: discovered.txHash,
                                    blockNumber: discovered.blockNumber,
                                    timestamp: null,
                                });
                            } catch {
                                // Metadata fetch failed; skip this approval silently
                            }
                        })();
                    },

                    onProgress: (current: number, latest: number): void => {
                        updateProgress(current, latest);
                    },

                    onComplete: (lastBlock: number): void => {
                        setLastScanned(lastBlock);
                        setScanning(false);
                        scannerRef.current = null;

                        const count = foundCountRef.current;
                        toast.success(
                            `Scan complete. Found ${count} approval${count === 1 ? '' : 's'}`,
                        );

                        void setLastScannedBlock(net, ownerAddress, lastBlock);
                    },

                    onError: (scanError: string): void => {
                        setScanning(false);
                        scannerRef.current = null;
                        toast.error('Scan failed', { description: scanError });
                    },
                });
            } catch (err: unknown) {
                const msg: string = err instanceof Error ? err.message : String(err);
                setScanning(false);
                toast.error('Scan failed to start', { description: msg });
            }
        })();
    }, [
        isReady,
        walletAddress,
        isScanning,
        networkId,
        setScanning,
        updateProgress,
        setLastScanned,
        addApprovals,
        addHistory,
    ]);

    const stopScan = useCallback((): void => {
        scannerRef.current?.stop();
        setScanning(false);
        scannerRef.current = null;
    }, [setScanning]);

    const resetScan = useScanStore((s) => s.reset);

    // Stop any active scan and reset scan state when network or wallet changes
    useEffect(() => {
        return (): void => {
            scannerRef.current?.stop();
            scannerRef.current = null;
            resetScan();
        };
    }, [walletAddress, networkId, resetScan]);

    return {
        isScanning,
        currentBlock,
        latestBlock,
        lastScannedBlock,
        progress,
        startScan,
        stopScan,
    };
}
