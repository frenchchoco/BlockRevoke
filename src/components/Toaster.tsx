import type { ReactElement } from 'react';
import { Toaster as Sonner } from 'sonner';

/**
 * App-level toaster configured for dark theme.
 * Place once inside the root component tree.
 */
export function Toaster(): ReactElement {
    return (
        <Sonner
            theme="dark"
            position="bottom-right"
            richColors
            toastOptions={{
                style: {
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                },
            }}
        />
    );
}
