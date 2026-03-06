import { type ReactElement, type SVGProps } from 'react';
import { motion } from 'framer-motion';

export function Logo(props: SVGProps<SVGSVGElement>): ReactElement {
    return (
        <motion.svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            {...(props as Record<string, unknown>)}
        >
            <defs>
                <linearGradient id="shield-grad" x1="4" y1="2" x2="28" y2="31.5">
                    <stop offset="0%" stopColor="oklch(0.78 0.15 200)" />
                    <stop offset="100%" stopColor="oklch(0.65 0.25 300)" />
                </linearGradient>
                <linearGradient id="slash-grad" x1="11" y1="11" x2="21" y2="21">
                    <stop offset="0%" stopColor="oklch(0.65 0.28 25)" />
                    <stop offset="100%" stopColor="oklch(0.75 0.18 55)" />
                </linearGradient>
            </defs>
            <path
                d="M16 2L4 7v9c0 7.18 5.12 13.88 12 15.5C22.88 29.88 28 23.18 28 16V7L16 2z"
                fill="url(#shield-grad)"
            />
            <path
                d="M16 4.5L6 8.7v7.3c0 6.1 4.25 11.8 10 13.2 5.75-1.4 10-7.1 10-13.2V8.7L16 4.5z"
                className="fill-primary-foreground dark:fill-background"
                fillOpacity="0.9"
            />
            <line
                x1="11" y1="11" x2="21" y2="21"
                stroke="url(#slash-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <circle
                cx="16" cy="16" r="6"
                stroke="url(#slash-grad)"
                strokeWidth="2"
                fill="none"
            />
        </motion.svg>
    );
}
