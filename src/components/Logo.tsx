import type { ReactElement, SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>): ReactElement {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Shield shape */}
            <path
                d="M16 2L4 7v9c0 7.18 5.12 13.88 12 15.5C22.88 29.88 28 23.18 28 16V7L16 2z"
                className="fill-primary"
            />
            {/* Inner shield highlight */}
            <path
                d="M16 4.5L6 8.7v7.3c0 6.1 4.25 11.8 10 13.2 5.75-1.4 10-7.1 10-13.2V8.7L16 4.5z"
                className="fill-primary-foreground"
            />
            {/* Slash / revoke line */}
            <line
                x1="11"
                y1="11"
                x2="21"
                y2="21"
                stroke="currentColor"
                className="stroke-destructive"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* Circle outline */}
            <circle
                cx="16"
                cy="16"
                r="6"
                stroke="currentColor"
                className="stroke-destructive"
                strokeWidth="2"
                fill="none"
            />
        </svg>
    );
}
