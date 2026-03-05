import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '../types/approval';
import { RISK_COLORS, RISK_BG_COLORS } from '../lib/riskScoring';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
    readonly level: RiskLevel;
}

const RISK_LABELS: Record<RiskLevel, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

export function RiskBadge({ level }: RiskBadgeProps): ReactElement {
    return (
        <Badge
            variant="outline"
            className={cn(RISK_COLORS[level], RISK_BG_COLORS[level], 'border')}
        >
            {RISK_LABELS[level]}
        </Badge>
    );
}
