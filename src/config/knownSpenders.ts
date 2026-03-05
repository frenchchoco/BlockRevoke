import type { NetworkId } from '../types/network';
import type { SpenderInfo } from '../types/approval';

export const KNOWN_SPENDERS: Record<NetworkId, readonly SpenderInfo[]> = {
  mainnet: [
    {
      address: '0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70',
      label: 'NativeSwap',
    },
    {
      address: '0xaccca433aec3878ebc041cde2a1a2656f928cc404377ebd8339f0bf2cdd66cbe',
      label: 'MOTO Staking',
    },
  ],
  testnet: [],
};
