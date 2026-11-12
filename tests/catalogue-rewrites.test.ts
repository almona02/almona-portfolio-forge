/**
 * Catalogue rewrite routing test.
 *
 * /products, /products/machines and /products/machines/:machineId have both
 * prerendered static HTML (for crawlers) and a React SPA (for humans).
 * vercel.json must serve the static catalogue only to crawler user-agents;
 * everyone else must fall through to /index so the app boots.
 *
 * Regression test: humans once received the text-only crawler page because
 * the catalogue rewrites were unconditional.
 *
 * Run: npm run test -- tests/catalogue-rewrites.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
const rewrites = vercel.rewrites as Array<{
  source: string;
  destination: string;
  has?: Array<{ type: string; key: string; value: string }>;
}>;

// [route source, static catalogue destination]
const CATALOGUE_ROUTES: Array<[string, string]> = [
  ['/products', '/catalogue-products'],
  ['/products/machines', '/catalogue-machines'],
  ['/products/machines/:machineId', '/catalogue-models/:machineId'],
];

const BROWSER_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

const CRAWLER_UAS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Twitterbot/1.0',
  'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  'WhatsApp/2.19.81 A',
  'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
];

function botRewriteFor(source: string, destination: string) {
  return rewrites.find(
    (r) =>
      r.source === source &&
      r.destination === destination &&
      r.has?.some((c) => c.type === 'header' && c.key.toLowerCase() === 'user-agent'),
  );
}

describe('catalogue rewrites', () => {
  it.each(CATALOGUE_ROUTES)('%s serves static HTML only to crawlers', (source, destination) => {
    const rule = botRewriteFor(source, destination);
    expect(rule, `missing bot-conditioned rewrite ${source} -> ${destination}`).toBeDefined();
    const pattern = new RegExp(rule!.has!.find((c) => c.key.toLowerCase() === 'user-agent')!.value);
    for (const ua of CRAWLER_UAS) expect(pattern.test(ua), `crawler UA not matched: ${ua}`).toBe(true);
    for (const ua of BROWSER_UAS) expect(pattern.test(ua), `browser UA wrongly matched: ${ua}`).toBe(false);
  });

  it.each(CATALOGUE_ROUTES)('%s falls through to the SPA for humans', (source) => {
    const botIndex = rewrites.findIndex(
      (r) => r.source === source && r.destination !== '/index' && (r.has?.length ?? 0) > 0,
    );
    const spaIndex = rewrites.findIndex((r) => r.source === source && r.destination === '/index' && !r.has);
    expect(spaIndex, `missing human fallback ${source} -> /index`).toBeGreaterThanOrEqual(0);
    expect(spaIndex, `human fallback for ${source} must come after the bot rule`).toBeGreaterThan(botIndex);
  });

  it('no unconditional rewrite sends catalogue routes to static documents', () => {
    for (const [source] of CATALOGUE_ROUTES) {
      const unconditional = rewrites.filter((r) => r.source === source && !r.has);
      for (const r of unconditional) {
        expect(r.destination, `unconditional static rewrite for ${source}`).toBe('/index');
      }
    }
  });
});
