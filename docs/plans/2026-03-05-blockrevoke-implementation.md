# BlockRevoke Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a decentralized OPNet dApp that lets users discover, manage, and revoke OP20 token approvals with risk scoring, batch revoke, and a freemium dev fee model.

**Architecture:** Vite + React 19 SPA with Zustand state management. Hybrid approval discovery: known tokens checked instantly via RPC, with progressive background block scanning via Web Worker. Persistent cache in IndexedDB. Dev fee via `extraOutputs` in transactions.

**Tech Stack:** Vite, React 19, TypeScript (strict), Tailwind CSS, shadcn/ui, Zustand, idb, opnet, @btc-vision/walletconnect, @btc-vision/bitcoin, @btc-vision/transaction

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

**Step 1: Create Vite + React project**

```bash
cd /Users/yohannrc/projects/BlockRevoke
npm create vite@latest . -- --template react-ts
```

If prompted about existing files, overwrite.

**Step 2: Install OPNet dependencies**

```bash
rm -rf node_modules package-lock.json
npm i react@latest react-dom@latest opnet@rc @btc-vision/transaction@rc @btc-vision/bitcoin@rc @btc-vision/ecpair@latest @btc-vision/bip32@latest @btc-vision/walletconnect@latest zustand idb
npm i -D vite@latest @vitejs/plugin-react@latest vite-plugin-node-polyfills@latest vite-plugin-eslint2@latest crypto-browserify@latest stream-browserify@latest typescript@latest @types/react@latest @types/react-dom@latest @types/node@latest eslint@^9.39.2 @eslint/js@^9.39.2 typescript-eslint@latest eslint-plugin-react-hooks@latest eslint-plugin-react-refresh@latest
```

Then run the OPNet mandatory install:

```bash
npx npm-check-updates -u && npm i @btc-vision/bitcoin@rc @btc-vision/bip32@latest @btc-vision/ecpair@latest @btc-vision/transaction@rc opnet@rc --prefer-online
```

**Step 3: Install Tailwind CSS + shadcn/ui**

```bash
npm i -D tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

When shadcn init prompts, select:
- Style: New York
- Base color: Zinc
- CSS variables: Yes

**Step 4: Write vite.config.ts**

Use the OPNet production-ready config from setup guidelines. Key requirements:
- `nodePolyfills` plugin FIRST (before react)
- `crypto: 'crypto-browserify'` override
- `undici` alias pointing to `opnet/src/fetch/fetch-browser.js`
- `dedupe` for `@noble/curves`, `@noble/hashes`, `@scure/base`, `buffer`, `react`, `react-dom`
- `external` for Node.js-only modules
- Manual chunk splitting for OPNet packages

Reference: `opnet_full_doc("guidelines/setup-guidelines.md")` section "vite.config.ts (COMPLETE - USE THIS)"

**Step 5: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "lib": ["ESNext", "DOM", "DOM.Iterable", "WebWorker"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**Step 6: Write eslint.config.js**

Copy the OPNet React ESLint flat config exactly from `opnet_skill_doc("opnet-development", file="docs/eslint-react.js")`. It uses `typescript-eslint` strict type-checked config with React hooks and refresh plugins, plus OPNet Buffer restriction rules.

**Step 7: Write minimal src/main.tsx and src/App.tsx**

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <WalletConnectProvider theme="dark">
      <App />
    </WalletConnectProvider>
  </StrictMode>,
);
```

`src/App.tsx`:
```tsx
export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <h1 className="text-2xl p-8">BlockRevoke</h1>
    </div>
  );
}
```

**Step 8: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold BlockRevoke project with Vite, React, Tailwind, OPNet deps"
```

---

## Task 2: Core Types & Configuration

**Files:**
- Create: `src/types/approval.ts`
- Create: `src/types/network.ts`
- Create: `src/config/constants.ts`
- Create: `src/config/networks.ts`
- Create: `src/config/knownTokens.ts`
- Create: `src/config/knownSpenders.ts`

**Step 1: Write TypeScript types**

`src/types/approval.ts`:
```typescript
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DiscoverySource = 'known' | 'scan';

export interface TokenInfo {
  readonly address: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
}

export interface SpenderInfo {
  readonly address: string;
  readonly label: string;
}

export interface Approval {
  readonly id: string; // `${tokenAddress}:${spenderAddress}`
  readonly tokenAddress: string;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly tokenDecimals: number;
  readonly spenderAddress: string;
  readonly spenderLabel: string | null;
  readonly allowance: bigint;
  readonly isUnlimited: boolean;
  readonly riskScore: RiskLevel;
  readonly discoveredVia: DiscoverySource;
  readonly lastUpdatedBlock: number | null;
  readonly lastUpdatedTxHash: string | null;
}

