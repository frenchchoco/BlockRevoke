import { getContract, OP_20_ABI, type IOP20Contract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import type { NetworkId } from '../types/network';
import type { TokenInfo } from '../types/approval';
import { getReadProvider, getNetwork } from './providerService';

const tokenMetaCache = new Map<string, TokenInfo>();

/** Fetch token metadata (name, symbol, decimals) with in-memory caching. */
export async function fetchTokenMeta(
    tokenAddress: string,
    networkId: NetworkId,
): Promise<TokenInfo> {
    const cached = tokenMetaCache.get(tokenAddress);
    if (cached) return cached;

    const provider = getReadProvider(networkId);
    const network = getNetwork(networkId);
    const addr = Address.fromString(tokenAddress);

    const contract = getContract<IOP20Contract>(
        addr,
        OP_20_ABI,
        provider,
        network,
    );

    let name = 'Unknown';
    let symbol = '???';
    let decimals = 8;

    try {
        const meta = await contract.metadata();
        name = meta.properties.name;
        symbol = meta.properties.symbol;
        decimals = meta.properties.decimals;
    } catch {
        // Fallback: try individual calls
        try {
            const n = await contract.name();
            name = n.properties.name;
        } catch { /* keep default */ }
        try {
            const s = await contract.symbol();
            symbol = s.properties.symbol;
        } catch { /* keep default */ }
        try {
            const d = await contract.decimals();
            decimals = d.properties.decimals;
        } catch { /* keep default */ }
    }

    const info: TokenInfo = { address: tokenAddress, name, symbol, decimals };
    tokenMetaCache.set(tokenAddress, info);
    return info;
}
