import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NetworkId } from '../types/network';

interface NetworkState {
  networkId: NetworkId;
  setNetwork: (id: NetworkId) => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      networkId: 'mainnet',
      setNetwork: (networkId: NetworkId): void => {
        set({ networkId });
      },
    }),
    { name: 'blockrevoke-network' },
  ),
);
