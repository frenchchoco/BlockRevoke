import {
    getContract,
    BitcoinAbiTypes,
    ABIDataTypes,
    type CallResult,
    type IOP_NETContract,
    type BitcoinInterfaceAbi,
} from 'opnet';
import { Address } from '@btc-vision/transaction';
import type { NetworkId } from '../types/network';
import type { TokenInfo } from '../types/approval';
import { getReadProvider, getNetwork } from './providerService';
import { getCachedFactoryTokens, cacheFactoryTokens } from './cacheService';
import { fetchTokenMeta } from './tokenService';

type GetDeploymentsCount = CallResult<{ count: number }, []>;
type GetDeploymentByIndex = CallResult<
    { deployer: Address; token: Address; block: bigint },
    []
>;

interface IOP20Factory extends IOP_NETContract {
    getDeploymentsCount(): Promise<GetDeploymentsCount>;
    getDeploymentByIndex(index: number): Promise<GetDeploymentByIndex>;
}

/**
 * Minimal ABI for the OP20 Factory -- only the read methods we need.
 * The full ABI lives inside opnet but is not re-exported.
 */
const OP20_FACTORY_ABI: BitcoinInterfaceAbi = [
    {
        name: 'getDeploymentsCount',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT32 }],
    },
    {
        name: 'getDeploymentByIndex',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'index', type: ABIDataTypes.UINT32 }],
        outputs: [
            { name: 'deployer', type: ABIDataTypes.ADDRESS },
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'block', type: ABIDataTypes.UINT64 },
        ],
    },
];

const FACTORY_ADDRESSES: Partial<Record<NetworkId, string>> = {
    // Factory address will be configured once known.
    // mainnet: '0x...factory-address',
    // testnet: '0x...factory-address',
};

/**
 * Enumerate ALL tokens deployed via the OP20 Factory for the given network.
 * Returns an empty array when the factory address is not configured.
 */
export async function discoverFactoryTokens(
    networkId: NetworkId,
): Promise<TokenInfo[]> {
    const factoryAddr = FACTORY_ADDRESSES[networkId];
    if (!factoryAddr) return [];

    // Try IndexedDB cache first
    const cached = await getCachedFactoryTokens(networkId);
    if (cached.length > 0) return cached;

    const provider = getReadProvider(networkId);
    const network = getNetwork(networkId);

    const factory = getContract<IOP20Factory>(
        Address.fromString(factoryAddr),
        OP20_FACTORY_ABI,
        provider,
        network,
    );

    const countResult = await factory.getDeploymentsCount();
    const count = countResult.properties.count;
    const tokens: TokenInfo[] = [];

    for (let i = 0; i < count; i++) {
        const deployment = await factory.getDeploymentByIndex(i);
        const tokenAddr = deployment.properties.token;
        const tokenHex = tokenAddr.toHex();

        try {
            const info = await fetchTokenMeta(tokenHex, networkId);
            tokens.push(info);
        } catch {
            // Skip tokens we can't fetch metadata for
        }
    }

    // Persist to IndexedDB for next time
    if (tokens.length > 0) {
        await cacheFactoryTokens(networkId, tokens);
    }

    return tokens;
}
