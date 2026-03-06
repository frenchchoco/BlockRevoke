export type NetworkId = 'testnet' | 'mainnet';

export interface NetworkConfig {
  readonly id: NetworkId;
  readonly name: string;
  readonly rpcUrl: string;
  /** First block to scan from (OPNet genesis on this network). */
  readonly startBlock: number;
}
