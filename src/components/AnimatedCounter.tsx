import { type ReactElement, useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
    readonly value: number;
    readonly className?: string;
    readonly duration?: number;
}

export function AnimatedCounter({ value, className = '', duration = 1.2 }: AnimatedCounterProps): ReactElement {
    const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
    const display = useTransform(spring, (v) => Math.round(v));
    const [displayValue, setDisplayValue] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        spring.set(value);
        prevValue.current = value;
    }, [value, spring]);

    useEffect(() => {
        const unsubscribe = display.on('change', (v) => {
            setDisplayValue(v as number);
        });
        return unsubscribe;
    }, [display]);

    return (
        <motion.span
            className={className}
            key={value}
            initial={{ scale: 1 }}
            animate={value !== prevValue.current ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
        >
            {displayValue}
        </motion.span>
    );
}
