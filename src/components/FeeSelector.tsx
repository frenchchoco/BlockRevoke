import { type ReactElement, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gauge, Snail, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LiveFeeRates } from '../services/gasService';

/* ── Tier definitions ────────────────────────────────────────── */

type TierKey = 'low' | 'medium' | 'high';

interface TierDef {
    readonly key: TierKey;
    readonly label: string;
    readonly description: string;
    readonly icon: typeof Snail;
    readonly color: string;
    readonly activeBg: string;
    readonly activeBorder: string;
}

const TIERS: TierDef[] = [
    {
        key: 'low',
        label: 'Economy',
        description: 'Slower',
        icon: Snail,
        color: 'text-v-green',
        activeBg: 'bg-v-green/10',
        activeBorder: 'border-v-green/40',
    },
    {
        key: 'medium',
        label: 'Standard',
        description: 'Normal',
        icon: Gauge,
        color: 'text-v-cyan',
        activeBg: 'bg-v-cyan/10',
        activeBorder: 'border-v-cyan/40',
    },
    {
        key: 'high',
        label: 'Priority',
        description: 'Fast',
        icon: Zap,
        color: 'text-v-orange',
        activeBg: 'bg-v-orange/10',
        activeBorder: 'border-v-orange/40',
    },
];

/* ── Component ───────────────────────────────────────────────── */

interface FeeSelectorProps {
    /** Live fee rates fetched from the network. */
    readonly liveRates: LiveFeeRates | null;
    /** Whether rates are currently loading. */
    readonly loading: boolean;
    /** Called whenever the user picks a new fee rate. */
    readonly onChange: (feeRate: number) => void;
    /** Default selected tier. */
    readonly defaultTier?: TierKey;
    /** Compact inline mode for batch bar. */
    readonly compact?: boolean;
}