export interface ApprovalHistory {
  readonly id: string;
  readonly tokenAddress: string;
  readonly spenderAddress: string;
  readonly previousAllowance: bigint;
  readonly newAllowance: bigint;
  readonly txHash: string;
  readonly blockNumber: number;
  readonly timestamp: number | null;
}

export type BatchRevokeStatus = 'pending' | 'signing' | 'success' | 'failed';

export interface BatchRevokeItem {
  readonly approvalId: string;
  status: BatchRevokeStatus;
  txHash: string | null;
  error: string | null;
}
```

`src/types/network.ts`:
```typescript
export type NetworkId = 'testnet' | 'mainnet';

export interface NetworkConfig {
  readonly id: NetworkId;
  readonly name: string;
  readonly rpcUrl: string;
}
```

**Step 2: Write config files**

`src/config/constants.ts`:
```typescript
export const FREE_REVOKE_LIMIT = 3;
export const DEV_FEE_SATS = 3000n;
export const DEV_ADDRESS = 'bc1q...'; // TODO: set real dev address
export const U256_MAX = (1n << 256n) - 1n;
export const UNLIMITED_THRESHOLD = U256_MAX / 2n; // anything above this is "unlimited"
```

`src/config/networks.ts` - define testnet and mainnet configs referencing `networks.opnetTestnet` and `networks.mainnet` from `@btc-vision/bitcoin`.

`src/config/knownTokens.ts` - object mapping `NetworkId` to arrays of `TokenInfo`. Start with MOTO token on mainnet (`0x75bd98b086b71010448ec5722b6020ce1e0f2c09f5d680c84059db1295948cf8`). Can be extended.

`src/config/knownSpenders.ts` - object mapping `NetworkId` to arrays of `SpenderInfo`. Start with:
- Mainnet: NATIVE_SWAP (`0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70`), STAKING (`0xaccca433aec3878ebc041cde2a1a2656f928cc404377ebd8339f0bf2cdd66cbe`)

**Step 3: Verify lint + typecheck**

```bash
npx eslint src --ext .ts,.tsx
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/types src/config
git commit -m "feat: add core types and config (tokens, spenders, networks)"
```

---

## Task 3: Zustand Stores

**Files:**
- Create: `src/stores/networkStore.ts`
- Create: `src/stores/approvalStore.ts`
- Create: `src/stores/scanStore.ts`

**Step 1: Write networkStore**

Manages current network selection. Persists to localStorage.

```typescript
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
      setNetwork: (networkId: NetworkId): void => { set({ networkId }); },
    }),
    { name: 'blockrevoke-network' },
  ),
);
```

**Step 2: Write approvalStore**

Manages the list of discovered approvals and history. Supports adding/updating/removing approvals. Selectors for filtering by risk, token, spender.

Key methods:
- `addApprovals(approvals: Approval[])` - merge & dedup
- `removeApproval(id: string)` - after successful revoke
- `updateAllowance(id: string, newAllowance: bigint)` - after edit
- `addHistory(entry: ApprovalHistory)` - add history record
- `clearAll()` - on wallet disconnect
- Computed selectors: `getByRisk(level)`, `getByToken(addr)`, `getBySpender(addr)`

Note: `bigint` can't be serialized to JSON directly. Don't use `persist` middleware on this store (approvals come from RPC + IndexedDB cache, not localStorage).

**Step 3: Write scanStore**

Tracks block scanning progress.

```typescript
interface ScanState {
  isScanning: boolean;
  currentBlock: number;
  latestBlock: number;
  lastScannedBlock: number;
  progress: number; // 0-100
  startScan: () => void;
  stopScan: () => void;
  updateProgress: (current: number, latest: number) => void;
  setLastScanned: (block: number) => void;
}
```

**Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/stores
git commit -m "feat: add Zustand stores for network, approvals, and scan state"
```

---

## Task 4: Services - Provider & Approval Discovery

**Files:**
- Create: `src/services/providerService.ts`
- Create: `src/services/approvalService.ts`

**Step 1: Write providerService**

Creates and caches a separate `JSONRpcProvider` for read-only calls. **CRITICAL**: Do NOT reuse walletconnect's provider for read calls. Create a separate one.

