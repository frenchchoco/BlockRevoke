import { type ReactElement, useState, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ApprovalRow } from './ApprovalRow';
import { EmptyState } from './EmptyState';
import type { Approval } from '../types/approval';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalTableProps {
    readonly approvals: Approval[];
    readonly selectedIds: Set<string>;
    readonly onSelectToggle: (id: string) => void;
    readonly onSelectAll: () => void;
    readonly onRevoke: (approval: Approval) => void;
    readonly onEdit: (approval: Approval) => void;
    readonly isLoading: boolean;
    readonly isConnected: boolean;
}

type SortField = 'token' | 'risk' | 'allowance';
type SortDirection = 'asc' | 'desc';

const RISK_ORDER: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

export function ApprovalTable({
    approvals,
    selectedIds,
    onSelectToggle,
    onSelectAll,
    onRevoke,
    onEdit,
    isLoading,
    isConnected,
}: ApprovalTableProps): ReactElement {
    const [sortField, setSortField] = useState<SortField>('risk');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSort = useCallback(
        (field: SortField): void => {
            if (sortField === field) {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortField(field);
                setSortDirection('asc');
            }
        },
        [sortField],
    );

    const sortedApprovals = useMemo((): Approval[] => {
        const sorted = [...approvals];
        const dir = sortDirection === 'asc' ? 1 : -1;

        sorted.sort((a, b): number => {
            switch (sortField) {
                case 'token':
                    return a.tokenName.localeCompare(b.tokenName) * dir;
                case 'risk': {
                    const aOrder = RISK_ORDER[a.riskScore] ?? 4;
                    const bOrder = RISK_ORDER[b.riskScore] ?? 4;
                    return (aOrder - bOrder) * dir;
                }
                case 'allowance': {
                    if (a.allowance < b.allowance) return -1 * dir;
                    if (a.allowance > b.allowance) return 1 * dir;
                    return 0;
                }
                default:
                    return 0;
            }
        });

        return sorted;
    }, [approvals, sortField, sortDirection]);

    if (!isConnected) {
        return <EmptyState variant="disconnected" />;
    }

    if (isLoading) {
        return <EmptyState variant="loading" />;
    }

    if (approvals.length === 0) {
        return <EmptyState variant="empty" />;
    }

    const allSelected = approvals.length > 0 && selectedIds.size === approvals.length;

    return (
        <div className="surface-elevated overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">
                            <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
                        </TableHead>
                        <TableHead>
                            <button
                                type="button"
                                className={cn(
                                    'flex items-center gap-1 hover:text-foreground transition-colors',
                                    sortField === 'token' && 'text-foreground',
                                )}
                                onClick={(): void => handleSort('token')}
                            >
                                Token
                                <ArrowUpDown className="size-3" />
                            </button>
                        </TableHead>
                        <TableHead>Spender</TableHead>
                        <TableHead>
                            <button
                                type="button"
                                className={cn(
                                    'flex items-center gap-1 hover:text-foreground transition-colors',
                                    sortField === 'allowance' && 'text-foreground',
                                )}
                                onClick={(): void => handleSort('allowance')}
                            >
                                Allowance
                                <ArrowUpDown className="size-3" />
                            </button>
                        </TableHead>
                        <TableHead>
                            <button
                                type="button"
                                className={cn(
                                    'flex items-center gap-1 hover:text-foreground transition-colors',
                                    sortField === 'risk' && 'text-foreground',
                                )}
                                onClick={(): void => handleSort('risk')}
                            >
                                Risk
                                <ArrowUpDown className="size-3" />
                            </button>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <AnimatePresence mode="popLayout">
                        {sortedApprovals.map((approval, index) => (
                            <ApprovalRow
                                key={approval.id}
                                approval={approval}
                                isSelected={selectedIds.has(approval.id)}
                                onSelectToggle={onSelectToggle}
                                onRevoke={onRevoke}
                                onEdit={onEdit}
                                index={index}
                            />
                        ))}
                    </AnimatePresence>
                </TableBody>
            </Table>
        </div>
    );
}
