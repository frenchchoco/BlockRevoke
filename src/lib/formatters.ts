import { BitcoinUtils } from 'opnet';
import { UNLIMITED_THRESHOLD } from '../config/constants';

export function formatAllowance(amount: bigint, decimals: number): string {
    if (amount >= UNLIMITED_THRESHOLD) return 'Unlimited';
    return BitcoinUtils.formatUnits(amount, decimals);
}

export function shortenAddress(address: string, chars: number = 6): string {
    if (address.length <= chars * 2 + 2) return address;
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatSats(sats: bigint): string {
    return `${sats.toLocaleString()} sats`;
}
