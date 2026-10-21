import { JSDOM } from 'jsdom';

export type Status = 'pass' | 'fail' | 'unknown' | 'not-applicable';
export interface Finding { id: string; status: Status; critical: boolean; evidence: string }
export interface Snapshot {
  title: string; description: string; canonicals: string[]; robots: string[];
  headings: string[]; links: string[]; alternates: { language: string; url: string }[];
  language: string; direction: string; text: string; images: string[]; schemas: unknown[]; schemaErrors: string[];
}
export interface Route { id: string; path: string; critical?: boolean; language?: string; missing?: boolean }
export interface Manifest { canonicalOrigin: string; routes: Route[] }
export interface HttpEvidence {
  url: string; status: number; headers: Record<string, string>; body: string;
  redirects: { url: string; status: number; location: string }[];
}
export interface PageEvidence {
  route: Route; url: string; http?: Omit<HttpEvidence, 'body'>; raw?: Snapshot; rendered?: Snapshot;
  errors: string[]; brokenAssets: string[];
}
export interface Report {
  schemaVersion: 1; commit: string; timestamp: string; baseUrl: string; mode: 'local' | 'deployed';
  findings: Finding[]; pages: PageEvidence[]; performance: unknown[]; comparison?: Delta[];
}
export interface Delta { id: string; before: Status | 'absent'; after: Status | 'absent'; metrics?: { before: unknown; after: unknown } }

export function snapshot(html: string, url: string): Snapshot {
  const dom = new JSDOM(html, { url });
  const d = dom.window.document;
  const schemas: unknown[] = [], schemaErrors: string[] = [];
  d.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
    try { schemas.push(JSON.parse(el.textContent || '')); } catch { schemaErrors.push('Invalid JSON-LD'); }
  });
  const result: Snapshot = {
    title: d.title.trim(), description: d.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonicals: Array.from(d.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')).map(el => el.href),
    robots: Array.from(d.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')).map(el => el.getAttribute('content') || ''),
    headings: Array.from(d.querySelectorAll('h1')).map(el => el.textContent?.trim() || ''),
    links: Array.from(d.querySelectorAll<HTMLAnchorElement>('a[href]')).map(el => el.href),
    alternates: Array.from(d.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')).map(el => ({ language: el.hreflang, url: el.href })),
    language: d.documentElement.lang, direction: d.documentElement.dir,
    text: '', images: Array.from(d.querySelectorAll<HTMLImageElement>('img[src]')).map(el => el.src), schemas, schemaErrors,
  };
  d.querySelectorAll('script,style,noscript,nav,header,footer').forEach(el => el.remove());
  result.text = (d.querySelector('main') || d.body)?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 12000) || '';
  dom.window.close();
  return result;
}

export function parseSitemap(body: string): { urls: string[]; errors: string[] } {
  try {
    const dom = new JSDOM(body, { contentType: 'application/xml' });
    const root = dom.window.document.documentElement;
    const errors: string[] = [];
    if (root.localName !== 'urlset' && root.localName !== 'sitemapindex') errors.push('Not a sitemap XML root');
    if (root.namespaceURI !== 'http://www.sitemaps.org/schemas/sitemap/0.9') errors.push('Invalid sitemap namespace');
    if (root.localName === 'sitemapindex') errors.push('Sitemap index traversal is unsupported; configure a URL-set endpoint');
    const entries = Array.from(root.children);
    for (const entry of entries) {
      if (entry.localName !== (root.localName === 'sitemapindex' ? 'sitemap' : 'url') || entry.namespaceURI !== root.namespaceURI) errors.push('Invalid sitemap entry element');
      if (Array.from(entry.children).filter(child => child.localName === 'loc').length !== 1) errors.push('Each entry must contain exactly one loc');
      const modified = Array.from(entry.children).find(child => child.localName === 'lastmod')?.textContent?.trim();
      if (modified && (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(modified) || !Number.isFinite(Date.parse(modified)))) errors.push(`Invalid lastmod: ${modified}`);
    }
    const urls = entries.map(el => Array.from(el.children).find(child => child.localName === 'loc')?.textContent?.trim() || '');
    for (const url of urls) { try { if (!/^https?:$/.test(new URL(url).protocol)) throw Error(); } catch { errors.push(`Invalid loc: ${url}`); } }
    if (!urls.length) errors.push('Empty sitemap');
    if (new Set(urls).size !== urls.length) errors.push('Duplicate loc entries');
    dom.window.close();
    return { urls, errors };
  } catch { return { urls: [], errors: ['Malformed XML'] }; }
}

// Longest matching rule wins; Allow wins ties. Groups with the same specificity are combined.
export function robotsAllowed(body: string, path: string, agent = 'Googlebot'): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; pattern: string }[] }[] = [];
  let group: typeof groups[number] | undefined;
  for (const line of body.split(/\r?\n/)) {
    const match = line.split('#')[0].trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && group && value) group.rules.push({ allow: key === 'allow', pattern: value });
  }
  const score = (g: typeof groups[number]) => Math.max(-1, ...g.agents.map(a => a === '*' ? 0 : agent.toLowerCase().includes(a) ? a.length : -1));
  const best = Math.max(-1, ...groups.map(score));
  const rules = groups.filter(g => score(g) === best).flatMap(g => g.rules).filter(r => {
    const escaped = r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    return new RegExp(`^${escaped}`).test(path);
  }).sort((a, b) => b.pattern.replace(/\*/g, '').length - a.pattern.replace(/\*/g, '').length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow ?? true;
}

