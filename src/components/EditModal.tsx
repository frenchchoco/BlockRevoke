import { type ReactElement, useState, useMemo, useCallback } from 'react';
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
import type { Approval } from '../types/approval';
import { formatAllowance, shortenAddress, formatSats } from '../lib/formatters';
import { calculateRiskScore } from '../lib/riskScoring';
import { Loader2, AlertTriangle } from 'lucide-react';

interface EditModalProps {
    readonly approval: Approval | null;
    readonly onSave: (newAllowance: bigint) => void;
    readonly onCancel: () => void;
    readonly isLoading: boolean;
    readonly error: string | null;
    readonly feeRequired: boolean;
    readonly feeSats: bigint;
}

export function EditModal({
    approval,
    onSave,
    onCancel,
    isLoading,
    error,
    feeRequired,
    feeSats,
}: EditModalProps): ReactElement {
    const isOpen = approval !== null;
    const [inputValue, setInputValue] = useState('');

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
        onSave(parsedAllowance);
    }, [parsedAllowance, onSave]);

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
            <DialogContent showCloseButton={!isLoading}>
                <DialogHeader>
                    <DialogTitle>Edit Allowance</DialogTitle>
                    <DialogDescription>
                        Set a new allowance for this approval.
                    </DialogDescription>
                </DialogHeader>

                {approval ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">Token</span>
                                <span className="font-medium text-zinc-100">
                                    {approval.tokenName} ({approval.tokenSymbol})
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">Spender</span>
                                <span className="font-medium text-zinc-100">
                                    {approval.spenderLabel ?? shortenAddress(approval.spenderAddress)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">Current Allowance</span>
                                <span className="font-medium text-zinc-100">
                                    {formatAllowance(approval.allowance, approval.tokenDecimals)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="new-allowance" className="text-sm font-medium text-zinc-300">
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
                            />
                            {inputValue.trim() !== '' && parsedAllowance === null ? (
                                <p className="text-xs text-red-400">Invalid number</p>
                            ) : null}
                        </div>

                        {previewRisk ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400">New risk level:</span>
                                <RiskBadge level={previewRisk} />
                            </div>
                        ) : null}

                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                            {feeRequired ? (
                                <div className="flex items-center gap-2 text-sm text-amber-400">
                                    <AlertTriangle className="size-4 shrink-0" />
                                    <span>This will cost {formatSats(feeSats)}</span>
                                </div>
                            ) : (
                                <p className="text-sm text-green-400">Free action</p>
                            )}
                        </div>

                        {error ? (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
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
