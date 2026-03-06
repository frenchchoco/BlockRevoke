/**
 * Vercel serverless proxy → VPS health check.
 *
 * The VPS URL is read from the INDEXER_URL Vercel environment variable
 * so the server IP never appears in source code.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_URL = process.env.INDEXER_URL;

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
    if (!VPS_URL) {
        res.status(500).json({ error: 'INDEXER_URL not configured' });
        return;
    }

    try {
        const upstream = await fetch(`${VPS_URL}/health`, {
            signal: AbortSignal.timeout(10_000),
        });
        const data = await upstream.json();
        res.status(200).json(data);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'Indexer unavailable' });
    }
}