export async function request(url: string, userAgent = 'ALMONA-Visibility-Audit/1.0', retries = 2): Promise<HttpEvidence> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let current = url;
      const redirects: HttpEvidence['redirects'] = [];
      for (let hop = 0; hop < 11; hop++) {
        const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': userAgent } });
        const location = response.headers.get('location');
        if ([301, 302, 303, 307, 308].includes(response.status) && location) {
          redirects.push({ url: current, status: response.status, location });
          await response.body?.cancel();
          current = new URL(location, current).href;
          continue;
        }
        if ((response.status >= 500 || response.status === 429) && attempt < retries) { await response.body?.cancel(); throw Error(`Transient HTTP ${response.status}`); }
        return { url: current, status: response.status, headers: Object.fromEntries(response.headers.entries()), body: await response.text(), redirects };
      }
      throw Error('Redirect limit exceeded');
    } catch (error) { last = error; if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1))); }
  }
  throw last;
}

export function pageFindings(page: PageEvidence, canonicalOrigin: string, deployed: boolean): Finding[] {
  const out: Finding[] = [];
  const add = (name: string, status: Status, evidence: string, critical = false) => out.push({ id: `${page.route.id}:${name}`, status, evidence, critical });
  if (!page.http) { add('fetch', 'unknown', page.errors.join('; '), true); return out; }
  const { status, headers } = page.http;
  if (page.route.missing) {
    add('missing-status', [404, 410].includes(status) ? 'pass' : 'fail', `HTTP ${status}; a 200 error page can be a soft 404`);
    return out;
  }
  add('http', status === 200 ? 'pass' : status >= 500 || status === 429 ? 'unknown' : 'fail', `HTTP ${status}`, !!page.route.critical);
  add('mime', /text\/html/i.test(headers['content-type'] || '') ? 'pass' : 'fail', headers['content-type'] || 'Absent content-type', true);
  add('header-indexability', /\b(noindex|none)\b/i.test(headers['x-robots-tag'] || '') ? 'fail' : 'pass', headers['x-robots-tag'] || 'No restrictive header', true);
  if (!page.rendered) { add('render', 'unknown', page.errors.join('; ') || 'No browser evidence', true); return out; }
  const s = page.rendered;
  add('content', s.text.length >= 80 && s.headings.some(Boolean) && !/machine not found/i.test(s.text) && !/^(loading|sign in|log in)[….\s]*$/i.test(s.text) ? 'pass' : 'fail', `${s.text.length} text characters; ${s.headings.length} H1 headings`, !!page.route.critical);
  add('metadata', s.title && s.description ? 'pass' : 'fail', `Title: ${s.title}; description: ${s.description}`);
  add('meta-indexability', [...s.robots, ...(page.raw?.robots || [])].some(r => /\b(noindex|none)\b/i.test(r)) ? 'fail' : 'pass', [...s.robots, ...(page.raw?.robots || [])].join('; ') || 'No restrictive raw or rendered meta', true);
  const expected = new URL(page.route.path, canonicalOrigin); expected.search = '';
  add('canonical', s.canonicals.length === 1 && s.canonicals[0].replace(/\/$/, '') === expected.href.replace(/\/$/, '') ? 'pass' : 'fail', s.canonicals.join(', ') || 'Missing canonical', true);
  add('javascript-dependency', 'pass', page.raw && page.raw.text.length >= 80 && page.raw.headings.length ? 'Main content present in response HTML' : 'Main content depends on JavaScript; diagnostic only');
  add('raw-rendered-metadata', page.raw?.title === s.title && JSON.stringify(page.raw?.canonicals) === JSON.stringify(s.canonicals) ? 'pass' : 'fail', 'Response/rendered title and canonical consistency; differences are advisory');
  add('schema-json', s.schemaErrors.length ? 'fail' : 'pass', s.schemaErrors.join('; ') || `${s.schemas.length} JSON-LD blocks`);
  add('assets', page.brokenAssets.length ? 'fail' : 'pass', page.brokenAssets.join('; ') || 'No failed script, stylesheet or image requests');
  add('browser-errors', page.errors.length ? 'fail' : 'pass', page.errors.join('; ') || 'No uncaught browser errors');
  if (page.route.language) add('language', s.language.startsWith(page.route.language) && (page.route.language === 'ar' ? s.direction === 'rtl' : s.direction !== 'rtl') ? 'pass' : 'fail', `lang=${s.language}, dir=${s.direction}`);
  add('deployment-headers', deployed ? 'pass' : 'not-applicable', deployed ? 'Observed deployed HTTP response; not an assertion of Vercel configuration correctness' : 'Local preview cannot validate Vercel headers or rewrites');
  return out;
}

