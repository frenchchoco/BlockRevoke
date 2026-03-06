import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '../hooks/useWallet';
import { displayAddress } from '../lib/formatters';
import { LogOut, Wallet } from 'lucide-react';

export function WalletButton(): ReactElement {
    const { walletAddress, openConnectModal, disconnect, networkId } = useWallet();

    if (!walletAddress) {
        return (
            <Button size="sm" onClick={openConnectModal}>
                <Wallet className="size-4" />
                Connect Wallet
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Wallet className="size-4" />
                    {displayAddress(walletAddress, networkId)}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={disconnect}>
                    <LogOut className="size-4" />
                    Disconnect
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
