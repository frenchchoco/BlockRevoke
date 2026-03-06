import { type ReactElement, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, ChevronDown } from 'lucide-react';

const TIPS = [
    { icon: '⚠️', text: 'Unlimited approvals give a contract full access to your token balance — forever.' },
    { icon: '🔓', text: 'Even trusted protocols can be exploited. A single breach drains every wallet with an active approval.' },
    { icon: '🛡️', text: 'Revoke what you don\'t actively use. It costs only a small fee and can save your entire portfolio.' },
    { icon: '🔍', text: 'BlockRevoke scans every OP_20 token approval on OPNet — across testnets and mainnet.' },
    { icon: '💀', text: '$2.1 billion was stolen through approval exploits in 2024 on EVM chains. Bitcoin DeFi is next.' },
    { icon: '⏰', text: 'Old approvals are forgotten liabilities. A contract you used once still has access months later.' },
    { icon: '🧹', text: 'Best practice: approve → use → revoke. Every time. No exceptions.' },
    { icon: '🔗', text: 'Approvals live on-chain permanently until you explicitly revoke them. They don\'t expire.' },
    { icon: '🎯', text: 'You can edit an approval to a lower amount instead of revoking — keep access with less risk.' },
    { icon: '🚨', text: 'If a spender contract is flagged critical, revoke immediately — your funds may be at risk right now.' },
] as const;

/** Typewriter speed in ms per character */
const CHAR_DELAY = 28;
/** Pause after a line is fully typed before starting the next */
const LINE_PAUSE = 2200;

export function HeroBanner(): ReactElement {
    const [dismissed, setDismissed] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const tip = TIPS[currentIdx];
    const fullText = tip ? tip.text : '';

    // Typewriter: advance one char at a time
    useEffect(() => {
        if (dismissed || isPaused) return;

        if (charCount < fullText.length) {
            timerRef.current = setTimeout(() => {
                setCharCount((c) => c + 1);
            }, CHAR_DELAY);
        } else {
            // Line complete — pause, then advance
            timerRef.current = setTimeout(() => {
                setCurrentIdx((i) => (i + 1) % TIPS.length);
                setCharCount(0);
            }, LINE_PAUSE);
        }

        return (): void => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [charCount, currentIdx, fullText.length, dismissed, isPaused]);

    // Skip to next tip on click
    const handleSkip = useCallback((): void => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setCurrentIdx((i) => (i + 1) % TIPS.length);
        setCharCount(0);
    }, []);

    if (dismissed) return <></>;

    const displayedText = fullText.slice(0, charCount);
    const isComplete = charCount >= fullText.length;
    const progress = ((currentIdx + (charCount / fullText.length)) / TIPS.length) * 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
            >
                <div className="surface-elevated overflow-hidden">
                    {/* Progress track */}
                    <div className="h-0.5 w-full bg-border/50">
                        <motion.div
                            className="h-full bg-v-cyan/60"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4, ease: 'linear' }}
                        />
                    </div>

                    <div className="px-4 py-3.5">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="size-3.5 text-v-red" />
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                                    Why revoke — {currentIdx + 1}/{TIPS.length}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={(): void => setDismissed(true)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Dismiss tips"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>

                        {/* Typewriter content */}
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="w-full text-left cursor-pointer group"
                            onMouseEnter={(): void => setIsPaused(true)}
                            onMouseLeave={(): void => setIsPaused(false)}
                        >
                            <div className="flex items-start gap-3 min-h-[2.5rem]" ref={containerRef}>
                                <span className="text-base leading-relaxed shrink-0 mt-0.5" aria-hidden>
                                    {tip?.icon}
                                </span>
                                <p className="text-sm leading-relaxed text-foreground">
                                    {displayedText}
                                    {!isComplete && (
                                        <motion.span
                                            className="inline-block w-[2px] h-[1em] bg-v-cyan ml-[1px] align-text-bottom"
                                            animate={{ opacity: [1, 0] }}
                                            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                                        />
                                    )}
                                </p>
                            </div>
                        </button>

                        {/* Skip hint */}
                        <div className="flex items-center justify-end mt-1.5 gap-1 text-muted-foreground/50">
                            <span className="text-[9px] font-mono uppercase tracking-widest">
                                {isPaused ? 'paused' : isComplete ? 'next' : 'click to skip'}
                            </span>
                            <ChevronDown className="size-2.5" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
