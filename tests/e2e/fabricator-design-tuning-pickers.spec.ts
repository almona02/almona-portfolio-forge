/**
 * Design/tuning bare-route pickers — requires local credentials.
 * Fail-closed: without E2E_USER_EMAIL / E2E_USER_PASSWORD this file is skipped,
 * not marked passed via soft annotations.
 */
import { expect, test } from '@playwright/test';

const hasLocalAuth =
  !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.describe('Fabricator design/tuning pickers', () => {
  test.beforeEach(() => {
    test.skip(
      !hasLocalAuth,
      'Set E2E_USER_EMAIL and E2E_USER_PASSWORD for authenticated picker checks',
    );
  });

  test('bare design and tuning show pickers', async ({ page }) => {
    test.setTimeout(120_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForURL(/fabricator|studio|dashboard|projects/i, { timeout: 60_000 });

    await page.goto('/fabricator/studio/design', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByTestId('design-pose-picker').or(page.getByText(/Select a project position/i)),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto('/fabricator/studio/data/tuning', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByTestId('tuning-pack-picker').or(page.getByText(/Select a system pack/i)),
    ).toBeVisible({ timeout: 30_000 });
  });
});
