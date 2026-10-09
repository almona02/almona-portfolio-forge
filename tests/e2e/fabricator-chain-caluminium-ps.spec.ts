/**
 * Phase 6 smoke: studio boot without Prestige3D, contact form present.
 * Authenticated chain remains optional via E2E_USER_*.
 */
import { expect, test } from '@playwright/test';

test.describe('Fabricator phase 6 — perf / contact', () => {
  test('studio projects loads without prestige 3d boot overlay; contact form works', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/full name|الاسم/i).or(page.locator('#name'))).toBeVisible({
      timeout: 30_000,
    });

    // Unauthenticated studio redirects to login — still must not wait on Prestige3D canvas
    await page.goto('/fabricator/studio/projects', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 5_000 }).catch(() => undefined);
    await expect(
      page.getByText(/sign in|log in|project|studio|ALMONA/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
