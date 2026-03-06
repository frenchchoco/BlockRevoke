import type { ReactElement } from 'react';
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
import type { Approval } from '../types/approval';
import { formatAllowance, shortenAddress, formatSats } from '../lib/formatters';
import { DEV_FEE_SATS } from '../config/constants';
import { Loader2, AlertTriangle } from 'lucide-react';

interface RevokeConfirmDialogProps {
    readonly approval: Approval | null;
    readonly onConfirm: () => void;
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

    return (
        <Dialog open={isOpen} onOpenChange={(open): void => { if (!open) onCancel(); }}>
            <DialogContent showCloseButton={!isLoading}>
                <DialogHeader>
                    <DialogTitle>Confirm Revoke</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to revoke this approval?
                    </DialogDescription>
                </DialogHeader>

                {approval ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Token</span>
                                <span className="font-medium text-foreground">
                                    {approval.tokenName} ({approval.tokenSymbol})
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Spender</span>
                                <span className="font-medium text-foreground">
                                    {approval.spenderLabel ?? shortenAddress(approval.spenderAddress)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Current Allowance</span>
                                <span className="font-medium text-foreground">
                                    {formatAllowance(approval.allowance, approval.tokenDecimals)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Risk Level</span>
                                <RiskBadge level={approval.riskScore} />
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/50 p-3">
                            <div className="flex items-center gap-2 text-sm text-amber-400">
                                <AlertTriangle className="size-4 shrink-0" />
                                <span>Fee: {formatSats(DEV_FEE_SATS)}</span>
                            </div>
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
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Revoking...
                            </>
                        ) : (
                            'Revoke Approval'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
