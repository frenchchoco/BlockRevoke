import type { ReactElement } from 'react';
import { ShieldCheck, Wallet, Loader2 } from 'lucide-react';

type EmptyVariant = 'disconnected' | 'loading' | 'empty';

interface EmptyStateProps {
    readonly variant: EmptyVariant;
}

export function EmptyState({ variant }: EmptyStateProps): ReactElement {
    if (variant === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <Loader2 className="size-10 animate-spin mb-4" />
                <p className="text-sm">Scanning for approvals...</p>
            </div>
        );
    }

    if (variant === 'disconnected') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <Wallet className="size-10 mb-4" />
                <p className="text-sm">Connect your wallet to scan for token approvals</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <ShieldCheck className="size-10 mb-4 text-green-500" />
            <p className="text-sm">No active approvals found. Your tokens are safe!</p>
        </div>
    );
}
