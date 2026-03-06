import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NetworkId } from '../types/network';
import { clearContractCache } from '../services/contractService';

interface NetworkState {
  networkId: NetworkId;
  setNetwork: (id: NetworkId) => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      networkId: 'mainnet',
      setNetwork: (networkId: NetworkId): void => {
        clearContractCache();
        set({ networkId });
      },
    }),
    { name: 'blockrevoke-network' },
  ),
);