```typescript
import { JSONRpcProvider } from 'opnet';
import { networks, type Network } from '@btc-vision/bitcoin';
import type { NetworkId } from '../types/network';
import { NETWORK_CONFIGS } from '../config/networks';

const providerCache = new Map<NetworkId, JSONRpcProvider>();

export function getReadProvider(networkId: NetworkId): JSONRpcProvider {
  const cached = providerCache.get(networkId);
  if (cached) return cached;

  const config = NETWORK_CONFIGS[networkId];
  const network: Network = networkId === 'testnet'
    ? networks.opnetTestnet
    : networks.mainnet;

  const provider = new JSONRpcProvider({ url: config.rpcUrl, network });
  providerCache.set(networkId, provider);
  return provider;
}
```

**Step 2: Write approvalService**

The core service that discovers approvals using known tokens + spenders.

```typescript
import {
  getContract,
  type IOP20Contract,
  OP_20_ABI,
  BitcoinUtils,
} from 'opnet';
import { Address } from '@btc-vision/transaction';
import type { NetworkId } from '../types/network';
import type { Approval } from '../types/approval';
import { getReadProvider } from './providerService';
import { KNOWN_TOKENS } from '../config/knownTokens';
import { KNOWN_SPENDERS } from '../config/knownSpenders';
import { UNLIMITED_THRESHOLD } from '../config/constants';
import { calculateRiskScore } from '../lib/riskScoring';

export async function discoverKnownApprovals(
  networkId: NetworkId,
  ownerAddress: string,
): Promise<Approval[]> {
  const provider = getReadProvider(networkId);
  const network = /* get from networkId */;
  const owner = Address.fromString(ownerAddress);
  const tokens = KNOWN_TOKENS[networkId] ?? [];
  const spenders = KNOWN_SPENDERS[networkId] ?? [];
  const approvals: Approval[] = [];

  for (const token of tokens) {
    const tokenAddr = Address.fromString(token.address);
    const contract = getContract<IOP20Contract>(
      tokenAddr, OP_20_ABI, provider, network, owner,
    );

    // Get user's balance for risk scoring
    const balanceResult = await contract.balanceOf(owner);
    const balance = balanceResult.properties.balance;

    for (const spender of spenders) {
      const spenderAddr = Address.fromString(spender.address);
      const result = await contract.allowance(owner, spenderAddr);
      const allowance = result.properties.remaining;

      if (allowance > 0n) {
        const isUnlimited = allowance >= UNLIMITED_THRESHOLD;
        approvals.push({
          id: `${token.address}:${spender.address}`,
          tokenAddress: token.address,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          tokenDecimals: token.decimals,
          spenderAddress: spender.address,
          spenderLabel: spender.label,
          allowance,
          isUnlimited,
          riskScore: calculateRiskScore(allowance, balance, true),
          discoveredVia: 'known',
          lastUpdatedBlock: null,
          lastUpdatedTxHash: null,
        });
      }
    }
  }

  return approvals;
}
```

**Step 3: Write revokeApproval function**

```typescript
export async function revokeApproval(
  networkId: NetworkId,
  ownerAddress: string,
  tokenAddress: string,
  spenderAddress: string,
  currentAllowance: bigint,
  devFeeRequired: boolean,
): Promise<string> {
  const provider = getReadProvider(networkId);
  const network = /* get from networkId */;
  const owner = Address.fromString(ownerAddress);
  const tokenAddr = Address.fromString(tokenAddress);
  const spenderAddr = Address.fromString(spenderAddress);

  const contract = getContract<IOP20Contract>(
    tokenAddr, OP_20_ABI, provider, network, owner,
  );

  const simulation = await contract.decreaseAllowance(spenderAddr, currentAllowance);

  if ('error' in simulation) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }

  // Build sendTransaction options
  const txOptions: Record<string, unknown> = {
    signer: null,       // NULL on frontend - wallet signs
    mldsaSigner: null,  // NULL on frontend - wallet signs
    refundTo: owner,
  };

  // Add dev fee as extraOutputs if required
  if (devFeeRequired) {
    // Use setTransactionDetails BEFORE simulate for extraOutputs
    // Actually: extraOutputs go in sendTransaction, not setTransactionDetails
    // TODO: verify the exact API for extraOutputs
  }

  const receipt = await simulation.sendTransaction(txOptions);
  return receipt.transactionId;
}
```

Similar function for `editAllowance` (calculates delta, calls increaseAllowance or decreaseAllowance).

**Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/services src/lib
git commit -m "feat: add provider service and approval discovery/revoke logic"
```

---

## Task 5: Risk Scoring & Fee Service

**Files:**
- Create: `src/lib/riskScoring.ts`
- Create: `src/services/feeService.ts`
- Create: `src/lib/formatters.ts`

**Step 1: Write riskScoring.ts**

```typescript
import type { RiskLevel } from '../types/approval';
import { UNLIMITED_THRESHOLD } from '../config/constants';

export function calculateRiskScore(
  allowance: bigint,
  balance: bigint,
  isKnownSpender: boolean,
): RiskLevel {
  const isUnlimited = allowance >= UNLIMITED_THRESHOLD;

  if (isUnlimited && !isKnownSpender) return 'critical';
  if (isUnlimited && isKnownSpender) return 'high';
  if (!isKnownSpender && balance > 0n && allowance > balance * 10n) return 'high';
  if (isKnownSpender && balance > 0n && allowance > balance) return 'medium';
  return 'low';
}

export function riskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
  };
  return colors[level];
}
```

**Step 2: Write feeService.ts**

Tracks free revokes per wallet in localStorage. Returns whether fee is required.

```typescript
import { FREE_REVOKE_LIMIT, DEV_FEE_SATS } from '../config/constants';

const STORAGE_KEY = 'blockrevoke-free-revokes';

interface FreeRevokeRecord {
  [walletAddress: string]: number;
}

function getRecords(): FreeRevokeRecord {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as FreeRevokeRecord;
}

export function getFreeRevokesUsed(walletAddress: string): number {
  const records = getRecords();
  return records[walletAddress] ?? 0;
}

export function getFreeRevokesRemaining(walletAddress: string): number {
  return Math.max(0, FREE_REVOKE_LIMIT - getFreeRevokesUsed(walletAddress));
}

export function isFeeRequired(walletAddress: string): boolean {
  return getFreeRevokesUsed(walletAddress) >= FREE_REVOKE_LIMIT;
}

export function recordRevokeUsage(walletAddress: string): void {
  const records = getRecords();
  records[walletAddress] = (records[walletAddress] ?? 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getDevFeeSats(): bigint {
  return DEV_FEE_SATS;
}
```

**Step 3: Write formatters.ts**

Utility functions for display: `formatAllowance(amount, decimals)`, `shortenAddress(addr)`, `formatSats(sats)`.

```typescript
import { BitcoinUtils } from 'opnet';
import { UNLIMITED_THRESHOLD } from '../config/constants';

export function formatAllowance(amount: bigint, decimals: number): string {
  if (amount >= UNLIMITED_THRESHOLD) return 'Unlimited';
  return BitcoinUtils.formatUnits(amount, decimals);
}

export function shortenAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatSats(sats: bigint): string {
  return `${sats.toLocaleString()} sats`;
}
```

**Step 4: Verify typecheck + lint**

```bash
npx eslint src --ext .ts,.tsx
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib src/services/feeService.ts
git commit -m "feat: add risk scoring, fee service, and formatters"
```

---

## Task 6: IndexedDB Cache Service

**Files:**
- Create: `src/services/cacheService.ts`

**Step 1: Write cacheService.ts**

Uses `idb` library. Stores:
- `scan-progress`: last scanned block per network+wallet
- `approvals`: cached approval data per network+wallet
- `history`: approval history entries

```typescript
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'blockrevoke';
const DB_VERSION = 1;

interface BlockRevokeDB {
  'scan-progress': {
    key: string; // `${networkId}:${walletAddress}`
    value: { lastScannedBlock: number; updatedAt: number };
  };
  'approvals': {
    key: string; // approval id
    value: {
      networkId: string;
      walletAddress: string;
      tokenAddress: string;
      spenderAddress: string;
      allowance: string; // bigint serialized as string
      tokenName: string;
      tokenSymbol: string;
      tokenDecimals: number;
      spenderLabel: string | null;
      discoveredVia: string;
      lastUpdatedBlock: number | null;
      lastUpdatedTxHash: string | null;
    };
    indexes: { 'by-wallet': string };
  };
  'history': {
    key: string;
    value: {
      networkId: string;
      walletAddress: string;
      tokenAddress: string;
      spenderAddress: string;
      previousAllowance: string;
      newAllowance: string;
      txHash: string;
      blockNumber: number;
      timestamp: number | null;
    };
    indexes: { 'by-wallet': string };
  };
}

async function getDB(): Promise<IDBPDatabase<BlockRevokeDB>> {
  return openDB<BlockRevokeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('scan-progress');

      const approvalStore = db.createObjectStore('approvals');
      approvalStore.createIndex(
        'by-wallet',
        ['networkId', 'walletAddress'] as unknown as string,
      );

      const historyStore = db.createObjectStore('history', { autoIncrement: true });
      historyStore.createIndex(
        'by-wallet',
        ['networkId', 'walletAddress'] as unknown as string,
      );
    },
  });
}
```

Expose functions: `getLastScannedBlock`, `setLastScannedBlock`, `getCachedApprovals`, `cacheApproval`, `addHistoryEntry`, `getHistory`.

Note: `bigint` values must be serialized as strings when stored in IndexedDB.

**Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/services/cacheService.ts
git commit -m "feat: add IndexedDB cache service for approvals and scan progress"
```

