import type { NetworkId, NetworkConfig } from '../types/network';

export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    rpcUrl: 'https://testnet.opnet.org',
  },
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    rpcUrl: 'https://mainnet.opnet.org',
  },
};
