export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DiscoverySource = 'known' | 'scan';

export interface TokenInfo {
  readonly address: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
}

export interface SpenderInfo {
  readonly address: string;
  readonly label: string;
}

export interface Approval {
  readonly id: string;
  readonly tokenAddress: string;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly tokenDecimals: number;
  readonly spenderAddress: string;
  readonly spenderLabel: string | null;
  readonly allowance: bigint;
  readonly isUnlimited: boolean;
  readonly riskScore: RiskLevel;
  readonly discoveredVia: DiscoverySource;
  readonly lastUpdatedBlock: number | null;
  readonly lastUpdatedTxHash: string | null;
}

export interface ApprovalHistory {
  readonly id: string;
  readonly tokenAddress: string;
  readonly spenderAddress: string;
  readonly previousAllowance: bigint;
  readonly newAllowance: bigint;
  readonly txHash: string;
  readonly blockNumber: number;
  readonly timestamp: number | null;
}

export type BatchRevokeStatus = 'pending' | 'signing' | 'success' | 'failed';

export interface BatchRevokeItem {
  readonly approvalId: string;
  status: BatchRevokeStatus;
  txHash: string | null;
  error: string | null;
}