---

## Task 7: React Hooks

**Files:**
- Create: `src/hooks/useWallet.ts`
- Create: `src/hooks/useApprovals.ts`
- Create: `src/hooks/useDevFee.ts`

**Step 1: Write useWallet.ts**

Wraps `@btc-vision/walletconnect`'s `useWalletConnect` and provides the network-aware address.

```typescript
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useNetworkStore } from '../stores/networkStore';

export function useWallet() {
  const wallet = useWalletConnect();
  const networkId = useNetworkStore((s) => s.networkId);

  return {
    ...wallet,
    networkId,
    isReady: wallet.walletAddress !== null,
  };
}
```

**Step 2: Write useApprovals.ts**

Triggers approval discovery when wallet connects. Fetches known approvals, populates store.

```typescript
import { useEffect, useCallback } from 'react';
import { useApprovalStore } from '../stores/approvalStore';
import { useWallet } from './useWallet';
import { discoverKnownApprovals } from '../services/approvalService';

export function useApprovals() {
  const { walletAddress, networkId, isReady } = useWallet();
  const { approvals, addApprovals, clearAll } = useApprovalStore();

  useEffect(() => {
    if (!isReady || !walletAddress) {
      clearAll();
      return;
    }

    let cancelled = false;

    async function discover(): Promise<void> {
      const found = await discoverKnownApprovals(networkId, walletAddress!);
      if (!cancelled) {
        addApprovals(found);
      }
    }

    void discover();

    return (): void => { cancelled = true; };
  }, [walletAddress, networkId, isReady, addApprovals, clearAll]);

  return { approvals };
}
```

**Step 3: Write useDevFee.ts**

```typescript
import { useMemo } from 'react';
import { useWallet } from './useWallet';
import {
  getFreeRevokesRemaining,
  isFeeRequired,
  getDevFeeSats,
} from '../services/feeService';

export function useDevFee() {
  const { walletAddress } = useWallet();

  return useMemo(() => {
    if (!walletAddress) {
      return { freeRemaining: 0, feeRequired: false, feeSats: 0n };
    }
    return {
      freeRemaining: getFreeRevokesRemaining(walletAddress),
      feeRequired: isFeeRequired(walletAddress),
      feeSats: getDevFeeSats(),
    };
  }, [walletAddress]);
}
```

**Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/hooks
git commit -m "feat: add React hooks for wallet, approvals, and dev fee"
```

---

## Task 8: UI - Layout & Header Components

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/NetworkSwitch.tsx`
- Create: `src/components/WalletButton.tsx`
- Create: `src/components/Footer.tsx`
- Modify: `src/App.tsx`

**Step 1: Install shadcn components needed**

```bash
npx shadcn@latest add button badge select dropdown-menu table checkbox dialog input toast separator tabs tooltip progress
```

**Step 2: Write Header.tsx**

Header with:
- BlockRevoke logo/text (left)
- NetworkSwitch (center-right)
- WalletButton (right)

Use Tailwind: `flex items-center justify-between px-6 py-4 border-b border-zinc-800`

**Step 3: Write NetworkSwitch.tsx**

shadcn Select dropdown with "Testnet" and "Mainnet" options. Updates `useNetworkStore`.

**Step 4: Write WalletButton.tsx**

Shows "Connect Wallet" button when disconnected, shows shortened address when connected. Uses `useWalletConnect().openConnectModal` and `disconnect`.

**Step 5: Write Footer.tsx**

Shows free revokes remaining count using `useDevFee()`. Dev credits.

**Step 6: Update App.tsx**

Compose Header + main content area + Footer.

**Step 7: Verify it renders**

```bash
npm run dev
```

Open browser, verify header renders with connect button and network switch.

**Step 8: Commit**

