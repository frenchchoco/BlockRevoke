import { type ReactElement, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import type { Approval, RiskLevel } from '../types/approval';
import { cn } from '@/lib/utils';

interface DashboardSummaryProps {
    readonly approvals: Approval[];
}

interface StatItem {
    readonly label: string;
    readonly count: number;
    readonly colorClass: string;
    readonly accentBorder: string;
    readonly glowClass: string;
}

export function DashboardSummary({ approvals }: DashboardSummaryProps): ReactElement {
    const stats = useMemo((): StatItem[] => {
        const counts: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const a of approvals) counts[a.riskScore]++;
        return [
            { label: 'Total Approvals', count: approvals.length, colorClass: 'text-v-blue', accentBorder: 'border-l-v-blue', glowClass: '' },
            { label: 'Critical', count: counts.critical, colorClass: 'text-v-red', accentBorder: 'border-l-v-red', glowClass: counts.critical > 0 ? 'glow-red' : '' },
            { label: 'High', count: counts.high, colorClass: 'text-v-orange', accentBorder: 'border-l-v-orange', glowClass: counts.high > 0 ? 'glow-orange' : '' },
            { label: 'Medium', count: counts.medium, colorClass: 'text-v-amber', accentBorder: 'border-l-v-amber', glowClass: '' },
            { label: 'Low', count: counts.low, colorClass: 'text-v-green', accentBorder: 'border-l-v-green', glowClass: '' },
        ];
    }, [approvals]);

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 mb-6">
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    className={cn('surface-elevated border-l-4 p-4', stat.accentBorder, stat.count > 0 && stat.glowClass)}
                >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">{stat.label}</p>
                    <AnimatedCounter value={stat.count} className={cn('text-3xl font-display font-bold tabular-nums', stat.colorClass)} />
                </motion.div>
            ))}
        </div>
    );
}
