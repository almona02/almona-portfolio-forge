/**
 * UI chain: 10 positions / 18 units / >100 profile cuts on caluminium-ps.
 *
 * Requires:
 * - Vite preview (or PLAYWRIGHT_BASE_URL) pointed at a build using local Supabase
 * - Local Supabase with #54 manufacturing seed + seeded MFG-E2E-1018 project
 * - E2E_USER_EMAIL / E2E_USER_PASSWORD (or E2E_OPTIONAL=1 to soft-skip)
 *
 * Seed helper: `npx tsx scripts/e2e-seed-mfg-1018.ts`
 */
import { expect, test, type Page } from '@playwright/test';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    if (process.env.E2E_OPTIONAL === '1') {
      test.skip(true, `${name} missing (E2E_OPTIONAL=1)`);
      return '';
    }
    throw new Error(
      `Missing required ${name}. Provide credentials, or set E2E_OPTIONAL=1 for a local optional run.`,
    );
  }
  return value;
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

test.describe('Fabricator project 10/18/>100-cut UI chain', () => {
  test('project summary shows 10/18 and Aggregate BOM yields >100 profile cuts', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const email = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    const projectId =
      process.env.E2E_MFG_PROJECT_ID?.trim() || 'a1000000-1018-4000-8000-000000000001';

    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await login(page, email, password);

    await page.goto(`/fabricator/studio/projects/${projectId}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByRole('heading', { name: /Positions \(10\)/i })).toBeVisible({
      timeout: 60_000,
    });

    // KPI "Total Units" card value
    const unitsCard = page.getByText('Total Units', { exact: true }).locator('..');
    await expect(unitsCard.getByText('18', { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Aggregate Project BOM/i }).click();

    // Complete (non-partial) estimate — sliding resolveEstimatePattern must succeed
    await expect(page.getByText(/Estimate only — manufacturing approval/i)).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByText(/Partial estimate only/i)).toHaveCount(0);

    // CostCard renders "{count} items" under Profiles
    await expect
      .poll(
        async () => {
          const texts = await page.locator('body').innerText();
          const match = texts.match(/Profiles[\s\S]{0,160}?(\d+)\s+items/i);
          return match ? Number(match[1]) : 0;
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(100);
  });
});
