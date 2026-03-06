import { type ReactElement } from 'react';
import { Info } from 'lucide-react';
import { formatSats } from '../lib/formatters';
import { DEV_FEE_SATS } from '../config/constants';

interface FeeExplainerProps {
    /** 'single' for individual revoke/edit, 'batch' for multi-revoke */
    readonly mode: 'single' | 'batch';
    /** Number of approvals in the batch (only used in batch mode) */
    readonly count?: number;
}

export function FeeExplainer({ mode, count }: FeeExplainerProps): ReactElement {
    return (
        <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Info className="size-4 text-v-cyan shrink-0" />
                How fees work
            </div>

            <div className="space-y-2 text-xs text-muted-foreground pl-6">
                {/* Dev fee line */}
                <div className="flex items-center justify-between gap-4">
                    <span>Dev fee <span className="text-muted-foreground/50">(supports this free tool)</span></span>
                    <span className="font-mono font-medium text-v-orange shrink-0">
                        {formatSats(DEV_FEE_SATS)}
                    </span>
                </div>

                {/* Network fee line */}
                <div className="flex items-center justify-between gap-4">
                    <span>Bitcoin network fee</span>
                    <span className="font-mono text-muted-foreground/60 shrink-0">
                        varies
                    </span>
                </div>

                {/* Batch benefit callout */}
                {mode === 'batch' && count !== undefined && count > 1 ? (
                    <div className="pt-2 mt-1 border-t border-border/50 space-y-1">
                        <p className="text-v-green font-medium">
                            Dev fee is charged only once for all {count} revokes.
                        </p>
                        <p className="text-muted-foreground/60">
                            You pay {formatSats(DEV_FEE_SATS)} total — not {formatSats(DEV_FEE_SATS * BigInt(count))}.
                            Bitcoin network fees still apply per transaction.
                        </p>
                    </div>
                ) : (
                    <p className="text-muted-foreground/50 pt-1 border-t border-border/50 mt-1">
                        The dev fee keeps BlockRevoke free &amp; open-source.
                        Bitcoin network fees are set by the network, not by us.
                    </p>
                )}
            </div>
        </div>
    );
}
