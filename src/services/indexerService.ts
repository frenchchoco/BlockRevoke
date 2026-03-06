/**
 * Client for the BlockRevoke crowdsourced event indexer API.
 *
 * Flow:
 *   1. Query API for cached events → instant results
 *   2. API tells client which block to scan from (the gap)
 *   3. Client scans only the remaining blocks
 *   4. Client pushes discovered events back to the API
 *
 * This means: first user scans everything, second user gets instant results.
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

/**
 * Push discovered events to the indexer (crowdsourced).
 * Called after a client finishes scanning a block range.
 */
export async function submitEvents(
    networkId: NetworkId,
    events: IndexedEvent[],
    fromBlock: number,
    toBlock: number,
): Promise<void> {
    if (events.length === 0 && fromBlock === toBlock) return;

    const url = `${getApiBase()}/api/events`;

    // Split into chunks of 500 if needed
    const CHUNK_SIZE = 500;
    for (let i = 0; i < events.length || i === 0; i += CHUNK_SIZE) {
        const chunk = events.slice(i, i + CHUNK_SIZE);

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    network: networkId,
                    events: chunk,
                    fromBlock,
                    toBlock,
                }),
                signal: AbortSignal.timeout(15_000),
            });
        } catch {
            // Non-critical: don't block the user if submit fails
            console.warn('[Indexer] Failed to submit events to indexer');
        }
    }
}