export function compare(before: Report, after: Report): Delta[] {
  if (before.schemaVersion !== 1 || after.schemaVersion !== 1) throw Error('Unsupported report schema');
  if (before.mode !== after.mode || new URL(before.baseUrl).origin !== new URL(after.baseUrl).origin) throw Error('Baseline target/mode differs');
  const a = new Map(before.findings.map(f => [f.id, f.status])), b = new Map(after.findings.map(f => [f.id, f.status]));
  const changes: Delta[] = [...new Set([...a.keys(), ...b.keys()])].sort().filter(id => a.get(id) !== b.get(id)).map(id => ({ id, before: a.get(id) || 'absent', after: b.get(id) || 'absent' }));
  type Lab = { path: string; status: Status; median?: unknown };
  const labs = (report: Report) => new Map((report.performance as Lab[]).map(p => [p.path, p]));
  const oldLab = labs(before), newLab = labs(after);
  for (const path of [...new Set([...oldLab.keys(), ...newLab.keys()])].sort()) {
    const old = oldLab.get(path), current = newLab.get(path);
    if (old?.status !== current?.status || JSON.stringify(old?.median) !== JSON.stringify(current?.median)) changes.push({ id: `lab:${path}`, before: old?.status || 'absent', after: current?.status || 'absent', metrics: { before: old?.median ?? null, after: current?.median ?? null } });
  }
  return changes;
}
export function exitCode(findings: Finding[]): number {
  if (findings.some(f => f.critical && f.status === 'unknown')) return 2;
  return findings.some(f => f.critical && f.status === 'fail') ? 1 : 0;
}
export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function reportHtml(report: Report): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>ALMONA visibility audit</title><style>body{font:16px system-ui;margin:2rem}td,th{padding:.5rem;border:1px solid #ccc;text-align:left}table{border-collapse:collapse}.fail{background:#ffe3e3}.unknown{background:#fff0c0}pre{white-space:pre-wrap}</style><h1>ALMONA technical visibility</h1><p>${escapeHtml(report.timestamp)} | ${escapeHtml(report.commit)} | ${escapeHtml(report.baseUrl)} | ${report.mode}</p><p>Technical readiness only. No claim of Googlebot access, indexing or rankings.</p><table><tr><th>Check</th><th>Status</th><th>Gate</th><th>Evidence</th></tr>${report.findings.map(f => `<tr class="${f.status}"><td>${escapeHtml(f.id)}</td><td>${f.status}</td><td>${f.critical ? 'critical' : 'advisory'}</td><td>${escapeHtml(f.evidence)}</td></tr>`).join('')}</table><h2>Baseline changes</h2><pre>${escapeHtml(JSON.stringify(report.comparison || [], null, 2))}</pre><h2>Lab performance (field data separate)</h2><pre>${escapeHtml(JSON.stringify(report.performance, null, 2))}</pre><h2>Page evidence</h2><pre>${escapeHtml(JSON.stringify(report.pages, null, 2))}</pre></html>`;
}
