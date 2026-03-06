import { create } from 'zustand';

export type ScanPhase = 'scanning' | 'verifying' | null;

interface ScanState {
  isScanning: boolean;
  phase: ScanPhase;
  currentBlock: number;
  latestBlock: number;
  lastScannedBlock: number;
  progress: number;
  /** Number of unique (token, spender) pairs found during scan */
  discoveredCount: number;
  /** Number of pairs verified so far in Phase 2 */
  verifiedCount: number;
  setScanning: (scanning: boolean) => void;
  setPhase: (phase: ScanPhase) => void;
  updateProgress: (current: number, latest: number) => void;
  updateVerifyProgress: (verified: number, total: number) => void;
  setLastScanned: (block: number) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>()((set) => ({
  isScanning: false,
  phase: null,
  currentBlock: 0,
  latestBlock: 0,
  lastScannedBlock: 0,
  progress: 0,
  discoveredCount: 0,
  verifiedCount: 0,

  setScanning: (scanning: boolean): void => {
    set({ isScanning: scanning });
  },

  setPhase: (phase: ScanPhase): void => {
    set({ phase });
  },

  updateProgress: (current: number, latest: number): void => {
    set({
      currentBlock: current,
      latestBlock: latest,
      progress: latest > 0 ? Math.floor((current / latest) * 100) : 0,
    });
  },

  updateVerifyProgress: (verified: number, total: number): void => {
    set({
      verifiedCount: verified,
      discoveredCount: total,
      progress: total > 0 ? Math.floor((verified / total) * 100) : 0,
    });
  },

  setLastScanned: (block: number): void => {
    set({ lastScannedBlock: block });
  },

  reset: (): void => {
    set({
      isScanning: false,
      phase: null,
      currentBlock: 0,
      latestBlock: 0,
      lastScannedBlock: 0,
      progress: 0,
      discoveredCount: 0,
      verifiedCount: 0,
    });
  },
}));
