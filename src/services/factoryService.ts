import {
    getContract,
    OP_20_ABI,
    BitcoinAbiTypes,
    ABIDataTypes,
    type IOP20Contract,
    type CallResult,
    type IOP_NETContract,
    type BitcoinInterfaceAbi,
} from 'opnet';
import { Address } from '@btc-vision/transaction';
import type { NetworkId } from '../types/network';
import type { TokenInfo } from '../types/approval';
import { getReadProvider, getNetwork } from './providerService';
import { getCachedFactoryTokens, cacheFactoryTokens } from './cacheService';

// ---- Local factory ABI (not exported from opnet barrel) ---- //

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

// ---- Factory addresses per network ---- //

const FACTORY_ADDRESSES: Partial<Record<NetworkId, string>> = {
    // Factory address will be configured once known.
    // mainnet: '0x...factory-address',
    // testnet: '0x...factory-address',
};

// ---- In-memory metadata cache ---- //

const tokenMetaCache = new Map<string, TokenInfo>();

// ---- Public API ---- //

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

        // Check in-memory cache first
        const memoryCached = tokenMetaCache.get(tokenHex);
        if (memoryCached) {
            tokens.push(memoryCached);
            continue;
        }

        try {
            const tokenContract = getContract<IOP20Contract>(
                tokenAddr,
                OP_20_ABI,
                provider,
                network,
            );

            let name = 'Unknown';
            let symbol = '???';
            let decimals = 8;

            try {
                const meta = await tokenContract.metadata();
                name = meta.properties.name;
                symbol = meta.properties.symbol;
                decimals = meta.properties.decimals;
            } catch {
                // Fallback to individual calls
                try {
                    const n = await tokenContract.name();
                    name = n.properties.name;
                } catch { /* keep default */ }
                try {
                    const s = await tokenContract.symbol();
                    symbol = s.properties.symbol;
                } catch { /* keep default */ }
                try {
                    const d = await tokenContract.decimals();
                    decimals = d.properties.decimals;
                } catch { /* keep default */ }
            }

            const info: TokenInfo = {
                address: tokenHex,
                name,
                symbol,
                decimals,
            };

            tokenMetaCache.set(tokenHex, info);
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
