import { type ReactElement, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './RiskBadge';
import { FeeExplainer } from './FeeExplainer';
import { FeeSelector } from './FeeSelector';
import type { Approval } from '../types/approval';
import { formatAllowance, displayAddress } from '../lib/formatters';
import { useNetworkStore } from '../stores/networkStore';
import { fetchLiveFeeRates, type LiveFeeRates } from '../services/gasService';
import { Loader2, Zap } from 'lucide-react';

interface RevokeConfirmDialogProps {
    readonly approval: Approval | null;
    readonly onConfirm: (feeRate?: number) => void;
    readonly onCancel: () => void;
    readonly isLoading: boolean;
    readonly error: string | null;
}

export function RevokeConfirmDialog({
    approval,
    onConfirm,
    onCancel,
    isLoading,
    error,
}: RevokeConfirmDialogProps): ReactElement {
    const isOpen = approval !== null;
    const networkId = useNetworkStore((s) => s.networkId);

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

    const handleConfirm = useCallback((): void => {
        onConfirm(selectedFeeRate);
    }, [onConfirm, selectedFeeRate]);

    return (
        <Dialog open={isOpen} onOpenChange={(open): void => { if (!open) onCancel(); }}>
            <DialogContent showCloseButton={!isLoading} className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display">
                        <Zap className="size-5 text-v-red" />
                        Confirm Revoke
                    </DialogTitle>
                    <DialogDescription>
                        This will set the approval to zero, preventing the spender from accessing your tokens.
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
                                <span className={`font-medium ${approval.isUnlimited ? 'text-v-red' : 'text-foreground'}`}>
                                    {formatAllowance(approval.allowance, approval.tokenDecimals)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Risk Level</span>
                                <RiskBadge level={approval.riskScore} />
                            </div>
                        </div>

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
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Revoking...
                            </>
                        ) : (
                            <>
                                <Zap className="size-4" />
                                Revoke Approval
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
