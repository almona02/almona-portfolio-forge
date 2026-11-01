import { expect, test, type BrowserContext } from '@playwright/test';
import { serveBuiltApp } from './appFixture';

const rows = Array.from({ length: 6 }, (_, index) => ({
  id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`, title: `Reliable saw ${index + 1}`, price: 10000, currency: 'EGP',
  location: 'Cairo', condition: 'good', category: 'Saw', year: 2020, hours: 100, description: 'A working machine for the local acceptance test.',
  contact_name: 'Test seller', contact_phone: '01000000000', contact_whatsapp: null, images: [], status: 'active', views: 0, created_at: new Date().toISOString(),
}));
async function mockMarketplace(context: BrowserContext, origin: string, inventoryOutage = false, loseInsertResponse = false) {
  let inventoryUnavailable = inventoryOutage;
  let inserts = 0;
  let stored: Record<string, unknown> | null = null;
  await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin === origin || url.protocol === 'blob:' || url.protocol === 'data:') { await route.continue(); return; }
    if (url.pathname.includes('/rest/v1/used_machine_listings')) {
      if (request.method() === 'POST') {
        inserts++; stored = { ...rows[0], ...request.postDataJSON() };
        if (loseInsertResponse) { await route.abort('failed'); return; }
        await route.fulfill({ json: stored, status: 201 }); return;
      }
      if (url.searchParams.has('id')) {
        const id = url.searchParams.get('id')!.replace(/^eq\./, '');
        const found = stored?.id === id ? stored : rows.find(row => row.id === id);
        await route.fulfill({ json: found ? [found] : [] }); return;
      }
      if (inventoryUnavailable) { await route.fulfill({ status: 503, json: { message: 'Test network interruption' } }); return; }
      await route.fulfill({ json: stored ? [...rows, stored] : rows }); return;
    }
    if (url.pathname.startsWith('/storage/v1/object/')) { await route.fulfill({ json: { Key: 'test-photo' } }); return; }
    if (url.pathname.startsWith('/rest/v1/')) { await route.fulfill({ json: [] }); return; }
    await route.abort('failed');
  });
  return { inserts: () => inserts, restoreInventory: () => { inventoryUnavailable = false; } };
}

test('anonymous mobile visitor retries inventory and opens a machine detail', async ({ context, page }) => {
  const app = await serveBuiltApp();
  try {
    const marketplace = await mockMarketplace(context, app.origin, true);
    await page.goto(`${app.origin}/used-machines?lng=en`);
    await expect(page.getByText('We could not load the machines right now.')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('No listings yet — be the first to post.')).not.toBeVisible();
    marketplace.restoreInventory();
    await page.getByRole('button', { name: 'Retry loading machines' }).click();
    await expect(page.getByText('Reliable saw 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Details' })).toHaveCount(6);
    await page.locator('a[href="/used-machines/' + rows[0].id + '" ]').click();
    await expect(page).toHaveURL(new RegExp(rows[0].id));
    await expect(page.getByText('Reliable saw 1', { exact: true }).first()).toBeVisible();
  } finally { await app.close(); }
});

test('seller restores a draft, explicitly remembers contact details, and can discard it', async ({ context, page }) => {
  const app = await serveBuiltApp();
  try {
    await mockMarketplace(context, app.origin);
    await page.goto(`${app.origin}/used-machines?tab=sell&lng=en`);
    await page.getByLabel('Machine title *', { exact: true }).fill('My draft cutting machine');
    await page.getByLabel('Your name *', { exact: true }).fill('Private seller');
    await page.reload();
    await expect(page.getByLabel('Machine title *', { exact: true })).toHaveValue('My draft cutting machine');
    await expect(page.getByLabel('Your name *', { exact: true })).toHaveValue('');
    await page.getByLabel('Also remember my contact details on this device for 7 days').check();
    await page.getByLabel('Your name *', { exact: true }).fill('Private seller');
    await page.reload();
    await expect(page.getByLabel('Your name *', { exact: true })).toHaveValue('Private seller');
    await page.getByRole('button', { name: 'Discard saved draft' }).click();
    await expect(page.getByLabel('Machine title *', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Your name *', { exact: true })).toHaveValue('');
    await page.screenshot({ path: test.info().outputPath('seller-recovery.png'), fullPage: true });
  } finally { await app.close(); }
});

test('seller can publish once even when the insert response is lost', async ({ context, page }) => {
  const app = await serveBuiltApp();
  try {
    const state = await mockMarketplace(context, app.origin, false, true);
    await page.goto(`${app.origin}/used-machines?tab=sell&lng=en`);
    await page.getByLabel('Machine title *', { exact: true }).fill('Lost-response test machine');
    for (const [label, option] of [['Category *', 'Saw'], ['Condition *', 'Good'], ['Location *', 'Cairo']]) {
      await page.getByRole('combobox', { name: label, exact: true }).click();
      await page.getByRole('option', { name: option, exact: true }).click();
    }
    await page.getByLabel('Price *', { exact: true }).fill('10000');
    await page.getByLabel('Description *', { exact: true }).fill('Working saw for a disposable acceptance test.');
    await page.getByLabel('Your name *', { exact: true }).fill('Test seller');
    await page.getByLabel('Phone *', { exact: true }).fill('01000000000');
    await page.locator('input[type=file][multiple]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=', 'base64') });
    await page.getByRole('button', { name: 'Publish listing — free' }).click();
    await expect(page.getByText('Your machine is live on the marketplace!')).toBeVisible();
    expect(state.inserts()).toBe(1);
    await expect(page.getByLabel('Machine title *', { exact: true })).toHaveValue('');
  } finally { await app.close(); }
});

test('anonymous marketplace works with browser storage blocked', async ({ context, page }) => {
  const app = await serveBuiltApp();
  try {
    await mockMarketplace(context, app.origin);
    await context.addInitScript(() => {
      for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await page.goto(`${app.origin}/used-machines?tab=sell&lng=en`);
    await expect(page.getByLabel('Machine title *', { exact: true })).toBeVisible();
    await expect(page.getByText('Draft saving is unavailable on this browser. Keep this page open until publishing finishes.')).toBeVisible();
  } finally { await app.close(); }
});
test('entry bundle failure shows a usable retry before React can load', async ({ context, page }) => {
  const app = await serveBuiltApp();
  try {
    await mockMarketplace(context, app.origin);
    await page.route('**/assets/index-*.js', route => route.abort('failed'));
    await page.goto(`${app.origin}/used-machines?lng=en`);
    await expect(page.getByRole('alert')).toContainText('The page could not load.');
    await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  } finally { await app.close(); }
});
