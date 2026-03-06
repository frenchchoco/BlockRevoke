import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TokenInfo } from '../types/approval';

const DB_NAME = 'blockrevoke';
const DB_VERSION = 2;

export interface CachedApproval {
    readonly networkId: string;
    readonly walletAddress: string;
    readonly tokenAddress: string;
    readonly tokenName: string;
    readonly tokenSymbol: string;
    readonly tokenDecimals: number;
    readonly spenderAddress: string;
    readonly spenderLabel: string | null;
    readonly allowance: string; // bigint serialised as string
    readonly discoveredVia: string;
    readonly lastUpdatedBlock: number | null;
    readonly lastUpdatedTxHash: string | null;
}

export interface CachedHistory {
    readonly networkId: string;
    readonly walletAddress: string;
    readonly tokenAddress: string;
    readonly spenderAddress: string;
    readonly previousAllowance: string; // bigint serialised as string
    readonly newAllowance: string; // bigint serialised as string
    readonly txHash: string;
    readonly blockNumber: number;
    readonly timestamp: number | null;
}

export interface CachedFactoryTokens {
    readonly networkId: string;
    readonly tokens: readonly TokenInfo[];
    readonly updatedAt: number;
}

interface BlockRevokeDB extends DBSchema {
    'scan-progress': {
        key: string; // `${networkId}:${walletAddress}`
        value: {
            lastScannedBlock: number;
            updatedAt: number;
        };
    };
    'approvals': {
        key: string; // `${tokenAddr}:${spenderAddr}`
        value: CachedApproval;
    };
    'history': {
        key: number; // auto-increment
        value: CachedHistory;
    };
    'factory-tokens': {
        key: string; // networkId
        value: CachedFactoryTokens;
    };
}

let dbPromise: Promise<IDBPDatabase<BlockRevokeDB>> | null = null;

function getDB(): Promise<IDBPDatabase<BlockRevokeDB>> {
    if (!dbPromise) {
        dbPromise = openDB<BlockRevokeDB>(DB_NAME, DB_VERSION, {
            upgrade(db): void {
                // scan-progress store
                if (!db.objectStoreNames.contains('scan-progress')) {
                    db.createObjectStore('scan-progress');
                }

                // approvals store
                if (!db.objectStoreNames.contains('approvals')) {
                    db.createObjectStore('approvals');
                }

                // history store with auto-increment key
                if (!db.objectStoreNames.contains('history')) {
                    db.createObjectStore('history', { autoIncrement: true });
                }

                // factory-tokens store (added in v2)
                if (!db.objectStoreNames.contains('factory-tokens')) {
                    db.createObjectStore('factory-tokens');
                }
            },
        });
    }
    return dbPromise;
}

function progressKey(networkId: string, walletAddress: string): string {
    return `${networkId}:${walletAddress}`;
}

export async function getLastScannedBlock(
    networkId: string,
    walletAddress: string,
): Promise<number> {
    const db = await getDB();
    const record = await db.get('scan-progress', progressKey(networkId, walletAddress));
    return record?.lastScannedBlock ?? 0;
}

export async function setLastScannedBlock(
    networkId: string,
    walletAddress: string,
    block: number,
): Promise<void> {
    const db = await getDB();
    await db.put(
        'scan-progress',
        { lastScannedBlock: block, updatedAt: Date.now() },
        progressKey(networkId, walletAddress),
    );
}

export async function getCachedApprovals(
    networkId: string,
    walletAddress: string,
): Promise<CachedApproval[]> {
    const db = await getDB();
    const all = await db.getAll('approvals');
    const allKeys = await db.getAllKeys('approvals');
    const matching: CachedApproval[] = [];

    for (let i = 0; i < all.length; i++) {
        const a = all[i] as CachedApproval;
        const key = allKeys[i] as string;
        if (a.networkId !== networkId || a.walletAddress !== walletAddress) continue;
        if (a.allowance === '0') {
            // Clean up stale zero-allowance entries from IndexedDB
            void db.delete('approvals', key);
            continue;
        }
        matching.push(a);
    }

    return matching;
}

export async function cacheApproval(
    networkId: string,
    walletAddress: string,
    approval: {
        tokenAddress: string;
        tokenName: string;
        tokenSymbol: string;
        tokenDecimals: number;
        spenderAddress: string;
        spenderLabel: string | null;
        allowance: bigint;
        discoveredVia: string;
        lastUpdatedBlock: number | null;
        lastUpdatedTxHash: string | null;
    },
): Promise<void> {
    const db = await getDB();
    const key = `${approval.tokenAddress}:${approval.spenderAddress}`;
    const value: CachedApproval = {
        networkId,
        walletAddress,
        tokenAddress: approval.tokenAddress,
        tokenName: approval.tokenName,
        tokenSymbol: approval.tokenSymbol,
        tokenDecimals: approval.tokenDecimals,
        spenderAddress: approval.spenderAddress,
        spenderLabel: approval.spenderLabel,
        allowance: approval.allowance.toString(),
        discoveredVia: approval.discoveredVia,
        lastUpdatedBlock: approval.lastUpdatedBlock,
        lastUpdatedTxHash: approval.lastUpdatedTxHash,
    };
    await db.put('approvals', value, key);
}

export async function removeCachedApproval(approvalId: string): Promise<void> {
    const db = await getDB();
    await db.delete('approvals', approvalId);
}

export async function addHistoryEntry(
    networkId: string,
    walletAddress: string,
    entry: {
        tokenAddress: string;
        spenderAddress: string;
        previousAllowance: bigint;
        newAllowance: bigint;
        txHash: string;
        blockNumber: number;
        timestamp: number | null;
    },
): Promise<void> {
    const db = await getDB();
    const value: CachedHistory = {
        networkId,
        walletAddress,
        tokenAddress: entry.tokenAddress,
        spenderAddress: entry.spenderAddress,
        previousAllowance: entry.previousAllowance.toString(),
        newAllowance: entry.newAllowance.toString(),
        txHash: entry.txHash,
        blockNumber: entry.blockNumber,
        timestamp: entry.timestamp,
    };
    await db.add('history', value);
}

export async function getHistory(
    networkId: string,
    walletAddress: string,
): Promise<CachedHistory[]> {
    const db = await getDB();
    const all = await db.getAll('history');
    return all.filter(
        (h) => h.networkId === networkId && h.walletAddress === walletAddress,
    );
}

/** Cache lifetime: 1 hour */
const FACTORY_CACHE_TTL_MS = 60 * 60 * 1000;

export async function getCachedFactoryTokens(
    networkId: string,
): Promise<readonly TokenInfo[]> {
    const db = await getDB();
    const record = await db.get('factory-tokens', networkId);
    if (!record) return [];

    // Expire stale entries
    if (Date.now() - record.updatedAt > FACTORY_CACHE_TTL_MS) return [];

    return record.tokens;
}

export async function cacheFactoryTokens(
    networkId: string,
    tokens: readonly TokenInfo[],
): Promise<void> {
    const db = await getDB();
    const value: CachedFactoryTokens = {
        networkId,
        tokens,
        updatedAt: Date.now(),
    };
    await db.put('factory-tokens', value, networkId);
}
