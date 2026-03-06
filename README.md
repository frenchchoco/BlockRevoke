# BlockRevoke

**The approval manager for Bitcoin DeFi. Scan, review, and revoke OP20 token approvals before they become attack vectors.**

Built on [OPNet](https://opnet.org) — the smart contract layer for Bitcoin.

---

## The Problem

Every time you swap tokens on a Bitcoin DEX, stake in a vault, or interact with a DeFi protocol on OPNet, you grant that contract **permission to spend your tokens**. This is called an _approval_ (or _allowance_).

Most dApps request **unlimited approvals** — meaning the contract can move your entire balance, forever. If that contract is ever:

- **Exploited** via a vulnerability
- **Upgraded** maliciously by a compromised deployer
- **Abandoned** with residual permissions still active

...your tokens can be drained in a single transaction, without your consent.

On Ethereum, this has led to **billions in losses**. The Wormhole exploit ($326M), the Multichain hack ($126M), and countless smaller rug pulls all leveraged leftover approvals. Bitcoin DeFi is new — but the same attack surface exists on OPNet.

**BlockRevoke exists to close that gap before the first exploit happens.**

---

## The Solution

BlockRevoke gives OPNet users complete visibility and control over their token approvals:

1. **Connect** your wallet
2. **Scan** the entire blockchain for every approval you've ever granted
3. **Review** each approval with a clear risk score
4. **Revoke** dangerous approvals in one click — or batch-revoke them all

No more blind trust. No more forgotten approvals from six months ago. Every permission your wallet has ever granted is surfaced, scored, and revocable.

---

## Features

### Comprehensive Discovery

BlockRevoke uses a **two-phase scanning approach** to find every approval, not just the obvious ones:

- **Instant results** from a backend indexer that continuously monitors the blockchain
- **Gap scanning** — the frontend scans any blocks the indexer hasn't reached yet
- **Factory token discovery** — finds tokens deployed via OP20 factories, not just hardcoded lists
- **Known spender matching** — identifies which DeFi protocols hold your approvals

### Risk Scoring

Every approval is assigned a risk level based on multiple factors:

| Risk | Criteria |
|------|----------|
| **Critical** | Unlimited approval to an unknown contract |
| **High** | Unlimited approval to a known protocol, or large approval to unknown |
| **Medium** | Approval exceeds your balance from an unknown spender |
| **Low** | Reasonable approval to a verified protocol |

### Revocation Actions

- **Single revoke** — revoke one approval with confirmation dialog
- **Edit allowance** — reduce an approval to a specific amount instead of revoking entirely
- **Batch revoke** — select multiple approvals and revoke them sequentially
- **Fee selector** — choose your Bitcoin fee rate (low / standard / fast)

### User Experience

- **Sub-second load times** — cached results from the indexer, no full chain scan needed
- **Dark/light mode** — follows your system preference
- **Real-time progress** — watch the scanner work through blocks live
- **History timeline** — see every approval change over time
- **Educational tips** — rotating banner teaches users about approval security
- **Celebration animation** — because revoking dangerous approvals should feel good

---

## Architecture

```
                     User's Browser
                    ┌──────────────────────────────────┐
                    │  React + Vite + Tailwind          │
                    │                                    │
                    │  ┌──────────┐  ┌───────────────┐  │
                    │  │ Zustand   │  │ IndexedDB     │  │
                    │  │ Stores    │  │ Cache         │  │
                    │  └────┬─────┘  └───────┬───────┘  │
                    │       │                │           │
                    │  ┌────┴────────────────┴────────┐ │
                    │  │     Services Layer             │ │
                    │  │  approval · scanner · gas      │ │
                    │  │  contract · token · indexer    │ │
                    │  └──────┬───────────────┬────────┘ │
                    └─────────┼───────────────┼──────────┘
                              │               │
                 ┌────────────┘               └──────────────┐
                 ▼                                           ▼
        OPNet Testnet/Mainnet                     Indexer API (VPS)
        ┌─────────────────┐                  ┌───────────────────┐
        │  JSON-RPC        │                  │  Fastify + PG     │
        │  • getBlocks()   │◄─────────────── │  • Daemon scans   │
        │  • allowance()   │                  │    all blocks     │
        │  • sendTx()      │                  │  • Caches events  │
        └─────────────────┘                  │  • Serves via API │
                                              └───────────────────┘
```

**Key design decisions:**

- **No `eth_getLogs` equivalent** — OPNet requires fetching full blocks and decoding events client-side. The indexer does the heavy lifting so users don't wait.
- **Separate read provider** — RPC calls use a dedicated provider, isolated from the wallet connection, preventing MITM vectors.
- **Adaptive batch fetching** — block scanning automatically adjusts batch sizes based on RPC performance, with retry and split-on-failure strategies.
- **Dev fee as PSBT output** — the small service fee is a standard Bitcoin output in the transaction, not a contract-level charge. Transparent and verifiable on-chain.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 · TypeScript · Vite |
| Styling | Tailwind CSS v4 · shadcn/ui |
| State | Zustand |
| Animations | Framer Motion |
| Blockchain | OPNet SDK · @btc-vision/transaction |
| Wallet | @btc-vision/walletconnect |
| Cache | IndexedDB (idb) |
| Backend | Fastify v5 · PostgreSQL · Node.js 24 |
| Deployment | Vercel (frontend) · Hetzner VPS (indexer) |

---

## Quick Start

```bash
# Clone
git clone https://github.com/frenchchoco/BlockRevoke.git
cd BlockRevoke

# Install
npm install

# Configure
cp .env.example .env
# Edit .env — set VITE_DEV_ADDRESS and optionally VITE_INDEXER_URL

# Run
npm run dev
```

Open `http://localhost:5173`, connect your wallet, and scan.

For the full setup guide including the backend indexer, see **[docs/HOWTO.md](docs/HOWTO.md)**.

---

## Security Model

- **Non-custodial** — BlockRevoke never holds your keys. All transactions are signed by your connected wallet.
- **Read-only scanning** — discovery uses a separate RPC provider with no signing capability.
- **Address validation** — all Bitcoin addresses are validated using `AddressVerificator` from `@btc-vision/transaction`.
- **No raw PSBT** — transactions are built through the OPNet SDK's simulation-then-send pattern, never via manual PSBT construction.
- **Rate-limited API** — the indexer API is protected against abuse.
- **No data poisoning** — only the server-side daemon writes to the event database. The API is read-only.
- **Transparent fees** — the dev fee (1100 sats) appears as a standard on-chain output, verifiable by anyone.

---

## Why This Matters for OPNet

As OPNet grows from testnet to mainnet, the DeFi ecosystem will expand rapidly. More protocols means more approvals. More approvals means more attack surface.

BlockRevoke is **infrastructure-level security tooling** — the kind of project that needs to exist before the first major exploit, not after. Every user who revokes an unused approval is one fewer victim when a contract is compromised.

The Ethereum ecosystem learned this lesson the hard way. Bitcoin DeFi on OPNet has the chance to get it right from day one.

---

## License

MIT
