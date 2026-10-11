/**
 * Phase 7 smoke: gold 3D deps stay lazy (no three-bvh-csg on public entry).
 */
import { expect, test } from '@playwright/test';

test.describe('Fabricator phase 7 — gold 3D', () => {
  test('public home does not request three-bvh-csg chunk', async ({ page }) => {
    const csgRequests: string[] = [];
    page.on('request', (req) => {
      if (/three-bvh-csg|@lume.kiwi|kiwi/i.test(req.url())) csgRequests.push(req.url());
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
    expect(csgRequests).toEqual([]);
  });
});
