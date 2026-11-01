import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { renderCatalogueDocument, validateCatalogue } from './render-public-catalogue.mjs';

const machines = JSON.parse(readFileSync('public/data/yilmazMachines.json', 'utf8'));
const template = '<!doctype html><html lang="ar"><head><title>App</title><meta name="description" content="App"><meta property="og:title" content="App"><meta property="og:description" content="App"><meta property="og:url" content="https://www.almona02.com/"><link rel="canonical" href="https://www.almona02.com/" data-rh="true"></head><body><div id="root"><div>Loading</div></div><noscript>Generic fallback</noscript><script type="module" src="/assets/app.js"></script></body></html>';

test('catalogue HTML contains all public models and a matching bootstrap before JavaScript', () => {
  validateCatalogue(machines);
  const dom = new JSDOM(renderCatalogueDocument(template, machines, '/products/machines'));
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll('main article a').length, machines.length);
  assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://www.almona02.com/products/machines');
  assert.equal(JSON.parse(doc.getElementById('almona-catalog-data').textContent).length, machines.length);
  assert.ok(doc.querySelector('script[src="/assets/app.js"]'), 'Interactive application remains available');
  assert.equal(doc.querySelector('noscript'), null);
  dom.window.close();
});

test('model HTML exposes specifications, a canonical and truthful Product data without fabricated offers', () => {
  const machine = machines.find(item => item.id === 'ym-001');
  const dom = new JSDOM(renderCatalogueDocument(template, machines, '/products/machines/ym-001', machine));
  const doc = dom.window.document;
  assert.equal(doc.querySelector('h1').textContent, machine.name);
  assert.equal(doc.querySelectorAll('main li').length, machine.specifications.length);
  const schema = JSON.parse(doc.querySelector('#root script[type="application/ld+json"]').textContent);
  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.sku, machine.id);
  assert.equal(schema.offers, undefined);
  dom.window.close();
});

test('catalogue text cannot inject executable HTML or close the bootstrap script', () => {
  const changed = [{ ...machines[0], name: '<img src=x onerror=alert(1)>', description: '</script><script id="injected">bad()</script>' }];
  const dom = new JSDOM(renderCatalogueDocument(template, changed, '/products'));
  assert.equal(dom.window.document.querySelector('#injected'), null);
  assert.equal(dom.window.document.querySelector('article h2').textContent, changed[0].name);
  assert.deepEqual(JSON.parse(dom.window.document.getElementById('almona-catalog-data').textContent), changed);
  dom.window.close();
});

test('invalid or duplicate model IDs fail the build', () => {
  assert.throws(() => validateCatalogue([machines[0], machines[0]]));
  assert.throws(() => validateCatalogue([{ ...machines[0], id: '../escape' }]));
});