export function FeeSelector({
    liveRates,
    loading,
    onChange,
    defaultTier = 'medium',
    compact = false,
}: FeeSelectorProps): ReactElement {
    const [selectedTier, setSelectedTier] = useState<TierKey | 'custom'>(defaultTier);
    const [customValue, setCustomValue] = useState('');
    const [customError, setCustomError] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    // Emit the selected rate whenever tier or rates change
    const selectedRate = useMemo((): number | null => {
        if (selectedTier === 'custom') {
            const v = Number(customValue);
            if (!Number.isFinite(v) || v < 1 || v > 2000) return null;
            return v;
        }
        if (!liveRates) return null;
        return liveRates[selectedTier];
    }, [selectedTier, customValue, liveRates]);

    useEffect(() => {
        if (selectedRate !== null) {
            onChange(selectedRate);
        }
    }, [selectedRate, onChange]);

    // Auto-select default tier when rates arrive
    useEffect(() => {
        if (liveRates && selectedTier !== 'custom') {
            setSelectedTier(defaultTier);
        }
    }, [liveRates, defaultTier]); // selectedTier intentionally excluded — only reset on new rates

    const handleTierClick = useCallback((key: TierKey): void => {
        setSelectedTier(key);
        setCustomValue('');
        setCustomError('');
        setShowCustom(false);
    }, []);

    const handleCustomChange = useCallback((raw: string): void => {
        const cleaned = raw.replace(/[^0-9.]/g, '');
        setCustomValue(cleaned);
        setSelectedTier('custom');
        if (!cleaned) { setCustomError(''); return; }
        const v = Number(cleaned);
        if (!Number.isFinite(v) || v < 1) setCustomError('Min: 1 sat/vB');
        else if (v > 2000) setCustomError('Max: 2,000 sat/vB');
        else setCustomError('');
    }, []);

    const handleCustomToggle = useCallback((): void => {
        setShowCustom(true);
        setSelectedTier('custom');
    }, []);

    /* ── Compact inline mode (for batch bar) ─────────────────── */
    if (compact) {
        return (
            <div className="flex items-center gap-2 flex-wrap">
                {/* Live indicator */}
                <div className="flex items-center gap-1 mr-1">
                    <span
                        className={cn(
                            'size-1.5 rounded-full',
                            loading ? 'bg-v-orange animate-pulse' : 'bg-v-green',
                        )}
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Gas:</span>
                </div>

                {loading && !liveRates ? (
                    <div className="size-4 border-2 border-v-cyan border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        {/* Tier pills */}
                        {TIERS.map((tier) => {
                            const rate = liveRates ? liveRates[tier.key] : '—';
                            const isActive = selectedTier === tier.key;
                            const Icon = tier.icon;

                            return (
                                <button
                                    key={tier.key}
                                    type="button"
                                    onClick={(): void => handleTierClick(tier.key)}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-all whitespace-nowrap',
                                        isActive
                                            ? `${tier.activeBorder} ${tier.activeBg} ${tier.color} font-semibold`
                                            : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80',
                                    )}
                                >
                                    <Icon className={cn('size-3', isActive ? tier.color : 'text-muted-foreground/60')} />
                                    <span className="font-mono">{rate}</span>
                                </button>
                            );
                        })}

                        {/* Custom pill / inline input */}
                        {showCustom || selectedTier === 'custom' ? (
                            <div className="inline-flex items-center gap-1 rounded-full border border-v-purple/40 bg-v-purple/5 px-2 py-0.5">
                                <Pencil className="size-3 text-v-purple" />
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={customValue}
                                    onChange={(e): void => handleCustomChange(e.target.value)}
                                    placeholder="sat/vB"
                                    className="w-14 bg-transparent text-[11px] font-mono text-foreground outline-none placeholder:text-muted-foreground/40"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCustomToggle}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-border/80 transition-all whitespace-nowrap"
                            >
                                <Pencil className="size-3 text-muted-foreground/50" />
                                Custom
                            </button>
                        )}
                    </>
                )}

                {/* Inline error */}
                {customError ? (
                    <span className="text-[10px] text-v-red">{customError}</span>
                ) : null}
            </div>
        );
    }

    /* ── Full mode (for dialogs) ─────────────────────────────── */
    return (
        <div className="space-y-3">
            {/* Header with live indicator */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                    Bitcoin network fee
                </span>
                <div className="flex items-center gap-1.5">
                    <span
                        className={cn(
                            'size-1.5 rounded-full',
                            loading ? 'bg-v-orange animate-pulse' : 'bg-v-green',
                        )}
                    />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {loading ? 'Fetching…' : 'Live rates'}
                    </span>
                </div>
            </div>

            {/* Tier buttons */}
            {loading && !liveRates ? (
                <div className="flex items-center justify-center py-6">
                    <div className="size-5 border-2 border-v-cyan border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2">
                        {TIERS.map((tier) => {
                            const rate = liveRates ? liveRates[tier.key] : '—';
                            const isActive = selectedTier === tier.key;
                            const Icon = tier.icon;

                            return (
                                <motion.button
                                    key={tier.key}
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={(): void => handleTierClick(tier.key)}
                                    className={cn(
                                        'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition-all',
                                        isActive
                                            ? `${tier.activeBorder} ${tier.activeBg} ${tier.color}`
                                            : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80',
                                    )}
                                >
                                    <Icon className={cn('size-4', isActive ? tier.color : 'text-muted-foreground/60')} />
                                    <span className="font-medium text-[11px]">{tier.label}</span>
                                    <span className={cn('font-mono font-semibold text-sm', isActive && tier.color)}>
                                        {rate}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/60">
                                        sat/vB
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Custom input */}
                    <div
                        className={cn(
                            'rounded-xl border px-3 py-2.5 transition-all',
                            selectedTier === 'custom'
                                ? 'border-v-purple/40 bg-v-purple/5'
                                : 'border-border bg-muted/20',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(): void => setSelectedTier('custom')}
                                className="flex items-center gap-1.5 shrink-0"
                            >
                                <Pencil className={cn('size-3.5', selectedTier === 'custom' ? 'text-v-purple' : 'text-muted-foreground/50')} />
                                <span className={cn('text-xs font-medium', selectedTier === 'custom' ? 'text-foreground' : 'text-muted-foreground')}>
                                    Custom
                                </span>
                            </button>
                            <div className="flex-1 relative">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={customValue}
                                    onChange={(e): void => handleCustomChange(e.target.value)}
                                    onFocus={(): void => setSelectedTier('custom')}
                                    placeholder="e.g. 25"
                                    className="h-7 text-xs font-mono pr-14"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 pointer-events-none">
                                    sat/vB
                                </span>
                            </div>
                        </div>
                        <AnimatePresence>
                            {customError ? (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-[11px] text-v-red mt-1 ml-8"
                                >
                                    {customError}
                                </motion.p>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </div>
    );
}
