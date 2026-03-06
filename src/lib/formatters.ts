import { bech32, bech32m } from 'bech32';
import { BitcoinUtils } from 'opnet';
import { UNLIMITED_THRESHOLD } from '../config/constants';
import type { NetworkId } from '../types/network';

/** Bech32 human-readable part per network. */
const NETWORK_HRP: Record<NetworkId, string> = {
    mainnet: 'bc',
    testnet: 'opt',
};

/**
 * Re-encode a bech32/bech32m address with the correct HRP for the
 * given network.  Hex addresses (`0x…`) are returned as-is.
 */
export function toNetworkAddress(address: string, networkId: NetworkId): string {
    if (address.startsWith('0x')) return address;

    const targetHRP = NETWORK_HRP[networkId];

    // bech32m (taproot / witness v1+)
    try {
        const decoded = bech32m.decode(address, 120);
        if (decoded.prefix === targetHRP) return address;
        return bech32m.encode(targetHRP, decoded.words, 120);
    } catch { /* not bech32m */ }

    // bech32 (segwit v0)
    try {
        const decoded = bech32.decode(address, 120);
        if (decoded.prefix === targetHRP) return address;
        return bech32.encode(targetHRP, decoded.words, 120);
    } catch { /* not bech32 */ }

    return address;
}

export function formatAllowance(amount: bigint, decimals: number): string {
    if (amount >= UNLIMITED_THRESHOLD) return 'Unlimited';
    return BitcoinUtils.formatUnits(amount, decimals);
}

export function shortenAddress(address: string, chars: number = 6): string {
    if (address.length <= chars * 2 + 2) return address;
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Convert an address to the correct network bech32 encoding, then shorten.
 */
export function displayAddress(address: string, networkId: NetworkId, chars?: number): string {
    return shortenAddress(toNetworkAddress(address, networkId), chars);
}

export function formatSats(sats: bigint): string {
    return `${sats.toLocaleString()} sats`;
}
