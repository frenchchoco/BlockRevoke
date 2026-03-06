import { type ReactElement, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Approval, RiskLevel } from '../types/approval';
import { RISK_COLORS } from '../lib/riskScoring';
import { cn } from '@/lib/utils';

interface DashboardSummaryProps {
    readonly approvals: Approval[];
}

interface StatItem {
    readonly label: string;
    readonly count: number;
    readonly colorClass: string;
}

export function DashboardSummary({ approvals }: DashboardSummaryProps): ReactElement {
    const stats = useMemo((): StatItem[] => {
        const counts: Record<RiskLevel, number> = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
        };

        for (const a of approvals) {
            counts[a.riskScore]++;
        }

        return [
            { label: 'Total Approvals', count: approvals.length, colorClass: 'text-foreground' },
            { label: 'Critical', count: counts.critical, colorClass: RISK_COLORS.critical },
            { label: 'High', count: counts.high, colorClass: RISK_COLORS.high },
            { label: 'Medium', count: counts.medium, colorClass: RISK_COLORS.medium },
            { label: 'Low', count: counts.low, colorClass: RISK_COLORS.low },
        ];
    }, [approvals]);

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 mb-6">
            {stats.map((stat) => (
                <Card key={stat.label}>
                    <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                        <p className={cn('text-2xl font-bold', stat.colorClass)}>{stat.count}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
