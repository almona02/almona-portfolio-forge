import type { IncomingMessage, ServerResponse } from 'node:http';
import { sanitizeMarketplaceEvent } from '../src/lib/marketplace/eventSchema';

let bucketStart = Date.now();
let accepted = 0;
/** Structured, PII-free events go to the existing Vercel function logs. */
export default function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.statusCode = 405; res.end(); return; }
  const origin = req.headers.origin;
  const expected = req.headers.host;
  let sameOrigin = false;
  try { sameOrigin = typeof origin === 'string' && new URL(origin).host === expected; } catch { /* Reject malformed origin. */ }
  if (!sameOrigin || req.headers['sec-fetch-site'] === 'cross-site') { res.statusCode = 403; res.end(); return; }
  if (!String(req.headers['content-type']).startsWith('application/json') || Number(req.headers['content-length'] || 0) > 1024) {
    res.statusCode = 413; res.end(); return;
  }
  let body: unknown = req.body;
  if (typeof body === 'string') {
    if (body.length > 1024) { res.statusCode = 413; res.end(); return; }
    try { body = JSON.parse(body); } catch { res.statusCode = 400; res.end(); return; }
  }
  if (body && typeof body === 'object' && Buffer.byteLength(JSON.stringify(body)) > 1024) { res.statusCode = 413; res.end(); return; }
  const event = sanitizeMarketplaceEvent(body);
  if (!event) { res.statusCode = 400; res.end(); return; }
  // A per-instance volume budget bounds log amplification without recording IPs.
  // This is not a distributed rate limiter; use the platform WAF for abuse spikes.
  if (Date.now() - bucketStart > 60000) { bucketStart = Date.now(); accepted = 0; }
  if (++accepted > 250) { res.statusCode = 429; res.end(); return; }
  console.info(JSON.stringify({ source: 'marketplace-reliability', serverRelease: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 12), at: new Date().toISOString(), ...event }));
  res.statusCode = 204;
  res.end();
}
