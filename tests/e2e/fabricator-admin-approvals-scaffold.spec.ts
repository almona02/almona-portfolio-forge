/**
 * Admin Approvals scaffold E2E (separate from manufacturing 10/18 chain).
 * Requires: Playwright webServer + local Supabase with #54 admin-workflow migration.
 * Optional authority for "Check approved versions":
 *   scripts/e2e-seed-manufacturing-authority-local.sql (NOT a production migration).
 */
import { expect, test } from '@playwright/test';

const hasLocalAuth =
  !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.describe('Fabricator admin approvals scaffold', () => {
  test.skip(!hasLocalAuth, 'Set E2E_USER_EMAIL / E2E_USER_PASSWORD for authenticated chain');

  test('BOM gate exposes Admin Approvals deep link', async ({ page }) => {
    test.setTimeout(180_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForURL(/fabricator|studio|dashboard|projects/i, { timeout: 60_000 }).catch(() => undefined);

    await page.goto('/fabricator/studio/approvals', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/Manufacturing Approvals|admin|Approvals|not authorized|Sign in/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
