import { JSONRpcProvider } from 'opnet';
import { networks, type Network } from '@btc-vision/bitcoin';
import type { NetworkId } from '../types/network';
import { NETWORK_CONFIGS } from '../config/networks';

const providerCache = new Map<NetworkId, JSONRpcProvider>();

export function getReadProvider(networkId: NetworkId): JSONRpcProvider {
    const cached = providerCache.get(networkId);
    if (cached) return cached;

    const config = NETWORK_CONFIGS[networkId];
    const network: Network = networkId === 'testnet' ? networks.opnetTestnet : networks.bitcoin;

    const provider = new JSONRpcProvider({ url: config.rpcUrl, network });
    providerCache.set(networkId, provider);
    return provider;
}

export function getNetwork(networkId: NetworkId): Network {
    return networkId === 'testnet' ? networks.opnetTestnet : networks.bitcoin;
}
