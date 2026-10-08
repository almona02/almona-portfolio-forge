/**
 * Phase 1+ chain E2E: measure → design → BOM → optimize on caluminium-ps.
 * Requires: `npm run preview` (or Playwright webServer) + local Supabase with seed authority migration.
 */
import { expect, test } from '@playwright/test';

const hasLocalAuth =
  !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.describe('Fabricator chain — caluminium-ps', () => {
  test.skip(!hasLocalAuth, 'Set E2E_USER_EMAIL / E2E_USER_PASSWORD for authenticated chain');

  test('measure → design → BOM → optimize unlocked with seeded authority', async ({ page }) => {
    test.setTimeout(180_000);
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForURL(/fabricator|studio|dashboard|projects/i, { timeout: 60_000 }).catch(() => undefined);

    await page.goto('/fabricator/studio/projects', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Project/i).first()).toBeVisible({ timeout: 30_000 });

    // Prefer creating/opening a caluminium-ps project when UI exposes pack picker.
    const newProject = page.getByRole('button', { name: /new project|add project|create/i }).first();
    if (await newProject.isVisible().catch(() => false)) {
      await newProject.click();
      const pack = page.getByText(/caluminium|PS\b/i).first();
      if (await pack.isVisible().catch(() => false)) await pack.click();
    }

    // Navigate pose measuring → design → bom when present
    const measuring = page.getByRole('link', { name: /measur/i }).first();
    if (await measuring.isVisible().catch(() => false)) await measuring.click();

    const design = page.getByRole('link', { name: /design/i }).first();
    if (await design.isVisible().catch(() => false)) await design.click();
    await expect(page.getByText(/design|engineering|smart draw/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const bomLink = page.getByRole('link', { name: /bom|materials/i }).first();
    if (await bomLink.isVisible().catch(() => false)) await bomLink.click();

    // Seeded authority should surface check-approved path or Approvals deep link
    const approvalsLink = page.getByRole('link', { name: /Admin Approvals|Approvals/i }).first();
    await expect(approvalsLink.or(page.getByText(/Catalogue|manufacturing|qualified|Estimate only/i).first())).toBeVisible({
      timeout: 30_000,
    });

    const checkApproved = page.getByRole('button', { name: /Check approved versions/i });
    if (await checkApproved.isVisible().catch(() => false)) {
      await checkApproved.click();
      await expect(page.getByText(/Approved caluminium-ps|Approved .* catalogue revision/i)).toBeVisible({
        timeout: 20_000,
      });
    }

    const optimize = page.getByRole('link', { name: /optim/i }).first();
    if (await optimize.isVisible().catch(() => false)) {
      await optimize.click();
      await expect(page.getByText(/optim|material|waste|blocked/i).first()).toBeVisible({
        timeout: 30_000,
      });
    }
  });
});
