import type { ReactElement } from 'react';
import type { RiskLevel } from '../types/approval';
import { cn } from '@/lib/utils';

interface RiskBadgeProps { readonly level: RiskLevel; }

const RISK_CFG: Record<RiskLevel, { label: string; dot: string; text: string; bg: string; border: string }> = {
    critical: { label: 'Critical', dot: 'bg-v-red', text: 'text-v-red', bg: 'bg-v-red/10', border: 'border-v-red/25' },
    high:     { label: 'High',     dot: 'bg-v-orange', text: 'text-v-orange', bg: 'bg-v-orange/10', border: 'border-v-orange/25' },
    medium:   { label: 'Medium',   dot: 'bg-v-amber', text: 'text-v-amber', bg: 'bg-v-amber/10', border: 'border-v-amber/25' },
    low:      { label: 'Low',      dot: 'bg-v-green', text: 'text-v-green', bg: 'bg-v-green/10', border: 'border-v-green/25' },
};

export function RiskBadge({ level }: RiskBadgeProps): ReactElement {
    const c = RISK_CFG[level];
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', c.text, c.bg, c.border, level === 'critical' && 'pulse-glow')}>
            <span className={cn('size-1.5 rounded-full', c.dot)} />
            {c.label}
        </span>
    );
}
