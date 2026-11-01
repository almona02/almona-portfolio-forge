import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright';
import { compare, exitCode, pageFindings, parseSitemap, reportHtml, request, robotsAllowed, snapshot, type HttpEvidence, type Manifest, type PageEvidence, type Report, type Route } from './core';
const execAsync = promisify(execFile);

export async function auditPage(browser: Browser, base: string, route: Route): Promise<PageEvidence> {
  const url = new URL(route.path, base).href;
  const evidence: PageEvidence = { route, url, errors: [], brokenAssets: [] };
  try {
    const response = await request(url);
    const { body, ...http } = response;
    delete http.headers['set-cookie'];
    evidence.http = http; evidence.raw = snapshot(body, response.url);
  } catch (error) { evidence.errors.push(`HTTP measurement: ${String(error)}`); return evidence; }
  const context = await browser.newContext({ locale: route.language === 'en' ? 'en-EG' : 'ar-EG', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && ['script', 'stylesheet', 'image'].includes(response.request().resourceType())) evidence.brokenAssets.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', req => { if (['script', 'stylesheet', 'image'].includes(req.resourceType())) evidence.brokenAssets.push(`${req.failure()?.errorText} ${req.url()}`); });
  try {
    for (let attempt = 0; ; attempt++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }); break; }
      catch (error) { if (attempt === 2) throw error; }
    }
    // Poll semantic content rather than networkidle: analytics and chat can keep connections open.
    if (!route.missing) await page.waitForFunction(() => {
      const root = document.querySelector('main') || document.querySelector('#root') || document.body;
      const text = root.textContent?.trim() || '';
      return text.length > 80 && !!root.querySelector('h1');
    }, { }, { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(750);
    evidence.rendered = snapshot(await page.content(), page.url());
    if (new URL(page.url()).pathname !== new URL(url).pathname) evidence.errors.push(`Browser navigation changed path to ${page.url()}`);
  } catch (error) { evidence.errors.push(`Browser measurement: ${String(error)}`); }
  finally { await context.close(); }
  return evidence;
}

function structuredData(page: PageEvidence, report: Report) {
  if (!page.rendered) return;
  const nodes: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') { const node = value as Record<string, unknown>; nodes.push(node); Object.values(node).forEach(visit); }
  };
  page.rendered.schemas.forEach(visit);
  const products = nodes.filter(n => [n['@type']].flat().includes('Product'));
  const problems: string[] = [];
  if (!products.length) problems.push('No Product structured data');
  for (const product of products) {
    const name = String(product.name || '');
    if (!name || !page.rendered.text.includes(name)) problems.push('Product name missing or differs from visible content');
    for (const img of [product.image].flat()) { try { new URL(String(img)); } catch { problems.push('Product image must be an absolute URL'); } }
    if (product.image && ![product.image].flat().some(img => page.rendered!.images.includes(String(img)))) problems.push('No Product image matches a rendered image');
    if (!product.image) problems.push('Missing Product image');
    const offers = [product.offers].flat().filter(Boolean) as Record<string, unknown>[];
    for (const offer of offers) {
      if (!/^https?:\/\/schema.org\/UsedCondition$/.test(String(offer.itemCondition || product.itemCondition || ''))) problems.push('Missing itemCondition=UsedCondition');
      if (!/^\d+(\.\d+)?$/.test(String(offer.price ?? '')) || !/^[A-Z]{3}$/.test(String(offer.priceCurrency || ''))) problems.push('Invalid Offer price/currency');
      const digits = page.rendered.text.replace(/[,\s]/g, '');
      if (offer.price != null && !digits.includes(String(offer.price))) problems.push('Offer price not found in visible content');
      if (offer.priceCurrency === 'EGP' && !/(EGP|جنيه|ج\.م)/i.test(page.rendered.text)) problems.push('EGP currency not found in visible content');
      if (!offer.availability) problems.push('Offer availability absent');
    }
    if (!offers.length) problems.push('No Offer; rich-result eligibility requires separate review');
  }
  report.findings.push({ id: `${page.route.id}:product-schema`, status: problems.length ? 'fail' : 'pass', critical: false, evidence: [...new Set(problems)].join('; ') || 'Product/Offer basic checks match visible content; not a rich-result guarantee' });
}

