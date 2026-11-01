import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';

// Run against a production preview. No credentials or production form submissions.
const require = createRequire(import.meta.url);
const base = process.env.PUBLIC_SITE_BASE || 'http://127.0.0.1:4174';
const output = 'artifacts/public-refinement';
const expectedModels = JSON.parse(await readFile('public/data/yilmazMachines.json', 'utf8')).length;
await mkdir(output, { recursive: true });
const browser = await chromium.launch(process.env.PUBLIC_SITE_CHROME === 'system' ? { channel: 'chrome' } : {});
const report = { base, timestamp: new Date().toISOString(), resources: [], pages: [] };
try {
  const resourceContext = await browser.newContext({ serviceWorkers: 'block' });
  for (const [url, status, type] of [
    ['/robots.txt', 200, /text\/plain/], ['/sitemap.xml', 200, /(?:application|text)\/xml/],
    ['/llms.txt', 200, /text\/(?:plain|markdown)/],
    ['/ai-catalog.json', 404, /text\/plain/], ['/.well-known/ai-catalog.json', 404, /text\/plain/],
  ]) {
    const response = await resourceContext.request.get(new URL(url, base).href);
    const body = await response.text();
    assert.equal(response.status(), status, url);
    assert.match(response.headers()['content-type'] || '', type, url);
    assert.doesNotMatch(body, /<!doctype\s+html/i, url);
    if (url === '/llms.txt') { assert.match(body, /^# ALMONA/m); assert.match(body, /\]\(https:\/\/www\.almona02\.com\//); }
    report.resources.push({ url, status: response.status(), type: response.headers()['content-type'] });
  }
  await resourceContext.close();

  // Google and other readers must receive actual catalogue data without executing JS.
  const noScript = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  const readable = await noScript.newPage();
  for (const url of ['/products', '/products/machines']) {
    const response = await readable.goto(new URL(url, base).href);
    assert.equal(response.status(), 200);
    assert.equal(await readable.locator('main article a').count(), expectedModels, 'All models must be present in HTML');
    assert.match(await readable.locator('main').innerText(), /ALM 6510/);
  }
  await readable.goto(new URL('/products/machines/ym-001', base).href);
  assert.equal(await readable.locator('h1').innerText(), 'ALM 6510');
  assert.ok(await readable.locator('main li').count() > 0, 'Model specifications must be HTML text');
  await readable.screenshot({ path: path.join(output, 'product-without-javascript.png'), fullPage: true });
  report.pages.push({ device: 'no-javascript', models: expectedModels, model: 'ALM 6510', specificationsReadable: true });
  await noScript.close();

  const recovery = await browser.newContext({ serviceWorkers: 'block', locale: 'en-EG' });
  await recovery.addInitScript(() => localStorage.setItem('saved_comparisons', '{broken-json'));
  const products = await recovery.newPage();
  const productErrors = [];
  products.on('pageerror', error => productErrors.push(error.message));
  await products.goto(new URL('/products/machines', base).href);
  await products.locator('#filtered-results h3:visible').first().waitFor({ state: 'visible', timeout: 30000 });
  assert.doesNotMatch(await products.locator('body').innerText(), /Something went wrong|Application Error/);
  assert.deepEqual(productErrors, [], 'Products page JavaScript errors');
  assert.equal(await products.locator('details nav a').count(), expectedModels, 'All model links remain discoverable after rendering');
  report.pages.push({ device: 'products-recovery', malformedComparisonTolerated: true, runtimeErrors: productErrors });
  const missingProduct = await recovery.request.get(new URL('/products/machines/not-a-real-model', base).href);
  assert.equal(missingProduct.status(), 404);
  await recovery.close();

  for (const [device, viewport] of [['mobile', { width: 412, height: 823 }], ['desktop', { width: 1350, height: 940 }]]) {
    const context = await browser.newContext({ viewport, locale: 'en-EG', serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('main h1').waitFor({ state: 'visible', timeout: 30000 });
    assert.doesNotMatch(await page.locator('body').innerText(), /Something went wrong|Application Error/);
    const firstHeading = await page.locator('main h1').innerText();
    await page.waitForTimeout(6500);
    assert.equal(await page.locator('main h1').innerText(), firstHeading, 'Carousel must start still');
    await page.screenshot({ path: path.join(output, `${device}.png`) });

    await page.getByRole('tab', { name: 'Go to slide 2' }).click();
    await page.waitForFunction(() => document.querySelector('main h1')?.textContent?.toLowerCase().includes('yilmaz'));
    await page.waitForTimeout(750);
    await page.getByRole('tab', { name: 'Go to slide 1' }).click();

    const contact = page.getByRole('button', { name: 'Open ALMONA WhatsApp contact', exact: true });
    if (await contact.count()) {
      await contact.click();
      const quickMessages = page.getByRole('button', { name: 'Toggle WhatsApp quick messages', exact: true });
      await quickMessages.waitFor({ state: 'visible' });
      assert.equal(await quickMessages.getAttribute('aria-expanded'), 'false');
      await quickMessages.click();
      assert.equal(await quickMessages.getAttribute('aria-expanded'), 'true');
      await page.getByRole('button', { name: 'Call ALMONA support', exact: true }).waitFor({ state: 'visible' });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const contactAccessibility = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'rule', values: ['button-name', 'aria-prohibited-attr'] } }));
      assert.deepEqual(contactAccessibility.violations.map(issue => issue.id), [], `${device} open contact accessibility`);
      await page.getByRole('button', { name: 'Close ALMONA WhatsApp contact', exact: true }).first().click();
      await quickMessages.waitFor({ state: 'hidden' });
    }
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog', { name: 'Global Command Menu' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Global Command Menu' }).waitFor({ state: 'hidden' });

    // Trigger the final section's intersection without relying on fixed scroll offsets.
    await page.locator('main > div').last().scrollIntoViewIfNeeded();
    await page.getByRole('heading', { name: 'ALM 6510', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    const specs = page.getByRole('link', { name: 'Download ALM 6510 specifications (PDF)', exact: true });
    assert.match(await specs.getAttribute('href'), /ALM-6510(?:-1)?\.pdf$/);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'rule', values: ['button-name', 'aria-prohibited-attr', 'color-contrast'] } }));
    assert.deepEqual(accessibility.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) })), [], `${device} accessibility regressions`);
    assert.deepEqual(errors, [], `${device} runtime errors`);
    report.pages.push({ device, firstHeading, accessibilityViolations: accessibility.violations.length, runtimeErrors: errors });
    await context.close();
  }

  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  for (const url of ['/dealer-verification-en', '/fabricator-pro-software-en', '/contact']) {
    await page.goto(new URL(url, base).href, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30000 });
    assert.doesNotMatch(await page.locator('body').innerText(), /Something went wrong|Application Error/);
  }
  await page.goto(new URL('/missing-public-smoke', base).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'), {}, { timeout: 30000 });
  await context.close();
  console.log('Public resource, mobile/desktop navigation, accessibility and missing-page checks passed.');
} finally {
  await writeFile(path.join(output, 'smoke.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
