import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, Loader2 } from 'lucide-react';

type EmptyVariant = 'disconnected' | 'loading' | 'empty';

interface EmptyStateProps {
    readonly variant: EmptyVariant;
}

export function EmptyState({ variant }: EmptyStateProps): ReactElement {
    if (variant === 'loading') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
                <div className="relative mb-6">
                    <motion.div
                        className="absolute -inset-2 rounded-full border-2 border-v-cyan/20 border-t-v-cyan"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <Loader2 className="size-10 text-v-cyan animate-spin" />
                </div>
                <p className="font-display text-base font-semibold text-foreground mb-1">Scanning blockchain</p>
                <p className="text-sm text-muted-foreground">Analyzing blocks for token approvals...</p>
            </motion.div>
        );
    }

    if (variant === 'disconnected') {
        return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-24">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-6">
                    <Wallet className="size-8 text-muted-foreground" />
                </div>
                <p className="font-display text-base font-semibold text-foreground mb-1">Connect your wallet</p>
                <p className="text-sm text-muted-foreground max-w-xs text-center">
                    Connect a Bitcoin wallet to scan for risky token approvals and protect your assets
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="flex items-center justify-center size-16 rounded-2xl bg-v-green/10 mb-6"
            >
                <ShieldCheck className="size-8 text-v-green" />
            </motion.div>
            <p className="font-display text-base font-semibold text-foreground mb-1">All clear</p>
            <p className="text-sm text-muted-foreground">No risky approvals found — your tokens are secure</p>
        </motion.div>
    );
}
