/**
 * Public Prestige Agent smoke — no credentials required.
 */
import { expect, test } from '@playwright/test';

test.describe('Prestige public smoke', () => {
  test('prestige-agent renders shell content', async ({ page }) => {
    test.setTimeout(60_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/prestige-agent', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/YDT Agent|Welcome|AIM 7510|professor|Learn/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