```bash
git add src/components src/App.tsx
git commit -m "feat: add Header, NetworkSwitch, WalletButton, and Footer components"
```

---

## Task 9: UI - Approval Table & Risk Badge

**Files:**
- Create: `src/components/RiskBadge.tsx`
- Create: `src/components/ApprovalTable.tsx`
- Create: `src/components/ApprovalRow.tsx`
- Create: `src/components/EmptyState.tsx`

**Step 1: Write RiskBadge.tsx**

shadcn Badge component colored by risk level:
- critical: `destructive` variant, red
- high: orange background
- medium: yellow
- low: green

**Step 2: Write ApprovalRow.tsx**

Single table row showing:
- Checkbox (for batch select)
- Token name + symbol + shortened address
- Spender label (or shortened address if unknown)
- Formatted allowance (or "Unlimited")
- RiskBadge
- Action buttons: Revoke | Edit

**Step 3: Write ApprovalTable.tsx**

Uses shadcn Table. Maps over approvals from `useApprovalStore`. Sortable columns (click header to sort by token, spender, risk, allowance). Select-all checkbox for batch.

**Step 4: Write EmptyState.tsx**

Shown when no approvals found. "No approvals found. Connect your wallet to scan for token approvals."

**Step 5: Integrate into App.tsx**

Add ApprovalTable to the main content area. Show EmptyState when approvals array is empty and wallet is connected. Show connect prompt when wallet not connected.

**Step 6: Verify with mock data**

Temporarily add mock approvals to the store to verify rendering.

**Step 7: Commit**

```bash
git add src/components
git commit -m "feat: add ApprovalTable with RiskBadge and approval rows"
```

---

## Task 10: UI - Filters & Dashboard Summary

**Files:**
- Create: `src/components/DashboardSummary.tsx`
- Create: `src/components/FilterBar.tsx`

**Step 1: Write DashboardSummary.tsx**

Shows:
- Total approvals count
- Breakdown by risk level (4 colored counts)
- Global risk indicator (highest risk found)
- Scan progress bar (from scanStore)

Use shadcn Card components for each stat.

**Step 2: Write FilterBar.tsx**

Row of filter controls:
- Risk level: dropdown or toggle buttons (All / Critical / High / Medium / Low)
- Token: dropdown with token names from current approvals
- Spender: dropdown with spender labels
- Search: text input for free-text search (matches token name, symbol, spender label, addresses)

Filters stored in a local state or a small Zustand slice. Applied to the approval list before rendering.

**Step 3: Integrate into App.tsx**

Add DashboardSummary above FilterBar above ApprovalTable.

**Step 4: Commit**

```bash
git add src/components/DashboardSummary.tsx src/components/FilterBar.tsx src/App.tsx
git commit -m "feat: add dashboard summary and filter bar"
```

---

## Task 11: Revoke & Edit Actions

**Files:**
- Create: `src/components/EditModal.tsx`
- Create: `src/components/RevokeConfirmDialog.tsx`
- Create: `src/hooks/useRevokeAction.ts`
- Create: `src/hooks/useEditAction.ts`

**Step 1: Write useRevokeAction.ts**

Hook that:
1. Checks dev fee requirement
2. Shows confirmation dialog
3. Calls `revokeApproval` from approvalService
4. Records usage via feeService
5. Updates approval store (remove the approval)
6. Shows toast notification

**Step 2: Write RevokeConfirmDialog.tsx**

shadcn Dialog showing:
- Token and spender info
- Current allowance
- Warning about fee if applicable ("This will cost 3000 sats")
- Free revokes remaining
- Confirm / Cancel buttons

**Step 3: Write useEditAction.ts**

Hook that:
1. Opens EditModal
2. Validates new amount
3. Calculates delta (increase or decrease)
4. Calls appropriate function
5. Updates approval store

**Step 4: Write EditModal.tsx**

shadcn Dialog with:
- Current allowance display
- Input for new allowance amount
- Risk score preview (recalculated as user types)
- Fee warning if applicable
- Save / Cancel buttons

**Step 5: Wire actions into ApprovalRow.tsx**

Connect Revoke and Edit buttons to the hooks.

**Step 6: Test manually**

Connect wallet on testnet, find an approval, try revoking. Verify simulation works.

**Step 7: Commit**

```bash
git add src/components/EditModal.tsx src/components/RevokeConfirmDialog.tsx src/hooks/useRevokeAction.ts src/hooks/useEditAction.ts src/components/ApprovalRow.tsx
git commit -m "feat: add revoke and edit approval actions with confirmation dialogs"
```

