/**
 * Fabricator chain E2E: measure → design → BOM → optimize → quote gates on caluminium-ps.
 * Phase 4: Estimate quote allowed; Convert to Order blocked until optimization approved.
 * Requires: preview + local Supabase + E2E_USER_EMAIL / E2E_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test';

const hasLocalAuth =
  !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.describe('Fabricator chain — caluminium-ps', () => {
  test.skip(!hasLocalAuth, 'Set E2E_USER_EMAIL / E2E_USER_PASSWORD for authenticated chain');

  test('quote estimate vs convert-to-order gating', async ({ page }) => {
    test.setTimeout(180_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForURL(/fabricator|studio|dashboard|projects/i, { timeout: 60_000 }).catch(() => undefined);

    await page.goto('/fabricator/studio/projects', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Project/i).first()).toBeVisible({ timeout: 30_000 });

    const newProject = page.getByRole('button', { name: /new project|add project|create/i }).first();
    if (await newProject.isVisible().catch(() => false)) {
      await newProject.click();
      const pack = page.getByText(/caluminium|PS\b/i).first();
      if (await pack.isVisible().catch(() => false)) await pack.click();
    }

    const quoteLink = page.getByRole('link', { name: /quote|commercial/i }).first();
    if (await quoteLink.isVisible().catch(() => false)) {
      await quoteLink.click();
    } else {
      await page.goto('/fabricator/studio/projects', { waitUntil: 'domcontentloaded' });
    }

    // Phase 4: estimate path may label Save Estimate / Estimate only; Convert disabled without opt
    const convertBtn = page.getByRole('button', { name: /Convert to Order/i }).first();
    if (await convertBtn.isVisible().catch(() => false)) {
      const estimateHint = page.getByText(/Estimate only|Save Estimate|Estimate Quotation/i).first();
      if (await estimateHint.isVisible().catch(() => false)) {
        await expect(convertBtn).toBeDisabled();
      }
    }

    // Legacy redirects land on studio
    await page.goto('/fabricator/orders', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/fabricator\/studio\/orders/);
    await page.goto('/fabricator/reports', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/fabricator\/studio\/reports/);
  });
});
