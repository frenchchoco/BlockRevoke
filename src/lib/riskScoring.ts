import type { RiskLevel } from '../types/approval';
import { UNLIMITED_THRESHOLD, DANGEROUS_THRESHOLD } from '../config/constants';

export function calculateRiskScore(
    allowance: bigint,
    balance: bigint,
    isKnownSpender: boolean,
): RiskLevel {
    const isUnlimited = allowance >= UNLIMITED_THRESHOLD;
    const isDangerous = allowance >= DANGEROUS_THRESHOLD;

    // Max-approve or near-max: always critical/high
    if (isUnlimited && !isKnownSpender) return 'critical';
    if (isUnlimited && isKnownSpender) return 'high';

    // Absurdly large (>= 2^96) but below U256_MAX/2
    if (isDangerous && !isKnownSpender) return 'critical';
    if (isDangerous && isKnownSpender) return 'high';

    // Balance-based checks (when balance is known)
    if (!isKnownSpender && balance > 0n && allowance > balance * 10n) return 'high';
    if (isKnownSpender && balance > 0n && allowance > balance) return 'medium';

    // Unknown spender with any allowance is at least medium risk
    if (!isKnownSpender) return 'medium';

    return 'low';
}

