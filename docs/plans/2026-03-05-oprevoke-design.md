# BlockRevoke - Design Document

**Date:** 2026-03-05
**Status:** Approved

## Overview

BlockRevoke is a decentralized dApp for OPNet that allows users to view, manage, and revoke OP20 token approvals. Inspired by Revoke.cash on Ethereum, adapted for OPNet's architecture.

## Tech Stack

- **Vite + React 19 + TypeScript** (SPA, no SSR)
- **Tailwind CSS + shadcn/ui** (dark mode native)
- **Zustand** (state management with granular selectors)
- **IndexedDB** via `idb` (persistent cache)
- **Web Worker** (background block scanning)
- **OPNet SDK**: `opnet`, `@btc-vision/walletconnect`, `@btc-vision/bitcoin`, `@btc-vision/transaction`

## Networks

- Testnet: `https://testnet.opnet.org` with `networks.opnetTestnet`
- Mainnet: `https://mainnet.opnet.org` with `networks.mainnet`
- Network switch in UI header

## Architecture: Hybrid Discovery

### Phase 1 - Known Tokens (instant)

1. User connects wallet via `@btc-vision/walletconnect`
2. Load known token list (hardcoded config + IndexedDB cache)
3. For each token, check `allowance(user, spender)` against known spenders (MotoSwap Router, NativeSwap, etc.)
4. Approvals with allowance > 0 appear immediately

### Phase 2 - Progressive Block Scan (background)

1. Web Worker starts scanning blocks from last scanned block (or block 0 on first visit)
2. For each block: fetch transactions, get receipts, filter `Approved` events where `owner == user address`
3. New approvals added to Zustand store (merged, deduplicated)
4. Scan progress shown in UI (progress bar)
5. Last scanned block saved in IndexedDB for incremental scanning

### Data Flow

```
User connects wallet
       |
  +----+----+
  |         |
  v         v
Phase 1    Phase 2
(instant)  (background Worker)
  |         |
  v         v
Known       Block scan
allowance() receipts
  |         |
  +----+----+
       |
       v
  Zustand Store
  (merged, dedup)
       |
       v
  ApprovalTable UI
```

## Data Model

```typescript
interface Approval {
  id: string;                    // `${tokenAddress}:${spenderAddress}`
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  spenderAddress: string;
  spenderLabel?: string;         // "MotoSwap Router", "NativeSwap", etc.
  allowance: bigint;
  isUnlimited: boolean;          // u256.Max
  riskScore: 'low' | 'medium' | 'high' | 'critical';
  discoveredVia: 'known' | 'scan';
  lastUpdatedBlock?: number;
  lastUpdatedTxHash?: string;
}

interface ApprovalHistory {
  tokenAddress: string;
  spenderAddress: string;
  previousAllowance: bigint;
  newAllowance: bigint;
  txHash: string;
  blockNumber: number;
  timestamp?: number;
}
```

## Risk Scoring

```
CRITICAL : unlimited allowance + unknown spender
HIGH     : unlimited allowance + known spender
           OR allowance > 10x balance + unknown spender
MEDIUM   : allowance > balance + known spender
LOW      : allowance <= balance + known spender
```

Factors:
- **Amount**: unlimited (u256.Max) vs proportional to balance
- **Known spender**: in verified contracts list? (MotoSwap, NativeSwap...)
- **Token verification**: does token have verified code?

## Actions

### Revoke
- Call `decreaseAllowance(spender, currentAllowance)` to set to 0
- Simulate before sending
- Show confirmation with risk info

### Edit Allowance
- Calculate delta: if new < current -> `decreaseAllowance(delta)`, else `increaseAllowance(delta)`
- Modal with amount input
- Show new risk score preview

### Batch Revoke
- Multi-select checkboxes in approval table
- Execute revocations sequentially (one tx per wallet signature)
- Show progress for each tx (pending/success/failed)

## Dev Fee Model (Freemium)

- **3 free revocations** per wallet address (tracked in localStorage)
- After 3: **3000 sats** per action (revoke or edit)
- Implemented via `extraOutputs` in `sendTransaction()` sending sats to dev address
- Fee clearly displayed before confirmation
- Read operations (viewing approvals, checking allowances) are always free
- Only write operations (revoke, edit) incur fees after free tier

## UI Layout

### Single Page with Sections

1. **Header**: Logo "BlockRevoke", Network switch (Testnet/Mainnet), Connect Wallet button
2. **Dashboard Summary**: Total approvals count, global risk indicator, scan progress bar
3. **Filters**: By risk level, by token, by spender, search
4. **Approval Table**:
   - Columns: Token | Spender | Allowance | Risk | Actions
   - Checkbox for batch selection
   - Actions: Revoke / Edit / View Details
   - Sortable columns
5. **History Tab**: Timeline of approval changes discovered during scan
6. **Footer**: Free revokes remaining (X/3), dev credits, links

### Key UX Patterns
- Progressive loading: results appear as they're discovered
- Skeleton loaders during Phase 1
- Background scan indicator (non-intrusive)
- Toast notifications for tx success/failure
- Dark mode by default (crypto dApp convention)

## Project Structure

```
src/
  components/        # UI components
    ApprovalTable/
    RiskBadge/
    NetworkSwitch/
    WalletButton/
    EditModal/
    BatchActions/
    ScanProgress/
    HistoryTimeline/
  hooks/             # React hooks
    useApprovals.ts
    useOP20.ts
    useWallet.ts
    useScan.ts
    useDevFee.ts
  workers/           # Web Workers
    blockScanner.worker.ts
  services/          # Business logic
    approvalService.ts
    scannerService.ts
    feeService.ts
    riskService.ts
    cacheService.ts
  stores/            # Zustand stores
    approvalStore.ts
    walletStore.ts
    scanStore.ts
  config/            # Configuration
    knownTokens.ts
    knownSpenders.ts
    networks.ts
    constants.ts
  lib/               # Utilities
    formatters.ts
    riskScoring.ts
  types/             # TypeScript types
    approval.ts
    network.ts
```
