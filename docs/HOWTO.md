# BlockRevoke — How To Guide

Complete setup and deployment guide for BlockRevoke and its backend indexer.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Setup](#frontend-setup)
3. [Indexer Setup](#indexer-setup)
4. [Environment Variables](#environment-variables)
5. [Local Development](#local-development)
6. [Deployment](#deployment)
7. [Monitoring](#monitoring)

---

## Prerequisites

- **Node.js 24+** (required by OPNet SDK)
- **npm** (comes with Node.js)
- **PostgreSQL 16+** (for the indexer backend)
- **Git**

---

## Frontend Setup

### 1. Clone and install

```bash
git clone https://github.com/frenchchoco/BlockRevoke.git
cd BlockRevoke
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Bitcoin address that receives the dev fee (1100 sats per revoke)
VITE_DEV_ADDRESS=opt1p...your_address_here

# (Optional) Direct indexer URL for local development
# In production, the Vercel proxy handles this
VITE_INDEXER_URL=http://localhost:3000
```

### 3. Run the dev server

```bash
npm run dev
```

Open `http://localhost:5173`. Connect a wallet on OPNet testnet to start scanning.

### 4. Build for production

```bash
npm run build     # TypeScript check + Vite build
npm run preview   # Preview the production build locally
```

### 5. Lint and typecheck

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript strict mode
```

---

## Indexer Setup

The indexer is a separate Node.js service that continuously scans OPNet blocks, extracts `Approved` events, and serves them via a REST API. This makes the frontend fast — users get instant results instead of waiting for a full chain scan.

### 1. Clone and install

```bash
git clone https://github.com/frenchchoco/blockrevoke-indexer.git
cd blockrevoke-indexer
npm install
```

### 2. Create the database

```bash
# Create a PostgreSQL database
sudo -u postgres psql -c "CREATE DATABASE blockrevoke;"
sudo -u postgres psql -c "CREATE USER blockrevoke WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE blockrevoke TO blockrevoke;"
```

The indexer auto-creates tables on first start (see `src/db/migrate.ts`).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://blockrevoke:your_password@localhost:5432/blockrevoke
PORT=3000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173
BATCH_SIZE=25
POLL_INTERVAL_MS=10000
TESTNET_RPC_URL=https://testnet.opnet.org
MAINNET_RPC_URL=https://mainnet.opnet.org
```

### 4. Run

```bash
npm run dev    # Development with hot reload
npm run build  # Compile TypeScript
npm start      # Run production build
```

The indexer starts scanning from block 0 (or where it left off) and catches up to the chain head. Progress is stored in PostgreSQL so restarts are safe.

### 5. Verify

```bash
# Health check
curl http://localhost:3000/health

# Query events for an address
curl "http://localhost:3000/api/events?network=testnet&owner=0xYOUR_ADDRESS"
```

---

## Environment Variables

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_DEV_ADDRESS` | Yes (for fees) | Bitcoin address receiving the dev fee per revoke |
| `VITE_INDEXER_URL` | No | Direct indexer URL (dev only; prod uses Vercel proxy) |

### Indexer (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `3000` | API server port |
| `HOST` | No | `0.0.0.0` | Listen address |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `BATCH_SIZE` | No | `25` | Blocks per RPC fetch |
| `POLL_INTERVAL_MS` | No | `10000` | Polling interval when caught up (ms) |
| `TESTNET_RPC_URL` | No | `https://testnet.opnet.org` | OPNet testnet RPC |
| `MAINNET_RPC_URL` | No | `https://mainnet.opnet.org` | OPNet mainnet RPC |
| `PG_POOL_MAX` | No | `5` | Max PostgreSQL connections |

### Vercel (Dashboard → Settings → Environment Variables)

| Variable | Description |
|----------|-------------|
| `INDEXER_URL` | Full URL to the VPS indexer (e.g. `http://your-ip:3000`) |
| `VITE_DEV_ADDRESS` | Same dev fee address as local `.env` |

---

## Local Development

### Running both frontend and indexer

Terminal 1 — Indexer:
```bash
cd blockrevoke-indexer
npm run dev
```

Terminal 2 — Frontend:
```bash
cd BlockRevoke
npm run dev
```

The frontend will query the local indexer at `http://localhost:3000` (via `VITE_INDEXER_URL`).

### Without the indexer

The frontend works without the indexer — it falls back to scanning blocks directly via RPC. This is slower (several minutes for a full chain scan) but fully functional.

### Testing a revoke

1. Open `http://localhost:5173`
2. Connect a wallet with active approvals on OPNet testnet
3. Wait for the scan to complete (indexer: instant, block scan: 1-2 minutes)
4. Click "Revoke" on any approval
5. Select a fee rate and confirm
6. Sign the transaction in your wallet
7. Watch the celebration animation

---

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Set environment variables:
   - `INDEXER_URL` = `http://your-vps-ip:3000`
   - `VITE_DEV_ADDRESS` = your dev fee address
4. Deploy

Vercel automatically builds with Vite and deploys the SPA. The `/api/*` serverless functions proxy requests to the VPS indexer.

### Indexer → VPS (Hetzner, DigitalOcean, etc.)

A deployment script is included at `scripts/deploy.sh`. It installs:

- Node.js 24
- PostgreSQL 16
- PM2 (process manager)
- nginx (reverse proxy + SSL)
- Certbot (Let's Encrypt)
- UFW firewall

```bash
# On a fresh Ubuntu 24.04 VPS:
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

After deployment:

```bash
# Check status
pm2 status

# View logs
pm2 logs blockrevoke-indexer

# Restart
pm2 restart blockrevoke-indexer
```

---

## Monitoring

### Health endpoint

```bash
curl https://your-domain.com/health
```

Returns:
```json
{
  "status": "ok",
  "uptime": 86400,
  "networks": {
    "testnet": { "lastIndexedBlock": 4200 },
    "mainnet": { "lastIndexedBlock": 0 }
  }
}
```

### Key metrics to watch

- **Indexer lag**: Compare `lastIndexedBlock` to the chain head (query via RPC `getBlockNumber`)
- **PM2 restarts**: `pm2 status` — restart count should be 0 in steady state
- **PostgreSQL size**: `SELECT pg_database_size('blockrevoke');` — grows with indexed events
- **RPC errors**: Check PM2 logs for repeated fetch failures

---

## Database Schema

### `approved_events`

Stores all `Approved` events from all users (not filtered by owner).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `network` | VARCHAR(10) | `testnet` or `mainnet` |
| `token` | VARCHAR(66) | Token contract address |
| `spender` | VARCHAR(66) | Spender contract address |
| `owner` | VARCHAR(66) | Token owner address |
| `allowance` | VARCHAR(78) | Allowance amount (bigint as string) |
| `block_number` | INTEGER | Block where the event occurred |
| `tx_hash` | VARCHAR(66) | Transaction hash |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Indexes:** `(network, lower(owner))`, `(network, block_number DESC)`

### `scan_progress`

Tracks the daemon's scanning cursor per network.

| Column | Type | Description |
|--------|------|-------------|
| `network` | VARCHAR(10) | Primary key |
| `last_block` | INTEGER | Last fully scanned block |
| `updated_at` | TIMESTAMPTZ | Last update time |

---

## Troubleshooting

### "Indexer unavailable" in console

The frontend can't reach the indexer API. Check:
- Is the indexer running? (`pm2 status` or `curl localhost:3000/health`)
- Is `VITE_INDEXER_URL` set in `.env` (local) or `INDEXER_URL` on Vercel (production)?
- Is CORS configured? (`CORS_ORIGINS` in indexer `.env`)

### Scan takes forever

Without the indexer, the frontend scans all blocks via RPC. This is normal for a first scan. The indexer eliminates this wait.

### No approvals found

- Make sure you've actually approved tokens (e.g. via a DEX swap on testnet)
- Check the network — are you on testnet in the dApp but your wallet is on mainnet?
- The scan needs to complete before results appear

### Revoke fails

- Check your wallet has enough BTC for the transaction fee + dev fee (1100 sats)
- Make sure the approval still exists (another wallet action may have changed it)
- Check the browser console for the specific error message
