import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { NetworkSwitch } from './NetworkSwitch';
import { WalletButton } from './WalletButton';
import { ThemeToggle } from './ThemeToggle';

export function Header(): ReactElement {
    return (
        <motion.header
            className="sticky top-0 z-40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            <div className="container mx-auto flex items-center justify-between px-4 py-3 max-w-6xl">
                <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
                    <Logo className="size-8" />
                    <span className="font-display text-lg font-bold tracking-tight text-foreground">
                        BlockRevoke
                    </span>
                </motion.div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <NetworkSwitch />
                    <WalletButton />
                </div>
            </div>

            {/* ── Animated gradient ribbon ── */}
            <div className="relative h-[2px] w-full overflow-hidden">
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(90deg, var(--v-cyan), var(--v-blue), var(--v-purple), var(--v-red), var(--v-orange), var(--v-cyan))',
                        backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2.5s_infinite]" />
            </div>
        </motion.header>
    );
}
