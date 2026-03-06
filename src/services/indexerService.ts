/**
 * Client for the BlockRevoke event indexer API.
 *
 * Flow:
 *   1. Query API for cached events → instant results
 *   2. API tells client which block to scan from (the gap)
 *   3. Client scans only the remaining blocks
 */

import type { NetworkId } from '../types/network';

export interface IndexedEvent {
    token: string;
    spender: string;
    owner: string;
    allowance: string;
    block: number;
    txHash: string;
}

export interface IndexerQueryResult {
    events: IndexedEvent[];
    lastIndexedBlock: number;
    /** The block the client should start scanning from */
    scanFrom: number;
}

/**
 * Base URL for the indexer API.
 * Uses same-origin — Vercel rewrites /api/* to the Hetzner VPS.
 */
function getApiBase(): string {
    if (typeof window !== 'undefined' && window.location) {
        return window.location.origin;
    }
    return '';
}

/**
 * Query the indexer for cached approval events for a specific owner.
 * Returns cached events + the block number to start scanning from.
 */
export async function queryIndexer(
    networkId: NetworkId,
    ownerHex: string,
): Promise<IndexerQueryResult> {
    const url = `${getApiBase()}/api/events?network=${networkId}&owner=${encodeURIComponent(ownerHex)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        throw new Error(`Indexer query failed: ${response.status}`);
    }

    return (await response.json()) as IndexerQueryResult;
}

