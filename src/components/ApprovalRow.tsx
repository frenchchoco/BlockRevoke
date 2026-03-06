import type { ReactElement } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './RiskBadge';
import type { Approval } from '../types/approval';
import { formatAllowance, shortenAddress } from '../lib/formatters';

interface ApprovalRowProps {
    readonly approval: Approval;
    readonly isSelected: boolean;
    readonly onSelectToggle: (id: string) => void;
    readonly onRevoke: (approval: Approval) => void;
    readonly onEdit: (approval: Approval) => void;
}

export function ApprovalRow({
    approval,
    isSelected,
    onSelectToggle,
    onRevoke,
    onEdit,
}: ApprovalRowProps): ReactElement {
    return (
        <TableRow>
            <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(): void => onSelectToggle(approval.id)}
                />
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                        {approval.tokenName} ({approval.tokenSymbol})
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {shortenAddress(approval.tokenAddress)}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    {approval.spenderLabel ? (
                        <span className="font-medium text-foreground">{approval.spenderLabel}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                        {shortenAddress(approval.spenderAddress)}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <span className={approval.isUnlimited ? 'text-red-500 font-medium' : ''}>
                    {formatAllowance(approval.allowance, approval.tokenDecimals)}
                </span>
            </TableCell>
            <TableCell>
                <RiskBadge level={approval.riskScore} />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Button
                        variant="destructive"
                        size="xs"
                        onClick={(): void => onRevoke(approval)}
                    >
                        Revoke
                    </Button>
                    <Button variant="outline" size="xs" onClick={(): void => onEdit(approval)}>
                        Edit
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
