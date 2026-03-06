import { type ReactElement, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { useApprovalStore } from '../stores/approvalStore';
import { useNetworkStore } from '../stores/networkStore';
import { displayAddress, shortenAddress, formatAllowance } from '../lib/formatters';
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
    readonly index: number;
}

function HistoryRow({ entry, approval, index }: HistoryRowProps): ReactElement {
    const networkId = useNetworkStore((s) => s.networkId);
    const increased = entry.newAllowance > entry.previousAllowance;
    const tokenLabel =
        approval !== undefined
            ? `${approval.tokenName} (${approval.tokenSymbol})`
            : displayAddress(entry.tokenAddress, networkId);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="flex items-start gap-3 rounded-xl surface p-4 hover:scale-[1.01] transition-transform"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: index * 0.05 + 0.1 }}
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                    increased
                        ? 'bg-v-orange/10 text-v-orange'
                        : 'bg-v-green/10 text-v-green'
                }`}
            >
                {increased ? (
                    <ArrowUp className="size-4" />
                ) : (
                    <ArrowDown className="size-4" />
                )}
            </motion.div>

            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {tokenLabel}
                    </span>
                    <span
                        className={`text-xs font-semibold ${
                            increased ? 'text-v-orange' : 'text-v-green'
                        }`}
                    >
                        {increased ? 'Increased' : 'Decreased'}
                    </span>
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                    <AllowanceLabel value={entry.previousAllowance} approval={approval} />
                    <span className="mx-1.5 text-v-cyan">{'→'}</span>
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
        </motion.div>
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
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-muted-foreground"
            >
                <motion.div
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 4, repeat: Infinity }}
                >
                    <Clock className="mb-4 size-12 text-muted-foreground/40" />
                </motion.div>
                <p className="text-sm">No approval history yet.</p>
                <p className="text-xs mt-1 text-muted-foreground/60">
                    Run a scan to discover approval changes.
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-2">
            <AnimatePresence>
                {sorted.map((entry, index) => {
                    const key = `${entry.tokenAddress}-${entry.spenderAddress}`;
                    return (
                        <HistoryRow
                            key={entry.id}
                            entry={entry}
                            approval={approvalMap.get(key)}
                            index={index}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
