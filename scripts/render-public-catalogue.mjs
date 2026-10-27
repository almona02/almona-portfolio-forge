import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { yilmazMachines } from '../src/constants/yilmazMachines.ts';

const origin = 'https://www.almona02.com';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const safeUrl = value => typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https:\/\//.test(value)) ? value : '';
const productPath = machine => `/products/machines/${encodeURIComponent(machine.id)}`;
const navigation = '<nav aria-label="ALMONA"><a href="/">ALMONA</a> · <a href="/products/machines">Machine catalogue</a> · <a href="/contact">Contact ALMONA</a></nav>';
const terms = '<p>Request a written quotation for current price, availability, delivery and warranty. Confirm specifications for the exact model and configuration.</p>';
const styles = '<style id="public-catalog-style">.public-catalog{max-width:1100px;margin:auto;padding:6rem 1.5rem 3rem;color:#e5e7eb;background:#0d0f12;font:16px/1.6 system-ui}.public-catalog a{color:#fcd34d;text-decoration:underline}.public-catalog h1{font-size:2rem;margin:1.5rem 0}.public-catalog h2{font-size:1.3rem;margin:1rem 0}.public-catalog article{border-top:1px solid #475569;padding:1rem 0}.public-catalog img{max-width:100%;height:auto;max-height:280px;object-fit:contain}.public-catalog li{margin:.35rem 0}</style>';

export function validateCatalogue(machines) {
  if (!Array.isArray(machines) || !machines.length) throw new Error('Public catalogue is empty');
  const ids = new Set();
  for (const machine of machines) {
    if (!machine || !/^[a-zA-Z0-9_-]+$/.test(machine.id) || !machine.name || !machine.description || !Array.isArray(machine.specifications) || ids.has(machine.id)) throw new Error('Invalid or duplicate public machine');
    ids.add(machine.id);
  }
}

export function renderCatalogueDocument(template, machines, route, machine) {
  const dom = new JSDOM(template);
  const document = dom.window.document;
  const root = document.getElementById('root');
  if (!root) throw new Error('Built application is missing its root');
  const title = machine ? `${machine.name} | YILMAZ Machinery Egypt | Almona` : 'YILMAZ Machine Catalogue | Almona Egypt';
  const description = machine ? machine.description : 'Browse YILMAZ machinery for aluminium and UPVC workshops, with model specifications and documentation. Contact ALMONA for a written quotation.';
  document.title = title;
  document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
  for (const [selector, content] of [
    ['meta[name="description"]', description], ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', description], ['meta[property="og:url"]', origin + route],
    ['meta[name="twitter:title"]', title], ['meta[name="twitter:description"]', description],
  ]) document.querySelector(selector)?.setAttribute('content', content);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', origin + route);
  // The app's query-string language hints do not describe these English HTML documents.
  document.querySelectorAll('link[hreflang]').forEach(node => node.remove());
  document.body.querySelectorAll('noscript').forEach(node => node.remove());
  root.setAttribute('data-public-catalogue', 'true');

  let content;
  let schema;
  if (machine) {
    const image = safeUrl(machine.imageUrl);
    const spec = safeUrl(machine.specPdf);
    content = `<h1>${escape(machine.name)}</h1><p>${escape(machine.description)}</p>${image ? `<img src="${escape(image)}" alt="${escape(machine.name)}" loading="eager" decoding="async">` : ''}<h2>Specifications</h2><ul>${machine.specifications.map(item => `<li>${escape(item)}</li>`).join('')}</ul>${spec ? `<p><a href="${escape(spec)}">Download ${escape(machine.name)} specifications (PDF)</a></p>` : ''}${terms}`;
    schema = { '@context': 'https://schema.org', '@type': 'Product', name: machine.name, description: machine.description, sku: machine.id, brand: { '@type': 'Brand', name: 'YILMAZ' }, url: origin + route, ...(image ? { image: new URL(image, origin).href } : {}) };
  } else {
    content = `<h1>YILMAZ machinery for aluminium and UPVC workshops</h1>${terms}<p>${machines.length} machine models. Interactive filters become available when the application loads.</p>${machines.map(item => `<article><h2><a href="${productPath(item)}">${escape(item.name)}</a></h2><p>${escape(item.description)}</p></article>`).join('')}`;
    schema = { '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: machines.length, itemListElement: machines.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: origin + productPath(item) })) };
    const bootstrap = document.createElement('script'); bootstrap.id = 'almona-catalog-data'; bootstrap.type = 'application/json'; bootstrap.textContent = json(machines); document.head.append(bootstrap);
  }
  root.innerHTML = `<main class="public-catalog">${navigation}${content}</main><script type="application/ld+json">${json(schema)}</script>`;
  document.head.insertAdjacentHTML('beforeend', styles);
  const html = dom.serialize();
  dom.window.close();
  return html;
}

export async function renderPublicCatalogue(directory = 'dist') {
  const machines = yilmazMachines;
  await writeFile(path.join(directory, 'data/yilmazMachines.json'), JSON.stringify(machines, null, 2) + '\n');
  validateCatalogue(machines);
  const template = await readFile(path.join(directory, 'index.html'), 'utf8');
  for (const [route, output] of [['/products', 'catalogue-products.html'], ['/products/machines', 'catalogue-machines.html']]) {
    await writeFile(path.join(directory, output), renderCatalogueDocument(template, machines, route));
  }
  await mkdir(path.join(directory, 'products/machines'), { recursive: true });
  await mkdir(path.join(directory, 'catalogue-models'), { recursive: true });
  for (const machine of machines) {
    const html = renderCatalogueDocument(template, machines, productPath(machine), machine);
    await writeFile(path.join(directory, 'products/machines', `${machine.id}.html`), html);
    await writeFile(path.join(directory, 'catalogue-models', `${machine.id}.html`), html);
  }
  const sitemapPath = path.join(directory, 'sitemap.xml');
  let sitemap = await readFile(sitemapPath, 'utf8');
  sitemap = sitemap.replace(/https:\/\/www\.almona02\.com\/products\/machines\/[a-zA-Z0-9_-]+\.html/g, value => value.slice(0, -5));
  for (const machine of machines) {
    const url = origin + productPath(machine);
    if (!sitemap.includes(`<loc>${url}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${url}</loc></url>\n</urlset>`);
  }
  await writeFile(sitemapPath, sitemap);
  console.log(`Rendered two public catalogues and ${machines.length} machine documents from the authoritative machine source.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await renderPublicCatalogue();
