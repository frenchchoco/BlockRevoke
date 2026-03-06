import { getReadProvider } from './providerService';
import type { NetworkId } from '../types/network';

/* ── Public types ────────────────────────────────────────────── */

export interface LiveFeeRates {
    readonly low: number;
    readonly medium: number;
    readonly high: number;
    readonly fetchedAt: number;
}

/* ── Fallbacks ───────────────────────────────────────────────── */

const FALLBACK_RATES: LiveFeeRates = {
    low: 2,
    medium: 5,
    high: 15,
    fetchedAt: 0,
};

/* ── Cache ────────────────────────────────────────────────────── */

const CACHE_TTL = 60_000; // 60 seconds

interface CachedEntry {
    rates: LiveFeeRates;
    priorityFee: bigint;
    fetchedAt: number;
}

const cache = new Map<NetworkId, CachedEntry>();

/* ── Core fetch ──────────────────────────────────────────────── */

async function refreshCache(networkId: NetworkId): Promise<void> {
    try {
        const provider = getReadProvider(networkId);
        const gas = await provider.gasParameters();
        const now = Date.now();

        const priorityFee =
            gas.gasPerSat > 0n ? gas.baseGas / gas.gasPerSat : 1_000n;

        cache.set(networkId, {
            rates: {
                low: Math.ceil(gas.bitcoin.recommended.low),
                medium: Math.ceil(gas.bitcoin.recommended.medium),
                high: Math.ceil(gas.bitcoin.recommended.high),
                fetchedAt: now,
            },
            priorityFee: priorityFee > 0n ? priorityFee : 1_000n,
            fetchedAt: now,
        });
    } catch {
        /* RPC unreachable — keep stale cache or use fallbacks */
    }
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Force-refresh and return live fee rates from the RPC.
 */
export async function fetchLiveFeeRates(
    networkId: NetworkId,
): Promise<LiveFeeRates> {
    await refreshCache(networkId);
    const cached = cache.get(networkId);
    return cached?.rates ?? FALLBACK_RATES;
}

/**
 * Get cached rates (non-blocking). Triggers background refresh if stale.
 */
export function getCachedRates(networkId: NetworkId): LiveFeeRates {
    const cached = cache.get(networkId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return cached.rates;
    }
    // Trigger non-blocking refresh
    void refreshCache(networkId);
    return cached?.rates ?? FALLBACK_RATES;
}

/**
 * Get the priority fee (OPNet gas) for a transaction.
 */
export function getPriorityFee(networkId: NetworkId): bigint {
    const cached = cache.get(networkId);
    return cached?.priorityFee ?? 1_000n;
}
