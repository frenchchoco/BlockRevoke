/**
 * Vercel serverless proxy → Hetzner VPS health check.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_URL = 'http://REDACTED_HOST:3000';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
    try {
        const upstream = await fetch(`${VPS_URL}/health`, {
            signal: AbortSignal.timeout(10_000),
        });
        const data = await upstream.json();
        res.status(200).json(data);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'Indexer unavailable', detail: msg });
    }
}
