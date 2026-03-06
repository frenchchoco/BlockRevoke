import { getContract, type IOP20Contract, OP_20_ABI } from 'opnet';
import { Address } from '@btc-vision/transaction';
import type { Network } from '@btc-vision/bitcoin';
import type { NetworkId } from '../types/network';
import { getReadProvider, getNetwork } from './providerService';

const contractCache = new Map<string, IOP20Contract>();

function cacheKey(tokenAddress: string, networkId: string, sender?: string): string {
    return `${networkId}:${tokenAddress}:${sender ?? 'none'}`;
}

/**
 * Get or create a cached OP20 contract instance.
 * Contract is created ONCE per (token, network, sender) tuple and reused.
 */
export function getOP20Contract(
    tokenAddress: string,
    networkId: NetworkId,
    sender?: Address,
): IOP20Contract {
    const key: string = cacheKey(tokenAddress, networkId, sender?.toHex());
    const cached: IOP20Contract | undefined = contractCache.get(key);
    if (cached) return cached;

    const provider = getReadProvider(networkId);
    const network: Network = getNetwork(networkId);
    const addr: Address = Address.fromString(tokenAddress);

    const contract: IOP20Contract = sender !== undefined
        ? getContract<IOP20Contract>(addr, OP_20_ABI, provider, network, sender)
        : getContract<IOP20Contract>(addr, OP_20_ABI, provider, network);
    contractCache.set(key, contract);
    return contract;
}

/**
 * Clear all cached contract instances.
 * Call on network change.
 */
export function clearContractCache(): void {
    contractCache.clear();
}
