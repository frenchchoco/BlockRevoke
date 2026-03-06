import type { ReactElement } from 'react';
import { Logo } from './Logo';
import { NetworkSwitch } from './NetworkSwitch';
import { WalletButton } from './WalletButton';
import { ThemeToggle } from './ThemeToggle';

export function Header(): ReactElement {
    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex items-center justify-between px-4 py-3 max-w-6xl">
                <div className="flex items-center gap-2">
                    <Logo className="size-7" />
                    <span className="text-lg font-bold tracking-tight text-foreground">
                        BlockRevoke
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <NetworkSwitch />
                    <WalletButton />
                </div>
            </div>
        </header>
    );
}
