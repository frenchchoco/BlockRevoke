import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Approval, BatchRevokeItem } from '../types/approval';
import type { BatchRevokeState } from '../hooks/useBatchRevoke';
import { formatSats } from '../lib/formatters';
import { DEV_FEE_SATS } from '../config/constants';
import { Loader2, Check, X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchActionsProps {
    readonly selectedApprovals: Approval[];
    readonly onExecute: () => void;
    readonly onCancel: () => void;
    readonly batchState: BatchRevokeState | null;
}

function StatusIcon({ status }: { readonly status: BatchRevokeItem['status'] }): ReactElement {
    switch (status) {
        case 'pending':
            return <Circle className="size-4 text-muted-foreground" />;
        case 'signing':
            return <Loader2 className="size-4 text-blue-400 animate-spin" />;
        case 'success':
            return <Check className="size-4 text-green-400" />;
        case 'failed':
            return <X className="size-4 text-red-400" />;
    }
}

function getStatusLabel(status: BatchRevokeItem['status']): string {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'signing':
            return 'Signing...';
        case 'success':
            return 'Success';
        case 'failed':
            return 'Failed';
    }
}

export function BatchActions({
    selectedApprovals,
    onExecute,
    onCancel,
    batchState,
}: BatchActionsProps): ReactElement {
    const count = selectedApprovals.length;

    if (count === 0) {
        return <div className="hidden" />;
    }

    const isRunning = batchState?.isRunning === true;
    const totalFee = DEV_FEE_SATS * BigInt(count);

    if (isRunning && batchState) {
        const progressPercent = batchState.totalCount > 0
            ? Math.round((batchState.completedCount / batchState.totalCount) * 100)
            : 0;

        const currentItem = batchState.items.find((item) => item.status === 'signing');

        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto max-w-6xl px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground">
                                Progress: {batchState.completedCount}/{batchState.totalCount}
                            </span>
                            {currentItem ? (
                                <span className="text-sm text-muted-foreground">
                                    Current: {getStatusLabel(currentItem.status)}
                                </span>
                            ) : null}
                        </div>
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                    </div>

                    <Progress value={progressPercent} />

                    <div className="flex flex-wrap gap-2">
                        {batchState.items.map((item) => (
                            <div
                                key={item.approvalId}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                                    item.status === 'success' && 'border-green-500/20 bg-green-500/10 text-green-400',
                                    item.status === 'failed' && 'border-red-500/20 bg-red-500/10 text-red-400',
                                    item.status === 'signing' && 'border-blue-500/20 bg-blue-500/10 text-blue-400',
                                    item.status === 'pending' && 'border-border bg-muted text-muted-foreground',
                                )}
                            >
                                <StatusIcon status={item.status} />
                                <span className="max-w-[120px] truncate">
                                    {item.approvalId}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="container mx-auto max-w-6xl px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground">
                            {count} approval{count !== 1 ? 's' : ''} selected
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Total fee: {formatSats(totalFee)}
                        </span>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={onExecute}
                    >
                        Revoke All
                    </Button>
                </div>
            </div>
        </div>
    );
}
