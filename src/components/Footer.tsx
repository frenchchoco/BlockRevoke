import type { ReactElement } from 'react';

export function Footer(): ReactElement {
    return (
        <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border">
            <p>Fee: 3,000 sats per action</p>
        </footer>
    );
}
