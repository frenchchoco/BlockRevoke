import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './RiskBadge';
import type { Approval } from '../types/approval';
import { formatAllowance, displayAddress } from '../lib/formatters';
import { useNetworkStore } from '../stores/networkStore';
import { usePendingActionsStore } from '../stores/pendingActionsStore';
import { Trash2, Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalRowProps {
    readonly approval: Approval;
    readonly isSelected: boolean;
    readonly onSelectToggle: (id: string) => void;
    readonly onRevoke: (approval: Approval) => void;
    readonly onEdit: (approval: Approval) => void;
    readonly index: number;
}

export function ApprovalRow({ approval, isSelected, onSelectToggle, onRevoke, onEdit, index }: ApprovalRowProps): ReactElement {
    const networkId = useNetworkStore((s) => s.networkId);
    const pendingAction = usePendingActionsStore((s) => s.actions.get(approval.id));
    const isPending = pendingAction !== undefined;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12, transition: { duration: 0.2 } }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
            className={cn(
                'group border-b border-border transition-colors',
                isPending
                    ? 'bg-v-cyan/5 animate-pulse'
                    : 'hover:bg-accent/50',
            )}
        >
            <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(): void => onSelectToggle(approval.id)}
                    disabled={isPending}
                />
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-0.5">
                    <span className={cn('font-medium text-sm', isPending ? 'text-muted-foreground' : 'text-foreground')}>
                        {approval.tokenName} ({approval.tokenSymbol})
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{displayAddress(approval.tokenAddress, networkId)}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-0.5">
                    {approval.spenderLabel ? (
                        <span className={cn('font-medium text-sm', isPending ? 'text-muted-foreground' : 'text-foreground')}>
                            {approval.spenderLabel}
                        </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground font-mono">{displayAddress(approval.spenderAddress, networkId)}</span>
                </div>
            </TableCell>
            <TableCell>
                <span className={cn(
                    approval.isUnlimited ? 'text-v-red font-semibold' : 'text-foreground font-mono text-sm',
                    isPending && 'opacity-50',
                )}>
                    {formatAllowance(approval.allowance, approval.tokenDecimals)}
                </span>
            </TableCell>
            <TableCell>
                {isPending ? (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        pendingAction.type === 'revoking'
                            ? 'text-v-orange bg-v-orange/10 border-v-orange/25'
                            : 'text-v-cyan bg-v-cyan/10 border-v-cyan/25',
                    )}>
                        <Loader2 className="size-3 animate-spin" />
                        {pendingAction.type === 'revoking' ? 'Revoking…' : 'Editing…'}
                    </span>
                ) : (
                    <RiskBadge level={approval.riskScore} />
                )}
            </TableCell>
            <TableCell>
                <div className={cn(
                    'flex items-center gap-1.5 transition-opacity',
                    isPending ? 'opacity-30 pointer-events-none' : 'opacity-60 group-hover:opacity-100',
                )}>
                    <Button
                        variant="destructive"
                        size="xs"
                        onClick={(): void => onRevoke(approval)}
                        disabled={isPending}
                        className="gap-1"
                    >
                        <Trash2 className="size-3" />Revoke
                    </Button>
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={(): void => onEdit(approval)}
                        disabled={isPending}
                        className="gap-1"
                    >
                        <Pencil className="size-3" />Edit
                    </Button>
                </div>
            </TableCell>
        </motion.tr>
    );
}
