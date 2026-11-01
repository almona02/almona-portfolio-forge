import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { resourceBoundary } from '../../vite.publicResources';
import manifest from './publicImageVariants.json';

describe('public resource delivery', () => {
  it('keeps crawler files and both catalog paths out of the deployed SPA rewrite', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.rewrites.every((rule: { destination: string }) => !rule.destination.endsWith('.html'))).toBe(true);
    const catchAll = new RegExp(`^${config.rewrites.at(-1).source}$`);
    for (const url of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/ai-catalog.json', '/.well-known/ai-catalog.json', '/missing.js']) {
      expect(catchAll.test(url), url).toBe(false);
    }
    expect(catchAll.test('/contact')).toBe(true);
    expect(catchAll.test('/unknown-page')).toBe(true);
  });

  it('returns 404 for unavailable resources while preserving real files and app routes', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'almona-resources-'));
    try {
      writeFileSync(path.join(root, 'robots.txt'), 'User-agent: *\nAllow: /\n');
      const middleware = resourceBoundary(root);
      for (const [url, expected] of [['/robots.txt', 200], ['/contact', 200], ['/api/config.json', 200], ['/llms.txt', 404], ['/.well-known/ai-catalog.json', 404], ['/ai-catalog.json', 404]] as const) {
        const response = { statusCode: 200, setHeader() {}, end() {} };
        let next = false;
        middleware({ url } as IncomingMessage, response as unknown as ServerResponse, () => { next = true; });
        expect(response.statusCode, url).toBe(expected);
        expect(next, url).toBe(expected === 200);
      }
      let sourceModulePassed = false;
      resourceBoundary(root, true)({ url: '/src/data.json?import' } as IncomingMessage, {} as ServerResponse, () => { sourceModulePassed = true; });
      expect(sourceModulePassed).toBe(true);
    } finally {
      if (path.dirname(root) !== path.resolve(tmpdir()) || !path.basename(root).startsWith('almona-resources-')) throw new Error('Unexpected test directory');
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ships real WebP widths matching every generated descriptor', async () => {
    for (const image of Object.values(manifest)) {
      const urls = new Set<string>();
      for (const variant of image.variants) {
        const metadata = await sharp(path.join('public', variant.src)).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(variant.width);
        expect(urls.has(variant.src)).toBe(false);
        urls.add(variant.src);
      }
    }
  });
});