---

## Task 12: Batch Revoke

**Files:**
- Create: `src/components/BatchActions.tsx`
- Create: `src/hooks/useBatchRevoke.ts`

**Step 1: Write useBatchRevoke.ts**

Manages selected approval IDs. Executes revocations sequentially (one at a time, each needs wallet signature). Tracks status per item (pending/signing/success/failed). Uses `BatchRevokeItem` type.

```typescript
// Core logic:
for (const item of selectedItems) {
  updateStatus(item.id, 'signing');
  try {
    const txHash = await revokeApproval(/* params */);
    updateStatus(item.id, 'success', txHash);
    recordRevokeUsage(walletAddress); // fee tracking
    removeApproval(item.id); // update store
  } catch (err) {
    updateStatus(item.id, 'failed', null, err.message);
  }
}
```

**Step 2: Write BatchActions.tsx**

Sticky bar at bottom of table (appears when items selected):
- "X approvals selected"
- "Revoke All" button
- Fee summary ("3 free + 2 x 3000 sats = 6000 sats")
- Progress during execution

**Step 3: Wire batch selection into ApprovalTable**

Checkboxes in each row + select all. Selected IDs passed to BatchActions.

**Step 4: Commit**

```bash
git add src/components/BatchActions.tsx src/hooks/useBatchRevoke.ts src/components/ApprovalTable.tsx
git commit -m "feat: add batch revoke with progress tracking"
```

---

## Task 13: Block Scanner Web Worker

**Files:**
- Create: `src/workers/blockScanner.worker.ts`
- Create: `src/services/scannerService.ts`
- Create: `src/hooks/useScan.ts`

**Step 1: Write blockScanner.worker.ts**

Web Worker that:
1. Receives message: `{ type: 'start', rpcUrl, network, ownerAddress, startBlock }`
2. Fetches current block height
3. Iterates from startBlock to latestBlock
4. For each block: fetches block with prefetched txs, gets receipt for each tx
5. Filters `Approved` events where owner matches
6. Posts messages back: `{ type: 'approval', data: ApprovalFromScan }` and `{ type: 'progress', currentBlock, latestBlock }`
7. Posts `{ type: 'done', lastScannedBlock }` when complete
8. Handles `{ type: 'stop' }` to terminate gracefully

**Important**: The worker can't use the `opnet` library directly (it depends on DOM APIs). Instead, make raw JSON-RPC calls using `fetch`:

```typescript
async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await response.json();
  return data.result;
}
```

Note: If raw RPC calls are too complex, an alternative is to run the scanning logic on the main thread but yielding with `requestIdleCallback` or in batches with `setTimeout`. Evaluate during implementation.

**Step 2: Write scannerService.ts**

Manages the Web Worker lifecycle. Starts/stops worker. Bridges worker messages to Zustand stores (approvalStore for new approvals, scanStore for progress).

**Step 3: Write useScan.ts**

Hook that auto-starts scanning when wallet connects. Gets last scanned block from IndexedDB cache. Updates cache when scan completes.

**Step 4: Commit**

```bash
git add src/workers src/services/scannerService.ts src/hooks/useScan.ts
git commit -m "feat: add background block scanner with Web Worker"
```

---

## Task 14: UI - Scan Progress & History

**Files:**
- Create: `src/components/ScanProgress.tsx`
- Create: `src/components/HistoryTimeline.tsx`
- Modify: `src/App.tsx` - add tabs (Approvals / History)

**Step 1: Write ScanProgress.tsx**

Non-intrusive progress indicator:
- Shows when scanning is active
- shadcn Progress bar
- "Scanning block X / Y (Z%)"
- Small, can be in the DashboardSummary or as a floating indicator

**Step 2: Write HistoryTimeline.tsx**

Displays ApprovalHistory entries sorted by block number desc.

Each entry shows:
- Token name + symbol
- Spender label
- Previous allowance -> New allowance
- Block number
- Tx hash (shortened, clickable to mempool explorer)
- Relative timestamp if available

**Step 3: Add Tabs to App.tsx**

Use shadcn Tabs: "Approvals" tab (default) and "History" tab.

**Step 4: Commit**

```bash
git add src/components/ScanProgress.tsx src/components/HistoryTimeline.tsx src/App.tsx
git commit -m "feat: add scan progress indicator and approval history timeline"
```

---

## Task 15: Integration, Polish & Build Verification

