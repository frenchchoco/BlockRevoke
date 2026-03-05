import { useWalletConnect } from '@btc-vision/walletconnect';
import { useNetworkStore } from '../stores/networkStore';
import type { NetworkId } from '../types/network';

type WalletConnectReturn = ReturnType<typeof useWalletConnect>;

interface UseWalletReturn extends WalletConnectReturn {
    networkId: NetworkId;
    isReady: boolean;
}

export function useWallet(): UseWalletReturn {
    const wallet = useWalletConnect();
    const networkId = useNetworkStore((s) => s.networkId);

    return {
        ...wallet,
        networkId,
        isReady: wallet.walletAddress !== null && wallet.walletAddress !== undefined,
    };
}
