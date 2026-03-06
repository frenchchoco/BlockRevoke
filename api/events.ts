/**
 * Vercel serverless proxy → Hetzner VPS indexer.
 * Forwards GET/POST /api/events to the VPS backend.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_URL = 'http://REDACTED_HOST:3000';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    try {
        // Build upstream URL with query params
        const url = new URL('/api/events', VPS_URL);
        if (req.query) {
            for (const [key, value] of Object.entries(req.query)) {
                url.searchParams.set(key, String(value));
            }
        }

        const upstream = await fetch(url.toString(), {
            method: req.method ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
            signal: AbortSignal.timeout(15_000),
        });

        const data = await upstream.json();
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        res.status(upstream.status).json(data);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Proxy /api/events]', msg);
        res.status(502).json({ error: 'Indexer unavailable', detail: msg });
    }
}
