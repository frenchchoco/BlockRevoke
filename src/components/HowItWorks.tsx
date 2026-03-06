import { type ReactElement, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    Search,
    ShieldCheck,
    Trash2,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Lock,
    Clock,
    Bug,
} from 'lucide-react';

const STEPS = [
    {
        icon: Wallet,
        title: 'Connect',
        description: 'Link your Bitcoin wallet. BlockRevoke never accesses your private keys — it only reads your on-chain data.',
    },
    {
        icon: Search,
        title: 'Scan',
        description: 'The indexer instantly returns every OP20 approval your wallet has ever granted. No manual searching required.',
    },
    {
        icon: ShieldCheck,
        title: 'Review',
        description: 'Each approval is scored by risk level. Unlimited approvals to unknown contracts are flagged as critical.',
    },
    {
        icon: Trash2,
        title: 'Revoke',
        description: 'Revoke dangerous approvals in one click, or batch-revoke them all. You can also edit approvals to a safer amount.',
    },
] as const;

const RISKS = [
    {
        icon: AlertTriangle,
        title: 'Unlimited approvals are permanent',
        description: 'When you approve a DEX to swap your tokens, it typically requests unlimited access. That permission stays active forever — even if you only swapped once.',
    },
    {
        icon: Bug,
        title: 'Smart contracts can be exploited',
        description: 'A vulnerability in a contract you approved gives an attacker access to your tokens. The approval is the attack vector — remove it, and the risk disappears.',
    },
    {
        icon: Clock,
        title: 'Old approvals are forgotten liabilities',
        description: 'A protocol you used months ago still has permission to move your tokens. If that protocol is compromised or abandoned, your funds are at risk.',
    },
    {
        icon: Lock,
        title: 'Bitcoin DeFi needs proactive security',
        description: 'On Ethereum, approval exploits caused billions in losses. OPNet is building DeFi on Bitcoin — we have the chance to adopt security best practices from day one.',
    },
] as const;

export function HowItWorks(): ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-6">
            <button
                type="button"
                onClick={(): void => setIsExpanded((p) => !p)}
                className="w-full surface-elevated px-4 py-3 flex items-center justify-between group hover:bg-accent/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-v-cyan" />
                    <span className="text-sm font-medium">How It Works & Why It Matters</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                    <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
            </button>

            <AnimatePresence>
                {isExpanded ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="surface-elevated border-t border-border/50 px-4 py-5 space-y-6">
                            {/* Steps */}
                            <div>
                                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
                                    Four steps to safety
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {STEPS.map((step, i) => (
                                        <motion.div
                                            key={step.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            className="relative p-3 rounded-lg border border-border/50 bg-background/50"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center justify-center size-7 rounded-md bg-v-cyan/10 text-v-cyan">
                                                    <step.icon className="size-3.5" />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {String(i + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="text-sm font-medium">{step.title}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                {step.description}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Why it matters */}
                            <div>
                                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
                                    Why you need this
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {RISKS.map((risk, i) => (
                                        <motion.div
                                            key={risk.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.08 }}
                                            className="flex gap-3 p-3 rounded-lg border border-border/50 bg-background/50"
                                        >
                                            <div className="flex items-center justify-center size-7 shrink-0 rounded-md bg-v-red/10 text-v-red">
                                                <risk.icon className="size-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium mb-1">{risk.title}</p>
                                                <p className="text-xs leading-relaxed text-muted-foreground">
                                                    {risk.description}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Best practice callout */}
                            <div className="rounded-lg border border-v-cyan/20 bg-v-cyan/5 px-4 py-3">
                                <p className="text-sm text-foreground">
                                    <span className="font-semibold text-v-cyan">Best practice:</span>{' '}
                                    Approve, use, revoke. Every time. Treat approvals like you treat unlocked doors — close them when you leave.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
