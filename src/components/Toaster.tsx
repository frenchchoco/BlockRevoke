import type { ReactElement } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

export function Toaster(): ReactElement {
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            position="bottom-right"
            richColors
        />
    );
}
