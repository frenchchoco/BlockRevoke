import type { NetworkId, NetworkConfig } from '../types/network';

export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    rpcUrl: 'https://testnet.opnet.org',
    startBlock: 0,
  },
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    rpcUrl: 'https://mainnet.opnet.org',
    // TODO: Set to actual OPNet mainnet genesis block on March 17 launch
    startBlock: 0,
  },
};
