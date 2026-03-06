import { type ReactElement, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { Approval, BatchRevokeItem } from '../types/approval';
import type { BatchRevokeState } from '../hooks/useBatchRevoke';
import { formatSats } from '../lib/formatters';
import { DEV_FEE_SATS } from '../config/constants';
import { FeeSelector } from './FeeSelector';
import { useNetworkStore } from '../stores/networkStore';
import { fetchLiveFeeRates, type LiveFeeRates } from '../services/gasService';
import { Loader2, Check, X, Circle, Zap, Shield, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchActionsProps {
    readonly selectedApprovals: Approval[];
    readonly onExecute: (feeRate?: number) => void;
    readonly onCancel: () => void;
    readonly batchState: BatchRevokeState | null;
}

function StatusIcon({ status }: { readonly status: BatchRevokeItem['status'] }): ReactElement {
    switch (status) {
        case 'pending':
            return <Circle className="size-4 text-muted-foreground" />;
        case 'signing':
            return <Loader2 className="size-4 text-v-cyan animate-spin" />;
        case 'success':
            return <Check className="size-4 text-v-green" />;
        case 'failed':
            return <X className="size-4 text-v-red" />;
    }
}

export function BatchActions({
    selectedApprovals,
    onExecute,
    onCancel,
    batchState,
}: BatchActionsProps): ReactElement {
    const count = selectedApprovals.length;
    const networkId = useNetworkStore((s) => s.networkId);

    const [liveRates, setLiveRates] = useState<LiveFeeRates | null>(null);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [selectedFeeRate, setSelectedFeeRate] = useState<number | undefined>(undefined);

    // Fetch live rates when batch bar appears
    useEffect(() => {
        if (count === 0) return;
        setRatesLoading(true);
        void fetchLiveFeeRates(networkId).then((rates) => {
            setLiveRates(rates);
            setRatesLoading(false);
        });
    }, [count > 0, networkId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFeeChange = useCallback((rate: number): void => {
        setSelectedFeeRate(rate);
    }, []);

    const handleExecute = useCallback((): void => {
        onExecute(selectedFeeRate);
    }, [onExecute, selectedFeeRate]);

    if (count === 0) {
        return <div className="hidden" />;
    }

    const isRunning = batchState?.isRunning === true;

    /* ── Running state ───────────────────────────────────────── */
    if (isRunning && batchState) {
        const progressPercent = batchState.totalCount > 0
            ? Math.round((batchState.completedCount / batchState.totalCount) * 100)
            : 0;

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="fixed bottom-0 left-0 right-0 z-50"
                >
                    {/* Animated gradient top border */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-v-cyan via-v-purple to-v-red animate-[gradient-shift_3s_linear_infinite] bg-[length:200%_100%]" />

                    <div className="bg-card/95 backdrop-blur-xl border-t border-white/5">
                        <div className="container mx-auto max-w-6xl px-4 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Loader2 className="size-4 text-v-cyan" />
                                    </motion.div>
                                    <span className="text-sm font-medium text-foreground">
                                        Revoking{' '}
                                        <span className="text-v-cyan font-mono">
                                            {batchState.completedCount}/{batchState.totalCount}
                                        </span>
                                    </span>
                                </div>
                                <Button variant="outline" size="sm" onClick={onCancel}>
                                    Cancel
                                </Button>
                            </div>

                            <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-v-cyan to-v-blue"
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                                {/* Shimmer overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {batchState.items.map((item) => (
                                    <motion.div
                                        key={item.approvalId}
                                        layout
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
                                            item.status === 'success' && 'border-v-green/20 bg-v-green/10 text-v-green',
                                            item.status === 'failed' && 'border-v-red/20 bg-v-red/10 text-v-red',
                                            item.status === 'signing' && 'border-v-cyan/20 bg-v-cyan/10 text-v-cyan',
                                            item.status === 'pending' && 'border-border bg-muted text-muted-foreground',
                                        )}
                                    >
                                        <StatusIcon status={item.status} />
                                        <span className="max-w-[120px] truncate font-mono">
                                            {item.approvalId}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    /* ── Selection state ─────────────────────────────────────── */
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50"
            >
                {/* Animated gradient top border */}
                <motion.div
                    className="h-[2px] w-full"
                    style={{
                        background: 'linear-gradient(90deg, var(--v-cyan), var(--v-purple), var(--v-red), var(--v-cyan))',
                        backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                {/* Glow effect behind the bar */}
                <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-v-cyan/8 to-transparent pointer-events-none" />

                <div className="relative bg-card/95 backdrop-blur-xl border-t border-white/[0.06]">
                    {/* Subtle gradient mesh background */}
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                        <div className="absolute top-0 left-1/4 w-32 h-full bg-v-cyan blur-3xl" />
                        <div className="absolute top-0 right-1/4 w-32 h-full bg-v-purple blur-3xl" />
                    </div>

                    <div className="relative container mx-auto max-w-6xl px-4 py-2.5 space-y-2">
                        {/* Row 1: count badge + fee pills + CTA button */}
                        <div className="flex items-center justify-between gap-3">
                            {/* Count badge with icon */}
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="relative">
                                    <Shield className="size-4 text-v-red" />
                                    <motion.div
                                        className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-v-red"
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </div>
                                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                                    <span className="text-v-cyan font-mono tabular-nums">{count}</span>
                                    <span className="text-muted-foreground font-normal ml-1 hidden sm:inline">selected</span>
                                </span>
                            </div>

                            {/* Fee selector pills */}
                            <div className="flex-1 min-w-0">
                                <FeeSelector
                                    liveRates={liveRates}
                                    loading={ratesLoading}
                                    onChange={handleFeeChange}
                                    compact
                                />
                            </div>

                            {/* CTA Button with glow */}
                            <motion.div
                                className="shrink-0"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Button
                                    onClick={handleExecute}
                                    size="sm"
                                    className="relative gap-1.5 bg-gradient-to-r from-v-red to-v-orange text-white border-0 shadow-lg shadow-v-red/20 hover:shadow-v-red/30 hover:brightness-110 transition-all font-semibold"
                                >
                                    <Flame className="size-3.5" />
                                    Revoke All
                                </Button>
                            </motion.div>
                        </div>

                        {/* Row 2: fee info with subtle styling */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                            <Zap className="size-3 text-v-orange/60 shrink-0" />
                            <span>
                                Dev fee: <span className="font-mono text-v-orange/80">{formatSats(DEV_FEE_SATS)}</span> total
                                {' '}for {count} revoke{count !== 1 ? 's' : ''} · Network gas per tx
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
