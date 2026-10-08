/**
 * Fabricator chain E2E — Phase 5 route smoke (design/tuning pickers, prestige, redirects).
 * Requires: preview + local Supabase + E2E_USER_EMAIL / E2E_USER_PASSWORD for auth paths.
 */
import { expect, test } from '@playwright/test';

const hasLocalAuth =
  !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.describe('Fabricator chain — caluminium-ps', () => {
  test('bare design and tuning show pickers; prestige renders', async ({ page }) => {
    test.setTimeout(120_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    if (hasLocalAuth) {
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
      await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
      await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
      await page.waitForURL(/fabricator|studio|dashboard|projects/i, { timeout: 60_000 }).catch(() => undefined);

      await page.goto('/fabricator/studio/design', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByTestId('design-pose-picker').or(page.getByText(/Select a project position/i)),
      ).toBeVisible({ timeout: 30_000 });

      await page.goto('/fabricator/studio/data/tuning', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByTestId('tuning-pack-picker').or(page.getByText(/Select a system pack/i)),
      ).toBeVisible({ timeout: 30_000 });
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'Skipped authenticated design/tuning pickers — set E2E_USER_*',
      });
    }

    await page.goto('/prestige-agent', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/YDT Agent|Welcome|AIM 7510|professor|Learn/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