**Files:**
- Modify: various components for final wiring
- Create: `src/components/Toaster.tsx` (shadcn toast setup)

**Step 1: Add toast notifications**

Set up shadcn Toaster component. Add toasts for:
- Revoke success: "Approval revoked successfully"
- Revoke failure: "Failed to revoke: {error}"
- Edit success/failure
- Wallet connected/disconnected

**Step 2: Handle edge cases**

- Loading states: skeleton loaders while fetching approvals
- Error states: show error messages when RPC calls fail
- Empty states: different messages for "no wallet", "scanning...", "no approvals found"
- Network switch: clear approvals and re-fetch when network changes

**Step 3: Dark mode styling polish**

Ensure all components look good in dark mode (zinc-950 background). Check contrast, hover states, focus rings.

**Step 4: Run full verification**

```bash
npx eslint src --ext .ts,.tsx
npx tsc --noEmit
npm run build
```

Fix ALL errors.

**Step 5: Test manual flow**

1. Open app
2. Connect wallet
3. Switch between testnet/mainnet
4. View approvals (if any)
5. Try revoke on an approval
6. Try edit on an approval
7. Check history tab
8. Verify fee counter works

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: polish UI, add toasts, handle edge cases, verify build"
```

---

## Task 16: Factory Token Discovery (Enhancement)

**Files:**
- Modify: `src/services/approvalService.ts`
- Modify: `src/config/knownTokens.ts`

**Step 1: Add factory token enumeration**

Use `OP20FactoryAbi` to call `getDeploymentsCount()` and `getDeploymentByIndex(i)` on the OP20 Factory contract. This discovers ALL tokens deployed via the factory, not just our hardcoded list.

```typescript
import {
  getContract,
  type IOP20Factory,
  OP20FactoryAbi,
} from 'opnet';

export async function discoverFactoryTokens(
  networkId: NetworkId,
): Promise<TokenInfo[]> {
  const provider = getReadProvider(networkId);
  const factory = getContract<IOP20Factory>(
    factoryAddress, OP20FactoryAbi, provider, network,
  );

  const countResult = await factory.getDeploymentsCount();
  const count = countResult.properties.count;
  const tokens: TokenInfo[] = [];

  for (let i = 0; i < count; i++) {
    const deployment = await factory.getDeploymentByIndex(i);
    const tokenAddr = deployment.properties.token;
    // Get token metadata
    const tokenContract = getContract<IOP20Contract>(
      tokenAddr, OP_20_ABI, provider, network,
    );
    const [nameRes, symbolRes, decimalsRes] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);
    tokens.push({
      address: tokenAddr.toHex(),
      name: nameRes.properties.name,
      symbol: symbolRes.properties.symbol,
      decimals: decimalsRes.properties.decimals,
    });
  }

  return tokens;
}
```

**Step 2: Integrate into discovery flow**

Combine factory tokens with hardcoded known tokens. Cache factory token list in IndexedDB to avoid re-fetching.

**Step 3: Commit**

```bash
git add src/services/approvalService.ts src/config/knownTokens.ts
git commit -m "feat: discover tokens via OP20 Factory for comprehensive approval scanning"
```

---

## OPNet-Specific Rules Checklist

Before each commit, verify:

- [ ] No `any` types anywhere
- [ ] No `Buffer` usage (use `Uint8Array` + `BufferHelper`)
- [ ] No `!` non-null assertions
- [ ] No `// @ts-ignore` or `eslint-disable`
- [ ] No section separator comments (`// ===`, `// ---`)
- [ ] `signer: null` and `mldsaSigner: null` in all frontend `sendTransaction()` calls
- [ ] Separate `JSONRpcProvider` for read-only calls (not walletconnect's provider)
- [ ] `networks.opnetTestnet` for testnet (NOT `networks.testnet`)
- [ ] `bigint` for all financial values
- [ ] Explicit return types on all functions
- [ ] ESLint passes: `npx eslint src --ext .ts,.tsx`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Build passes: `npm run build`

## Dev Fee Implementation Details

The dev fee uses `extraOutputs` in `sendTransaction()`:

```typescript
const receipt = await simulation.sendTransaction({
  signer: null,
  mldsaSigner: null,
  refundTo: ownerAddress,
  extraOutputs: devFeeRequired ? [{
    address: DEV_ADDRESS, // Bitcoin address (not 0x)
    value: DEV_FEE_SATS,
  }] : [],
});
```

Verify exact `extraOutputs` API shape by checking `opnet_knowledge_search("extraOutputs sendTransaction")` during implementation.
