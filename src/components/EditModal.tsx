import { type ReactElement, useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BitcoinUtils } from 'opnet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskBadge } from './RiskBadge';
import { FeeExplainer } from './FeeExplainer';
import { FeeSelector } from './FeeSelector';
import type { Approval } from '../types/approval';
import { formatAllowance, displayAddress } from '../lib/formatters';
import { useNetworkStore } from '../stores/networkStore';
import { calculateRiskScore } from '../lib/riskScoring';
import { fetchLiveFeeRates, type LiveFeeRates } from '../services/gasService';
import { Loader2, Pencil } from 'lucide-react';

interface EditModalProps {
    readonly approval: Approval | null;
    readonly onSave: (newAllowance: bigint, feeRate?: number) => void;
    readonly onCancel: () => void;
    readonly isLoading: boolean;
    readonly error: string | null;
}

export function EditModal({
    approval,
    onSave,
    onCancel,
    isLoading,
    error,
}: EditModalProps): ReactElement {
    const isOpen = approval !== null;
    const networkId = useNetworkStore((s) => s.networkId);
    const [inputValue, setInputValue] = useState('');

    const [liveRates, setLiveRates] = useState<LiveFeeRates | null>(null);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [selectedFeeRate, setSelectedFeeRate] = useState<number | undefined>(undefined);

    // Fetch live rates when dialog opens
    useEffect(() => {
        if (!isOpen) {
            setLiveRates(null);
            setSelectedFeeRate(undefined);
            return;
        }
        setRatesLoading(true);
        void fetchLiveFeeRates(networkId).then((rates) => {
            setLiveRates(rates);
            setRatesLoading(false);
        });
    }, [isOpen, networkId]);

    const handleFeeChange = useCallback((rate: number): void => {
        setSelectedFeeRate(rate);
    }, []);

    const parsedAllowance = useMemo((): bigint | null => {
        if (!approval || inputValue.trim() === '') return null;
        try {
            return BitcoinUtils.expandToDecimals(inputValue, approval.tokenDecimals);
        } catch {
            return null;
        }
    }, [inputValue, approval]);

    const previewRisk = useMemo(() => {
        if (!approval || parsedAllowance === null) return null;
        const isKnown = approval.spenderLabel !== null;
        return calculateRiskScore(parsedAllowance, 0n, isKnown);
    }, [parsedAllowance, approval]);

    const handleSave = useCallback((): void => {
        if (parsedAllowance === null) return;
        onSave(parsedAllowance, selectedFeeRate);
    }, [parsedAllowance, onSave, selectedFeeRate]);

    const handleOpenChange = useCallback(
        (open: boolean): void => {
            if (!open) {
                setInputValue('');
                onCancel();
            }
        },
        [onCancel],
    );

    const isValid = parsedAllowance !== null && parsedAllowance >= 0n;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent showCloseButton={!isLoading} className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display">
                        <Pencil className="size-5 text-v-cyan" />
                        Edit Allowance
                    </DialogTitle>
                    <DialogDescription>
                        Set a new allowance for this approval.
                    </DialogDescription>
                </DialogHeader>

                {approval ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Token</span>
                                <span className="font-medium text-foreground">
                                    {approval.tokenName} ({approval.tokenSymbol})
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Spender</span>
                                <span className="font-medium text-foreground font-mono text-sm">
                                    {approval.spenderLabel ?? displayAddress(approval.spenderAddress, networkId)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Current Allowance</span>
                                <span className="font-medium text-foreground">
                                    {formatAllowance(approval.allowance, approval.tokenDecimals)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="new-allowance" className="text-sm font-medium text-foreground">
                                New Allowance
                            </label>
                            <Input
                                id="new-allowance"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={inputValue}
                                onChange={(e): void => setInputValue(e.target.value)}
                                disabled={isLoading}
                                className="font-mono"
                            />
                            {inputValue.trim() !== '' && parsedAllowance === null ? (
                                <p className="text-xs text-v-red">Invalid number</p>
                            ) : null}
                        </div>

                        {previewRisk ? (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-sm text-muted-foreground">New risk level:</span>
                                <RiskBadge level={previewRisk} />
                            </motion.div>
                        ) : null}

                        {/* Fee selector */}
                        <FeeSelector
                            liveRates={liveRates}
                            loading={ratesLoading}
                            onChange={handleFeeChange}
                        />

                        <FeeExplainer mode="single" />

                        {error ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-xl border border-v-red/20 bg-v-red/5 p-3"
                            >
                                <p className="text-sm text-v-red">{error}</p>
                            </motion.div>
                        ) : null}
                    </div>
                ) : null}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={(): void => { setInputValue(''); onCancel(); }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading || !isValid}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
