import { create } from 'zustand';

interface ScanState {
  isScanning: boolean;
  currentBlock: number;
  latestBlock: number;
  lastScannedBlock: number;
  progress: number;
  setScanning: (scanning: boolean) => void;
  updateProgress: (current: number, latest: number) => void;
  setLastScanned: (block: number) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>()((set) => ({
  isScanning: false,
  currentBlock: 0,
  latestBlock: 0,
  lastScannedBlock: 0,

  progress: 0,

  setScanning: (scanning: boolean): void => {
    set({ isScanning: scanning });
  },

  updateProgress: (current: number, latest: number): void => {
    set({
      currentBlock: current,
      latestBlock: latest,
      progress: latest > 0 ? Math.floor((current / latest) * 100) : 0,
    });
  },

  setLastScanned: (block: number): void => {
    set({ lastScannedBlock: block });
  },

  reset: (): void => {
    set({
      isScanning: false,
      currentBlock: 0,
      latestBlock: 0,
      lastScannedBlock: 0,
      progress: 0,
    });
  },
}));
