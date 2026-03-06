import { type ReactElement, useMemo } from 'react';
import { ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { useApprovalStore } from '../stores/approvalStore';
import { shortenAddress, formatAllowance } from '../lib/formatters';
import type { ApprovalHistory, Approval } from '../types/approval';

function AllowanceLabel({
    value,
    approval,
}: {
    readonly value: bigint;
    readonly approval: Approval | undefined;
}): ReactElement {
    const decimals = approval?.tokenDecimals ?? 8;
    return <span>{formatAllowance(value, decimals)}</span>;
}

interface HistoryRowProps {
    readonly entry: ApprovalHistory;
    readonly approval: Approval | undefined;
}

function HistoryRow({ entry, approval }: HistoryRowProps): ReactElement {
    const increased = entry.newAllowance > entry.previousAllowance;
    const tokenLabel =
        approval !== undefined
            ? `${approval.tokenName} (${approval.tokenSymbol})`
            : shortenAddress(entry.tokenAddress);

    return (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
            {/* Direction indicator */}
            <div
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                    increased
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                }`}
            >
                {increased ? (
                    <ArrowUp className="size-4" />
                ) : (
                    <ArrowDown className="size-4" />
                )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {tokenLabel}
                    </span>
                    <span
                        className={`text-xs font-medium ${
                            increased ? 'text-green-400' : 'text-red-400'
                        }`}
                    >
                        {increased ? 'Increased' : 'Decreased'}
                    </span>
                </div>

                <div className="text-xs text-muted-foreground">
                    <AllowanceLabel value={entry.previousAllowance} approval={approval} />
                    <span className="mx-1 text-muted-foreground/60">{'->'}</span>
                    <AllowanceLabel value={entry.newAllowance} approval={approval} />
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Block {entry.blockNumber.toLocaleString()}
                    </span>
                    <span
                        className="font-mono"
                        title={entry.txHash}
                    >
                        {shortenAddress(entry.txHash, 8)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function HistoryTimeline(): ReactElement {
    const history = useApprovalStore((s) => s.history);
    const approvals = useApprovalStore((s) => s.approvals);

    const approvalMap = useMemo((): Map<string, Approval> => {
        const map = new Map<string, Approval>();
        for (const a of approvals) {
            map.set(`${a.tokenAddress}-${a.spenderAddress}`, a);
        }
        return map;
    }, [approvals]);

    const sorted = useMemo(
        (): ApprovalHistory[] =>
            [...history].sort((a, b) => b.blockNumber - a.blockNumber),
        [history],
    );

    if (sorted.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="mb-3 size-10 text-muted-foreground/60" />
                <p className="text-sm">No approval history yet.</p>
                <p className="text-xs">
                    Run a scan to discover approval changes.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {sorted.map((entry) => {
                const key = `${entry.tokenAddress}-${entry.spenderAddress}`;
                return (
                    <HistoryRow
                        key={entry.id}
                        entry={entry}
                        approval={approvalMap.get(key)}
                    />
                );
            })}
        </div>
    );
}
