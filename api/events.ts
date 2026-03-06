/**
 * Vercel serverless proxy → VPS indexer.
 * Forwards GET /api/events to the backend.
 *
 * The VPS URL is read from the INDEXER_URL Vercel environment variable
 * so the server IP never appears in source code.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_URL = process.env.INDEXER_URL;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (!VPS_URL) {
        res.status(500).json({ error: 'INDEXER_URL not configured' });
        return;
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const url = new URL('/api/events', VPS_URL);
        if (req.query) {
            for (const [key, value] of Object.entries(req.query)) {
                url.searchParams.set(key, String(value));
            }
        }

        const upstream = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15_000),
        });

        const data = await upstream.json();
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        res.status(upstream.status).json(data);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Proxy /api/events]', msg);
        res.status(502).json({ error: 'Indexer unavailable' });
    }
}
