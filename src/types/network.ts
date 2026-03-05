export type NetworkId = 'testnet' | 'mainnet';

export interface NetworkConfig {
  readonly id: NetworkId;
  readonly name: string;
  readonly rpcUrl: string;
}
