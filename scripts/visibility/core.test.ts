import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { compare, exitCode, pageFindings, parseSitemap, reportHtml, request, robotsAllowed, snapshot, type Report } from './core';
import { auditPage, run } from './run';

let server: Server, base: string, browser: Browser;
const html = (extra = '') => `<html lang="ar" dir="rtl"><head><title>Fixture</title><meta name="description" content="Fixture description">${extra}</head><body><main><h1>Used machine</h1><p>${'Public machine content '.repeat(8)}</p><a href="/used-machines/one">Detail</a></main></body></html>`;
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/robots.txt') { res.setHeader('content-type', 'text/plain'); res.end('User-agent: *\nAllow: /'); return; }
    if (req.url === '/sitemap.xml') { res.setHeader('content-type', 'application/xml'); res.end(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url><url><loc>${base}/used-machines</loc></url></urlset>`); return; }
    if (req.url === '/loop') { res.writeHead(302, { location: '/loop' }); res.end(); return; }
    if (req.url === '/blocked') { res.writeHead(403); res.end('Forbidden'); return; }
    if (req.url === '/empty') { res.setHeader('content-type', 'text/html'); res.end('<h1>Marketplace</h1><p>No listings</p>'); return; }
    if (req.url === '/unavailable') { res.writeHead(404); res.end('Machine not found'); return; }
    res.setHeader('content-type', 'text/html');
    res.setHeader('set-cookie', 'fixture_session=do-not-persist; HttpOnly; Path=/');
    if (req.url === '/delayed') { res.end(`<html lang="en"><body><main id="content">Loading…</main><script>setTimeout(()=>document.querySelector('main').innerHTML=${JSON.stringify(`<h1>Ready</h1><p>${'Delayed content '.repeat(12)}</p>`)},300)</script></body></html>`); return; }
    res.end(html(`<link rel="canonical" href="${base}/"><link rel="canonical" href="${base}/duplicate"><script type="application/ld+json">{bad}</script>`));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  browser = await chromium.launch();
});
afterAll(async () => { await browser?.close(); await new Promise<void>(resolve => server?.close(() => resolve())); });

describe('technical visibility evidence', () => {
  it('rejects HTML masquerading as a sitemap and malformed XML', () => {
    expect(parseSitemap(html()).errors.length).toBeGreaterThan(0);
    expect(parseSitemap('<urlset>').errors).toContain('Malformed XML');
    expect(parseSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><wrong><loc>https://example.com/</loc></wrong></urlset>').errors).toContain('Invalid sitemap entry element');
    expect(parseSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>').errors).toEqual([]);
  });
  it('honors specific robots groups, wildcards and allow exceptions', () => {
    const rules = 'User-agent: *\nDisallow: /\nUser-agent: Googlebot\nDisallow: /private/*\nAllow: /private/public$';
    expect(robotsAllowed(rules, '/marketplace')).toBe(true);
    expect(robotsAllowed(rules, '/private/x')).toBe(false);
    expect(robotsAllowed(rules, '/private/public')).toBe(true);
    expect(robotsAllowed(rules, '/', 'OtherBot')).toBe(false);
  });
  it('rejects redirect loops without disguising them as a 404', async () => {
    await expect(request(`${base}/loop`, undefined, 0)).rejects.toThrow('Redirect limit');
  });
  it('finds duplicate canonicals, invalid JSON-LD and distinguishes local evidence', async () => {
    const page = await auditPage(browser, base, { id: 'home', path: '/', critical: true });
    const findings = pageFindings(page, base, false);
    expect(findings.find(f => f.id === 'home:canonical')?.status).toBe('fail');
    expect(findings.find(f => f.id === 'home:schema-json')?.status).toBe('fail');
    expect(findings.find(f => f.id === 'home:deployment-headers')?.status).toBe('not-applicable');
    expect(page.rendered?.links).toContain(`${base}/used-machines/one`);
    expect(page.http?.headers['set-cookie']).toBeUndefined();
  });
  it('waits for delayed rendered content in a fresh anonymous browser', async () => {
    const page = await auditPage(browser, base, { id: 'delayed', path: '/delayed', language: 'en' });
    expect(page.raw?.headings).toEqual([]);
    expect(page.rendered?.headings).toEqual(['Ready']);
  });
  it('distinguishes denied, empty inventory, unavailable listing and network outage', async () => {
    expect((await request(`${base}/blocked`)).status).toBe(403);
    expect(snapshot((await request(`${base}/empty`)).body, base).links).toEqual([]);
    expect((await request(`${base}/unavailable`)).status).toBe(404);
    await expect(request('http://127.0.0.1:1/', undefined, 0)).rejects.toThrow();
  });
  it('flags a 200 missing page as a soft 404', () => {
    expect(pageFindings({ route: { id: 'missing', path: '/missing', missing: true }, url: base, http: { url: base, status: 200, headers: {}, redirects: [] }, errors: [], brokenAssets: [] }, base, true)[0].status).toBe('fail');
  });
  it('produces stable deltas and prevents cross-environment comparisons', () => {
    const report: Report = { schemaVersion: 1, commit: 'test', timestamp: '', baseUrl: base, mode: 'local', findings: [{ id: 'x', status: 'pass', critical: true, evidence: '' }], pages: [], performance: [] };
    expect(compare(report, { ...report, timestamp: 'different' })).toEqual([]);
    expect(compare(report, { ...report, findings: [] })).toEqual([{ id: 'x', before: 'pass', after: 'absent' }]);
    expect(() => compare(report, { ...report, mode: 'deployed' })).toThrow();
    expect(reportHtml({ ...report, commit: '<script>bad</script>' })).not.toContain('<script>bad</script>');
    expect(exitCode([{ id: 'x', status: 'unknown', critical: true, evidence: '' }])).toBe(2);
    expect(exitCode([{ id: 'x', status: 'fail', critical: true, evidence: '' }])).toBe(1);
    expect(compare({ ...report, performance: [{ path: '/', status: 'pass', median: { lcp: 1000 } }] }, { ...report, performance: [{ path: '/', status: 'pass', median: { lcp: 1500 } }] })[0].metrics).toEqual({ before: { lcp: 1000 }, after: { lcp: 1500 } });
  });
  it('audits discoverable listing variants anonymously and reports deliberate critical defects', async () => {
    const report = await run({ base, manifest: { canonicalOrigin: base, routes: [{ id: 'home', path: '/', critical: true }, { id: 'marketplace', path: '/used-machines', critical: true }, { id: 'marketplace-en', path: '/used-machines?lng=en', critical: true }] } });
    expect(report.pages.some(p => p.route.id === 'listing-ar')).toBe(true);
    expect(report.pages.some(p => p.route.id === 'listing-en')).toBe(true);
    expect(report.findings.find(f => f.id === 'listing-en:discovery')?.status).toBe('pass');
    expect(report.findings.find(f => f.id === 'home:canonical')?.critical).toBe(true);
    expect(exitCode(report.findings)).toBe(1);
    expect(new Set(report.findings.map(f => f.id)).size).toBe(report.findings.length);
  });
});
