import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useWallet } from './useWallet';
import { useScanStore, type ScanPhase } from '../stores/scanStore';
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
import { getOP20Contract } from '../services/contractService';
import { queryIndexer } from '../services/indexerService';
import { Address } from '@btc-vision/transaction';
import { KNOWN_SPENDERS } from '../config/knownSpenders';
import { UNLIMITED_THRESHOLD } from '../config/constants';
import { calculateRiskScore } from '../lib/riskScoring';
import { NETWORK_CONFIGS } from '../config/networks';
import type { Approval, ApprovalHistory } from '../types/approval';

/** Concurrency for Phase 2 on-chain allowance checks. */
const VERIFY_CONCURRENCY = 8;

interface UseScanReturn {
    readonly isScanning: boolean;
    readonly phase: ScanPhase;
    readonly currentBlock: number;
    readonly latestBlock: number;
    readonly lastScannedBlock: number;
    readonly progress: number;
    readonly discoveredCount: number;
    readonly verifiedCount: number;
    readonly startScan: () => void;
    readonly stopScan: () => void;
}

export function useScan(): UseScanReturn {
    const { walletAddress, address, networkId, isReady } = useWallet();
    const {
        isScanning,
        phase,
        currentBlock,
        latestBlock,
        lastScannedBlock,
        progress,
        discoveredCount,
        verifiedCount,
        setScanning,
        setPhase,
        updateProgress,
        updateVerifyProgress,
        setLastScanned,
    } = useScanStore();
    const addApprovals = useApprovalStore((s) => s.addApprovals);
    const addHistory = useApprovalStore((s) => s.addHistory);

    const scannerRef = useRef<BlockScanner | null>(null);
    const cancelledRef = useRef(false);

    const startScan = useCallback((): void => {
        if (!isReady || !walletAddress || !address) return;
        if (isScanning) return;

        const ownerHex = address.toHex();
        const net = networkId;
        const ownerAddr = address;

        setScanning(true);
        setPhase('scanning');
        cancelledRef.current = false;

        void (async (): Promise<void> => {
            try {
                const lastScanned = await getLastScannedBlock(net, walletAddress);
                const genesisBlock = NETWORK_CONFIGS[net].startBlock;
                let fromBlock = lastScanned > 0 ? lastScanned + 1 : genesisBlock;

                // ── Phase 0: Query the indexer for cached events ──
                const uniquePairs = new Map<string, DiscoveredApproval>();

                try {
                    const indexed = await queryIndexer(net, ownerHex);

                    if (indexed.events.length > 0) {
                        console.log(
                            `[BlockRevoke] Indexer returned ${indexed.events.length} cached events (indexed to block ${indexed.lastIndexedBlock})`,
                        );

                        // Hydrate unique pairs from cached events
                        for (const evt of indexed.events) {
                            try {
                                const key = `${evt.token}:${evt.spender}`;
                                const existing = uniquePairs.get(key);
                                if (!existing || evt.block > existing.blockNumber) {
                                    uniquePairs.set(key, {
                                        tokenAddress: evt.token,
                                        spenderAddress: evt.spender,
                                        ownerAddress: evt.owner,
                                        allowance: BigInt(evt.allowance),
                                        blockNumber: evt.block,
                                        txHash: evt.txHash,
                                    });
                                }
                            } catch {
                                // Skip malformed events (e.g. non-numeric allowance)
                                continue;
                            }
                        }

                        toast.info(
                            `Indexer: ${indexed.events.length} cached events. Scanning remaining blocks…`,
                        );
                    }

                    // Skip blocks already covered by the indexer
                    if (indexed.lastIndexedBlock > 0 && indexed.scanFrom > fromBlock) {
                        fromBlock = indexed.scanFrom;
                    }
                } catch {
                    // Indexer unavailable — fall back to full block scan
                    console.log('[BlockRevoke] Indexer unavailable, falling back to block scan');
                }

                if (cancelledRef.current) return;

                // ── Phase 1: Scan remaining blocks ──
                const scanner = new BlockScanner(net, ownerHex);
                scannerRef.current = scanner;

                let scanEndBlock = fromBlock;

                await scanner.scan(fromBlock, {
                    onApprovalFound: (discovered: DiscoveredApproval): void => {
                        const key = `${discovered.tokenAddress}:${discovered.spenderAddress}`;
                        if (
                            !uniquePairs.has(key) ||
                            discovered.blockNumber > (uniquePairs.get(key)?.blockNumber ?? 0)
                        ) {
                            uniquePairs.set(key, discovered);
                        }
                    },

                    onProgress: (current: number, latest: number): void => {
                        updateProgress(current, latest);
                    },

                    onComplete: (lastBlock: number): void => {
                        scanEndBlock = lastBlock;
                    },

                    onError: (scanError: string): void => {
                        setScanning(false);
                        setPhase(null);
                        scannerRef.current = null;
                        toast.error('Scan failed', { description: scanError });
                    },
                });

                if (cancelledRef.current) return;

                // ── Phase 2: Verify on-chain allowances ──
                setPhase('verifying');

                const pairs = Array.from(uniquePairs.values());
                const totalPairs = pairs.length;

                console.log(
                    `[BlockRevoke] Phase 2: Verifying ${totalPairs} unique (token, spender) pairs`,
                );

                updateVerifyProgress(0, totalPairs);

                const spenders = KNOWN_SPENDERS[net];
                let verifiedSoFar = 0;
                let foundCount = 0;

                for (let i = 0; i < pairs.length; i += VERIFY_CONCURRENCY) {
                    if (cancelledRef.current) break;

                    const chunk = pairs.slice(i, i + VERIFY_CONCURRENCY);

                    const results = await Promise.allSettled(
                        chunk.map(async (discovered): Promise<void> => {
                            try {
                                const contract = getOP20Contract(
                                    discovered.tokenAddress,
                                    net,
                                    ownerAddr,
                                );
                                const spenderAddr = Address.fromString(
                                    discovered.spenderAddress,
                                );
                                const onChain = await contract.allowance(
                                    ownerAddr,
                                    spenderAddr,
                                );
                                const currentAllowance: bigint =
                                    onChain.properties.remaining;

                                if (currentAllowance === 0n) return;

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
                                    currentAllowance,
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
                                    allowance: currentAllowance,
                                    isUnlimited:
                                        currentAllowance >= UNLIMITED_THRESHOLD,
                                    riskScore,
                                    discoveredVia: 'scan',
                                    lastUpdatedBlock: discovered.blockNumber,
                                    lastUpdatedTxHash: discovered.txHash,
                                };

                                addApprovals([approval]);
                                foundCount++;

                                await cacheApproval(net, walletAddress, {
                                    tokenAddress: discovered.tokenAddress,
                                    tokenName: meta.name,
                                    tokenSymbol: meta.symbol,
                                    tokenDecimals: meta.decimals,
                                    spenderAddress: discovered.spenderAddress,
                                    spenderLabel,
                                    allowance: currentAllowance,
                                    discoveredVia: 'scan',
                                    lastUpdatedBlock: discovered.blockNumber,
                                    lastUpdatedTxHash: discovered.txHash,
                                });

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

                                await addHistoryEntry(net, walletAddress, {
                                    tokenAddress: discovered.tokenAddress,
                                    spenderAddress: discovered.spenderAddress,
                                    previousAllowance: 0n,
                                    newAllowance: discovered.allowance,
                                    txHash: discovered.txHash,
                                    blockNumber: discovered.blockNumber,
                                    timestamp: null,
                                });
                            } catch {
                                // Allowance check or metadata fetch failed; skip
                            }
                        }),
                    );

                    verifiedSoFar += results.length;
                    updateVerifyProgress(verifiedSoFar, totalPairs);
                }

                // ── Done ──
                if (!cancelledRef.current) {
                    setLastScanned(scanEndBlock);
                    setScanning(false);
                    setPhase(null);
                    scannerRef.current = null;

                    toast.success(
                        `Scan complete. ${foundCount} active approval${foundCount === 1 ? '' : 's'} from ${totalPairs} events`,
                    );

                    void setLastScannedBlock(net, walletAddress, scanEndBlock);
                }
            } catch (err: unknown) {
                const msg: string =
                    err instanceof Error ? err.message : String(err);
                setScanning(false);
                setPhase(null);
                toast.error('Scan failed to start', { description: msg });
            }
        })();
    }, [
        isReady,
        walletAddress,
        address,
        isScanning,
        networkId,
        setScanning,
        setPhase,
        updateProgress,
        updateVerifyProgress,
        setLastScanned,
        addApprovals,
        addHistory,
    ]);

    const stopScan = useCallback((): void => {
        cancelledRef.current = true;
        scannerRef.current?.stop();
        setScanning(false);
        setPhase(null);
        scannerRef.current = null;
    }, [setScanning, setPhase]);

    const resetScan = useScanStore((s) => s.reset);

    useEffect(() => {
        return (): void => {
            cancelledRef.current = true;
            scannerRef.current?.stop();
            scannerRef.current = null;
            resetScan();
        };
    }, [walletAddress, networkId, resetScan]);

    return {
        isScanning,
        phase,
        currentBlock,
        latestBlock,
        lastScannedBlock,
        progress,
        discoveredCount,
        verifiedCount,
        startScan,
        stopScan,
    };
}
