import { useEffect } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useNetworkStore } from '../stores/networkStore';
import type { NetworkId } from '../types/network';

type WalletConnectReturn = ReturnType<typeof useWalletConnect>;

interface UseWalletReturn extends WalletConnectReturn {
    networkId: NetworkId;
    isReady: boolean;
}

/**
 * Map the wallet's network string to our NetworkId.
 * OPNet testnet reports as "opnetTestnet", mainnet as "mainnet".
 */
function walletNetworkToId(walletNetwork: string | undefined | null): NetworkId | null {
    if (!walletNetwork) return null;
    if (walletNetwork === 'mainnet') return 'mainnet';
    if (walletNetwork === 'opnetTestnet') return 'testnet';
    return null;
}

export function useWallet(): UseWalletReturn {
    const wallet = useWalletConnect();
    const networkId = useNetworkStore((s) => s.networkId);
    const setNetwork = useNetworkStore((s) => s.setNetwork);

    // Auto-sync network store when wallet network changes
    useEffect(() => {
        const detectedId = walletNetworkToId(wallet.network?.network);
        if (detectedId && detectedId !== networkId) {
            setNetwork(detectedId);
        }
    }, [wallet.network, networkId, setNetwork]);

    return {
        ...wallet,
        networkId,
        isReady: wallet.walletAddress !== null && wallet.address !== null,
    };
}