export async function run(options: { base: string; manifest: Manifest; performance?: boolean; sitemapLimit?: number }): Promise<Report> {
  const base = new URL(options.base).origin;
  const mode = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(base).hostname) ? 'local' : 'deployed';
  let commit = 'unknown';
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* source archive */ }
  const report: Report = { schemaVersion: 1, timestamp: new Date().toISOString(), commit, baseUrl: base, mode, pages: [], findings: [], performance: [] };
  const add = (id: string, status: 'pass' | 'fail' | 'unknown' | 'not-applicable', evidence: string, critical = false) => report.findings.push({ id, status, evidence, critical });
  add('field-core-web-vitals', 'unknown', 'No field-data source configured; Lighthouse is lab data only');
  let robots: HttpEvidence | undefined;
  try {
    robots = await request(`${base}/robots.txt`);
    add('robots-response', robots.status === 200 && !/text\/html/i.test(robots.headers['content-type'] || '') && !/^\s*</.test(robots.body) ? 'pass' : robots.status >= 500 || robots.status === 429 ? 'unknown' : 'fail', `HTTP ${robots.status}; ${robots.headers['content-type']}`, true);
    const declarations = [...robots.body.matchAll(/^sitemap:\s*(\S+)/gim)].map(match => match[1]);
    add('robots-sitemap-declaration', declarations.includes(new URL('/sitemap.xml', options.manifest.canonicalOrigin).href) ? 'pass' : 'fail', declarations.join(', ') || 'No sitemap declaration');
  } catch (error) { add('robots-response', 'unknown', String(error), true); }
  let sitemapUrls: string[] = [];
  try {
    const response = await request(`${base}/sitemap.xml`);
    const parsed = parseSitemap(response.body);
    sitemapUrls = parsed.urls.filter(url => { try { return /^https?:$/.test(new URL(url).protocol); } catch { return false; } });
    const errors = [...parsed.errors];
    if (response.status !== 200 || !/(xml|text\/plain)/i.test(response.headers['content-type'] || '')) errors.push(`HTTP ${response.status}; ${response.headers['content-type']}`);
    add('sitemap-response', response.status >= 500 || response.status === 429 ? 'unknown' : errors.length ? 'fail' : 'pass', errors.join('; ') || `${sitemapUrls.length} valid entries`, true);
    add('sitemap-host', sitemapUrls.every(u => new URL(u).origin === options.manifest.canonicalOrigin) ? 'pass' : 'fail', 'All sitemap URLs should use the canonical origin');
    for (const route of options.manifest.routes.filter(r => r.critical)) add(`${route.id}:sitemap-coverage`, sitemapUrls.some(u => { try { return new URL(u).pathname.replace(/\/$/, '') === new URL(route.path, base).pathname.replace(/\/$/, ''); } catch { return false; } }) ? 'pass' : 'fail', route.path);
  } catch (error) { add('sitemap-response', 'unknown', String(error), true); }
  let browser: Browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (error) { add('browser-runner', 'unknown', String(error), true); return report; }
  try {
    const routes = [...options.manifest.routes];
    for (const route of routes) {
      console.log(`Auditing ${route.id}: ${route.path}`);
      const page = await auditPage(browser, base, route);
      report.pages.push(page);
      report.findings.push(...pageFindings(page, options.manifest.canonicalOrigin, mode === 'deployed'));
      if (robots && !route.missing) add(`${route.id}:robots`, robotsAllowed(robots.body, route.path) ? 'pass' : 'fail', 'Parsed Googlebot policy (does not verify Googlebot identity or access)', !!route.critical);
    }
    const market = report.pages.find(p => p.route.id === 'marketplace');
    const detail = market?.rendered?.links.find(link => {
      try { const u = new URL(link); return u.origin === base && /^\/used-machines\/[^/]+\/?$/.test(u.pathname) && !/\/sell\/?$/.test(u.pathname); }
      catch { return false; }
    });
    if (detail) {
      for (const language of ['ar', 'en']) {
        const path = `${new URL(detail).pathname}?lng=${language}`;
        const page = await auditPage(browser, base, { id: `listing-${language}`, path, language, critical: true });
        report.pages.push(page); report.findings.push(...pageFindings(page, options.manifest.canonicalOrigin, mode === 'deployed')); structuredData(page, report);
      }
    } else add('listing-coverage', 'unknown', market?.rendered ? 'No public detail anchor discovered; empty inventory and undiscoverable inventory cannot be distinguished externally' : 'Marketplace rendering unavailable');
    const home = report.pages.find(p => p.route.id === 'home');
    for (const language of ['ar', 'en']) {
      const listing = report.pages.find(p => p.route.id === `listing-${language}`);
      const marketplace = report.pages.find(p => p.route.id === (language === 'ar' ? 'marketplace' : 'marketplace-en'));
      if (listing) add(`listing-${language}:discovery`, marketplace?.rendered?.links.some(link => new URL(link).pathname === new URL(listing.url).pathname) ? 'pass' : 'fail', `Public detail anchor in ${language} marketplace`, true);
    }
    for (const page of report.pages.filter(p => p.rendered && !p.route.missing)) {
      console.log(`Validating canonical and language links: ${page.route.id}`);
      if (page.route.id !== 'home') add(`${page.route.id}:metadata-leak`, page.rendered!.title === home?.rendered?.title ? 'fail' : 'pass', 'Compare rendered title against homepage');
      const languages = [...new Set(page.rendered!.alternates.map(a => a.language))].sort();
      for (const language of languages) {
        const urls = [...new Set(page.rendered!.alternates.filter(a => a.language === language).map(a => a.url))];
        if (urls.length > 1) { add(`${page.route.id}:alternate:${language}`, 'fail', `Conflicting URLs for the same language: ${urls.join(', ')}`); continue; }
        let alternate: URL;
        try { alternate = new URL(urls[0]); }
        catch { add(`${page.route.id}:alternate:${language}`, 'fail', 'Malformed alternate URL'); continue; }
        const target = report.pages.find(p => p.rendered && new URL(p.url).pathname === alternate.pathname && new URL(p.url).search === alternate.search);
        const reciprocal = target?.rendered?.alternates.some(a => a.url.replace(/\/$/, '') === new URL(page.route.path, options.manifest.canonicalOrigin).href.replace(/\/$/, ''));
        add(`${page.route.id}:alternate:${language}`, !target ? 'unknown' : reciprocal ? 'pass' : 'fail', `${alternate.href}; reciprocity checked only for sampled pages`);
      }
      if (page.rendered!.canonicals.length === 1) {
        let canonical: URL;
        try { canonical = new URL(page.rendered!.canonicals[0]); }
        catch { add(`${page.route.id}:canonical-target`, 'fail', 'Malformed canonical URL', true); continue; }
        if (canonical.origin !== options.manifest.canonicalOrigin) continue;
        try {
          const response = await request(new URL(canonical.pathname + canonical.search, base).href);
          add(`${page.route.id}:canonical-target`, response.status === 200 ? 'pass' : response.status >= 500 || response.status === 429 ? 'unknown' : 'fail', `Canonical target HTTP ${response.status}`, true);
        } catch (error) { add(`${page.route.id}:canonical-target`, 'unknown', String(error), true); }
      }
    }
    const criticalPaths = new Set(report.pages.map(p => { const url = new URL(p.url); return url.pathname + url.search; }));
    let fetched = criticalPaths.size;
    for (const url of sitemapUrls) {
      if (fetched >= (options.sitemapLimit ?? 100)) break;
      let parsed: URL; try { parsed = new URL(url); } catch { continue; }
      if (parsed.origin !== options.manifest.canonicalOrigin || criticalPaths.has(parsed.pathname + parsed.search)) continue;
      fetched++;
      try { const response = await request(new URL(parsed.pathname + parsed.search, base).href); add(`sitemap-url:${parsed.pathname}`, response.status === 200 ? 'pass' : response.status >= 500 || response.status === 429 ? 'unknown' : 'fail', `HTTP ${response.status}`); }
      catch (error) { add(`sitemap-url:${parsed.pathname}`, 'unknown', String(error), true); }
    }
    if (mode === 'deployed') {
      for (const origin of ['https://almona02.com', options.manifest.canonicalOrigin]) {
        if (!new URL(base).hostname.endsWith('almona02.com')) { add(`host:${origin}`, 'not-applicable', 'Custom target; production host probes disabled'); continue; }
        try { const response = await request(origin); add(`host:${origin}`, new URL(response.url).origin === options.manifest.canonicalOrigin && response.status === 200 ? 'pass' : 'fail', JSON.stringify({ final: response.url, status: response.status, redirects: response.redirects }), true); }
        catch (error) { add(`host:${origin}`, 'unknown', String(error), true); }
      }
    } else add('canonical-host-redirects', 'not-applicable', 'Local preview does not test production redirects');
    try {
      const bot = await request(`${base}/used-machines`, 'Googlebot');
      add('googlebot-user-agent-diagnostic', 'pass', `Spoofed UA returned ${bot.status}; normal UA ${market?.http?.status ?? 'unknown'}. This does not prove real Googlebot access.`);
    } catch (error) { add('googlebot-user-agent-diagnostic', 'unknown', String(error)); }
  } finally { await browser.close(); }
  if (options.performance) {
    for (const path of ['/', '/used-machines', report.pages.find(p => p.route.id === 'listing-ar')?.route.path].filter((p): p is string => !!p)) {
      const runs: { performance: number | null; lcp: number | null; cls: number | null; tbt: number | null }[] = [];
      try {
        for (let i = 0; i < 3; i++) {
          console.log(`Lighthouse mobile ${path}: run ${i + 1}/3`);
          const heartbeat = setInterval(() => console.log(`Lighthouse measurement running: ${path}`), 45000);
          let raw: string;
          try {
            const result = await execAsync(process.execPath, ['node_modules/lighthouse/cli/index.js', new URL(path, base).href, '--output=json', '--quiet', '--chrome-flags=--headless --no-sandbox', '--only-categories=performance,seo', '--form-factor=mobile'], { encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024, env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
            raw = result.stdout;
          } finally { clearInterval(heartbeat); }
          const lhr = JSON.parse(raw) as { runtimeError?: { message: string }; categories: { performance: { score: number | null } }; audits: Record<string, { numericValue: number | null }> };
          if (lhr.runtimeError) throw Error(lhr.runtimeError.message);
          runs.push({ performance: lhr.categories.performance.score, lcp: lhr.audits['largest-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue, tbt: lhr.audits['total-blocking-time'].numericValue });
          if (Object.values(runs[runs.length - 1]).some(value => typeof value !== 'number' || !Number.isFinite(value))) throw Error('Lighthouse returned incomplete numeric measurements');
        }
        const median = (key: keyof typeof runs[number]) => runs.map(r => r[key]).filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)[1] ?? null;
        report.performance.push({ path, kind: 'mobile-lab', status: 'pass', runs, median: Object.fromEntries(['performance', 'lcp', 'cls', 'tbt'].map(key => [key, median(key as keyof typeof runs[number])])) });
      } catch (error) { report.performance.push({ path, kind: 'mobile-lab', status: 'unknown', runs, error: String(error) }); add(`performance:${path}`, 'unknown', 'Lighthouse measurement incomplete', true); }
    }
  } else add('lab-performance', 'not-applicable', 'Enable --performance for three mobile runs per sampled template');
  return report;
}

async function main() {
  const { values } = parseArgs({ options: { base: { type: 'string', default: 'https://www.almona02.com' }, manifest: { type: 'string', default: 'scripts/visibility/routes.json' }, baseline: { type: 'string' }, out: { type: 'string', default: 'artifacts/visibility' }, performance: { type: 'boolean', default: false }, 'sitemap-limit': { type: 'string', default: '100' } } });
  const manifest: Manifest = JSON.parse(readFileSync(values.manifest!, 'utf8'));
  if (!Array.isArray(manifest.routes) || !manifest.routes.length || !/^https?:$/.test(new URL(manifest.canonicalOrigin).protocol)) throw Error('Invalid manifest');
  if (new Set(manifest.routes.map(r => r.id)).size !== manifest.routes.length || manifest.routes.some(r => !r.path.startsWith('/') || r.path.startsWith('//'))) throw Error('Manifest IDs must be unique and paths relative');
  const limit = Number(values['sitemap-limit']); if (!Number.isInteger(limit) || limit < manifest.routes.length || limit > 100) throw Error('sitemap-limit must cover manifest routes and be <=100');
  mkdirSync(values.out!, { recursive: true });
  let report: Report;
  try { report = await run({ base: values.base!, manifest, performance: values.performance, sitemapLimit: limit }); }
  catch (error) { report = { schemaVersion: 1, commit: process.env.GITHUB_SHA || 'unknown', timestamp: new Date().toISOString(), baseUrl: values.base!, mode: /^https?:\/\/(localhost|127\.0\.0\.1)/.test(values.base!) ? 'local' : 'deployed', pages: [], findings: [{ id: 'runner', status: 'unknown', critical: true, evidence: String(error) }], performance: [] }; }
  if (values.baseline) {
    try { report.comparison = compare(JSON.parse(readFileSync(values.baseline, 'utf8')) as Report, report); }
    catch (error) { report.findings.push({ id: 'baseline-measurement', status: 'unknown', critical: true, evidence: String(error) }); }
  }
  writeFileSync(`${values.out}/report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${values.out}/report.html`, reportHtml(report));
  const summary = `## ALMONA visibility audit\n\nTarget: ${report.baseUrl} (${report.mode})\nCommit: ${report.commit}\nTime: ${report.timestamp}\n\n${['pass', 'fail', 'unknown', 'not-applicable'].map(status => `${status}: ${report.findings.filter(f => f.status === status).length}`).join(' | ')}\n\n${report.findings.filter(f => f.status === 'fail' || f.status === 'unknown').map(f => `- ${f.id}: ${f.status}${f.critical ? ' (critical)' : ''}`).join('\n')}\n\nBaseline changes: ${report.comparison?.length ?? 'not configured'}. See report artifact for evidence.\n`;
  writeFileSync(`${values.out}/summary.md`, summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary); process.exitCode = exitCode(report.findings);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(String(error)); process.exitCode = 2; });
