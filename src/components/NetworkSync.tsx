import { useEffect } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useNetworkStore } from '../stores/networkStore';
import type { NetworkId } from '../types/network';

/**
 * Map the wallet-reported network string to our NetworkId.
 * OP_WALLET may report "mainnet", "testnet", or "opnetTestnet".
 */
function walletNetworkToId(walletNetwork: string | undefined | null): NetworkId | null {
    if (!walletNetwork) return null;
    if (walletNetwork === 'mainnet') return 'mainnet';
    if (walletNetwork === 'testnet' || walletNetwork === 'opnetTestnet') return 'testnet';
    return null;
}

/**
 * Renders nothing — exists only to keep the network store in sync
 * with the connected wallet.  Mounted ONCE at the App root to avoid
 * the race-condition that occurred when the sync lived inside
 * `useWallet()` (called from 7+ locations).
 */
export function NetworkSync(): null {
    const { network } = useWalletConnect();
    const setNetwork = useNetworkStore((s) => s.setNetwork);

    useEffect(() => {
        const detectedId = walletNetworkToId(network?.network);
        if (detectedId) {
            setNetwork(detectedId);
        }
    }, [network?.network, setNetwork]);

    return null;
}
