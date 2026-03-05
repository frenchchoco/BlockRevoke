import type { RiskLevel } from '../types/approval';
import { UNLIMITED_THRESHOLD } from '../config/constants';

export function calculateRiskScore(
    allowance: bigint,
    balance: bigint,
    isKnownSpender: boolean,
): RiskLevel {
    const isUnlimited = allowance >= UNLIMITED_THRESHOLD;

    if (isUnlimited && !isKnownSpender) return 'critical';
    if (isUnlimited && isKnownSpender) return 'high';
    if (!isKnownSpender && balance > 0n && allowance > balance * 10n) return 'high';
    if (isKnownSpender && balance > 0n && allowance > balance) return 'medium';
    return 'low';
}

export const RISK_COLORS: Record<RiskLevel, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
};

export const RISK_BG_COLORS: Record<RiskLevel, string> = {
    critical: 'bg-red-500/10 border-red-500/20',
    high: 'bg-orange-500/10 border-orange-500/20',
    medium: 'bg-yellow-500/10 border-yellow-500/20',
    low: 'bg-green-500/10 border-green-500/20',
};
