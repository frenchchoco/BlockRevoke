import { type ReactElement, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
    id: number;
    x: number;
    y: number;
    angle: number;
    speed: number;
    size: number;
    color: string;
    delay: number;
}

interface CelebrationEffectProps {
    readonly trigger: boolean;
    readonly onComplete?: () => void;
}

const COLORS: readonly string[] = [
    'oklch(0.78 0.2 145)',  // green
    'oklch(0.78 0.15 200)', // cyan
    'oklch(0.85 0.17 85)',  // yellow
    'oklch(0.65 0.25 300)', // purple
    'oklch(0.93 0.01 260)', // white
] as const;

function generateParticles(): Particle[] {
    return Array.from({ length: 40 }, (_, i): Particle => ({
        id: i,
        x: 0,
        y: 0,
        angle: (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.5,
        speed: Math.random() * 200 + 100,
        size: Math.random() * 6 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
        delay: Math.random() * 0.1,
    }));
}

export function CelebrationEffect({ trigger, onComplete }: CelebrationEffectProps): ReactElement {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (trigger) {
            setParticles(generateParticles());
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                onComplete?.();
            }, 1500);
            return (): void => { clearTimeout(timer); };
        }
        return undefined;
    }, [trigger, onComplete]);

    return (
        <AnimatePresence>
            {show ? (
                <motion.div
                    className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Central flash */}
                    <motion.div
                        className="absolute rounded-full"
                        style={{ background: 'oklch(0.78 0.2 145 / 40%)' }}
                        initial={{ width: 0, height: 0, opacity: 1 }}
                        animate={{ width: 300, height: 300, opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />

                    {/* Particles */}
                    {particles.map((p) => (
                        <motion.div
                            key={p.id}
                            className="absolute rounded-full"
                            style={{
                                width: p.size,
                                height: p.size,
                                background: p.color,
                                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                            }}
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{
                                x: Math.cos(p.angle) * p.speed,
                                y: Math.sin(p.angle) * p.speed,
                                opacity: 0,
                                scale: 0,
                            }}
                            transition={{
                                duration: 1.2,
                                delay: p.delay,
                                ease: 'easeOut',
                            }}
                        />
                    ))}

                    {/* Success text */}
                    <motion.div
                        className="absolute text-2xl font-bold"
                        style={{ color: 'oklch(0.78 0.2 145)' }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, times: [0, 0.3, 1] }}
                    >
                        Revoked!
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
