import { expect, test } from '@playwright/test';
test('production smoke checks inventory and visible listing content', async ({ page }) => {
  const target = process.env.MARKETPLACE_SMOKE_URL;
  test.skip(!target, 'Run only against an explicitly selected deployed URL.');
  const response = page.waitForResponse(response => response.url().includes('/rest/v1/used_machine_listings') && response.request().method() === 'GET', { timeout: 30000 });
  await page.goto(new URL('/used-machines', target).href);
  const inventory = await response;
  expect(inventory.ok()).toBe(true);
  const rows: unknown = await inventory.json();
  expect(Array.isArray(rows)).toBe(true);
  if (Array.isArray(rows) && rows.length) {
    await expect(page.getByText(String((rows[0] as {title: string}).title), { exact: true }).first()).toBeVisible();
  } else {
    await expect(page.getByText(/No listings yet|لا توجد/).first()).toBeVisible();
  }
  await expect(page.getByText('The application encountered an unexpected error. Please try refreshing the page.')).not.toBeVisible();
});
