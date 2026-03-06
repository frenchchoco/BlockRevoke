import { AddressVerificator } from '@btc-vision/transaction';
import type { Network } from '@btc-vision/bitcoin';

/**
 * Validate that a string is a valid Bitcoin address (any recognized type) on the given network.
 * Uses AddressVerificator per Bob MCP guidelines.
 */
export function isValidBitcoinAddress(addr: string, network: Network): boolean {
    return AddressVerificator.detectAddressType(addr, network) !== null;
}

/**
 * Validate a Bitcoin address or throw.
 * Use at system boundaries where user/env-supplied Bitcoin addresses enter the system
 * (e.g. DEV_ADDRESS, refund addresses).
 */
export function assertValidBitcoinAddress(addr: string, network: Network): void {
    if (!isValidBitcoinAddress(addr, network)) {
        throw new Error(`Invalid Bitcoin address: ${addr}`);
    }
}
