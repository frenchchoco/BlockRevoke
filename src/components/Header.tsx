import type { ReactElement } from 'react';
import { NetworkSwitch } from './NetworkSwitch';
import { WalletButton } from './WalletButton';

export function Header(): ReactElement {
    return (
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
            <span className="text-xl font-bold text-zinc-100">BlockRevoke</span>
            <div className="flex items-center gap-3">
                <NetworkSwitch />
                <WalletButton />
            </div>
        </header>
    );
}
