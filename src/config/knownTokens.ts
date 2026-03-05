import type { NetworkId } from '../types/network';
import type { TokenInfo } from '../types/approval';

export const KNOWN_TOKENS: Record<NetworkId, readonly TokenInfo[]> = {
  mainnet: [
    {
      address: '0x75bd98b086b71010448ec5722b6020ce1e0f2c09f5d680c84059db1295948cf8',
      name: 'MOTO',
      symbol: 'MOTO',
      decimals: 8,
    },
  ],
  testnet: [],
};
