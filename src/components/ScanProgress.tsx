import { type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RefreshCw, Radar, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { useScan } from '../hooks/useScan';
import { useApprovals } from '../hooks/useApprovals';

function ScanPulse(): ReactElement {
    return (
        <div className="relative flex items-center justify-center size-10">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-v-cyan/50"
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
                />
            ))}
            <Radar className="size-5 text-v-cyan" />
        </div>
    );
}

function VerifyPulse(): ReactElement {
    return (
        <div className="relative flex items-center justify-center size-10">
            {[0, 1].map((i) => (
                <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-v-purple/50"
                    initial={{ scale: 0.6, opacity: 0.7 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
                />
            ))}
            <ShieldCheck className="size-5 text-v-purple" />
        </div>
    );
}

export function ScanProgress(): ReactElement {
    const {
        isScanning,
        phase,
        currentBlock,
        latestBlock,
        lastScannedBlock,
        progress,
        discoveredCount,
        verifiedCount,
        startScan,
        stopScan,
    } = useScan();
    const { isRefreshing, refresh } = useApprovals();

    if (!isScanning && lastScannedBlock === 0 && currentBlock === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated mb-6">
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Radar className="size-5" />
                        <span>Scan the blockchain to discover your token approvals</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
                            {isRefreshing ? (
                                <Loader2 className="mr-1.5 size-3 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1.5 size-3" />
                            )}
                            Refresh
                        </Button>
                        <Button size="sm" onClick={startScan}>
                            <Play className="mr-1.5 size-3" />
                            Full Scan
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    }

    /* ── Scanning phase ──────────────────────────────────── */
    if (isScanning && phase === 'scanning') {
        return (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="surface-elevated mb-6 overflow-hidden gradient-border"
            >
                <div className="relative px-5 py-4 space-y-3 bg-card rounded-[inherit]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ScanPulse />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    <span className="text-v-cyan">Phase 1</span>
                                    {' · '}Block <span className="font-mono text-v-cyan">{currentBlock.toLocaleString()}</span>
                                    <span className="text-muted-foreground"> / {latestBlock.toLocaleString()}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Scanning blocks for approval events · {progress}%
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={stopScan}>
                            <Square className="mr-1 size-3" />
                            Stop
                        </Button>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-v-cyan to-v-blue"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            </motion.div>
        );
    }

    /* ── Verifying phase ──────────────────────────────────── */
    if (isScanning && phase === 'verifying') {
        return (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="surface-elevated mb-6 overflow-hidden gradient-border"
            >
                <div className="relative px-5 py-4 space-y-3 bg-card rounded-[inherit]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <VerifyPulse />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    <span className="text-v-purple">Phase 2</span>
                                    {' · '}Verified <span className="font-mono text-v-purple">{verifiedCount}</span>
                                    <span className="text-muted-foreground"> / {discoveredCount} pairs</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Checking on-chain allowances · filtering revoked · {progress}%
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={stopScan}>
                            <Square className="mr-1 size-3" />
                            Stop
                        </Button>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-v-purple to-v-blue"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            </motion.div>
        );
    }

    /* ── Fallback scanning state (no phase yet) ── */
    if (isScanning) {
        return (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="surface-elevated mb-6 overflow-hidden gradient-border"
            >
                <div className="relative px-5 py-4 space-y-3 bg-card rounded-[inherit]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ScanPulse />
                            <div>
                                <p className="text-sm font-medium text-foreground">Scanning…</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{progress}% complete</p>
                            </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={stopScan}>
                            <Square className="mr-1 size-3" />
                            Stop
                        </Button>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-v-cyan to-v-blue"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="surface mb-6">
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="size-2 rounded-full bg-v-green" />
                        <span className="text-sm text-muted-foreground">
                            Scan complete — Block <span className="font-mono text-foreground">{lastScannedBlock.toLocaleString()}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
                            {isRefreshing ? (
                                <Loader2 className="mr-1.5 size-3 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1.5 size-3" />
                            )}
                            Refresh
                        </Button>
                        <Button size="sm" variant="outline" onClick={startScan}>
                            <Radar className="mr-1 size-3" />
                            Rescan
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
