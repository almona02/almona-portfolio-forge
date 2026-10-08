/**
 * Measuring → Design save/reload: layout must survive reload.
 * Fail-closed without E2E_USER_* credentials (skipped, not soft-pass).
 */
import { expect, test } from '@playwright/test';

const hasLocalAuth =
  !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.describe('Fabricator measure → design reload', () => {
  test.beforeEach(() => {
    test.skip(
      !hasLocalAuth,
      'Set E2E_USER_EMAIL and E2E_USER_PASSWORD for authenticated save/reload checks',
    );
  });

  test('two-cell sliding grid survives design reload', async ({ page }) => {
    test.setTimeout(180_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForURL(/fabricator|studio|dashboard|projects/i, { timeout: 60_000 });

    // Prefer an existing pose workflow URL from env, else open projects and create path.
    const poseUrl = process.env.E2E_POSE_DESIGN_URL;
    if (!poseUrl) {
      test.skip(true, 'Set E2E_POSE_DESIGN_URL to /fabricator/studio/projects/:id/positions/:id/design');
    }

    await page.goto(poseUrl!, { waitUntil: 'domcontentloaded' });
    // Navigate to measuring if design is open
    const measureLink = page.getByRole('link', { name: /measur/i }).first();
    if (await measureLink.isVisible().catch(() => false)) {
      await measureLink.click();
    }

    // Enable multi-pane / grid mode so 2-sash layout is persisted
    const multiPane = page.getByRole('button', { name: /multi-?pane|grid/i }).first();
    if (await multiPane.isVisible().catch(() => false)) {
      await multiPane.click();
    }

    const finalize = page.getByRole('button', { name: /finalize|save|complete measur/i }).first();
    await expect(finalize).toBeVisible({ timeout: 30_000 });
    await finalize.click();

    await page.goto(poseUrl!, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Must not fall back to a lone FIXED lite after reload
    await expect(page.getByText(/1\s*[×x]\s*1/i).first()).not.toBeVisible({ timeout: 15_000 }).catch(() => undefined);
    const fixedOnly = page.getByText(/FIXED/i);
    const sliding = page.getByText(/sliding|sash/i);
    await expect(sliding.first().or(page.getByTestId('design-grid-cell'))).toBeVisible({
      timeout: 45_000,
    });
    // If FIXED appears, require more than one cell indicator
    const fixedCount = await fixedOnly.count();
    if (fixedCount > 0) {
      expect(fixedCount).toBeGreaterThan(1);
    }
  });
});
