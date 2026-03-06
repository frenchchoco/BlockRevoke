import type { ReactElement } from 'react';

export function Footer(): ReactElement {
    return (
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
            <p>
                <span className="font-mono text-foreground">1,100 sats</span> per action · Built with{' '}
                <span className="font-semibold text-foreground">OPNet</span>
            </p>
        </footer>
    );
}
