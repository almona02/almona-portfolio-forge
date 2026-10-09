/**
 * UI chain: 10 positions / 18 units / >100 profile cuts on caluminium-ps.
 *
 * Proves more than aggregate BOM item count:
 * - all 10 positions resolve (no partial/failed poses presented as complete)
 * - fixture area from dimensions × quantities
 * - pooled project cutting estimate (>100 pieces, stock bars, kerf, waste)
 * - estimate persistence across reload
 * - provisional pricing remains labeled (not manufacturing-approved)
 *
 * Requires:
 * - Vite preview (or PLAYWRIGHT_BASE_URL) pointed at a build using local Supabase
 * - Local Supabase with manufacturing seed + seeded MFG-E2E-1018 project
 * - E2E_USER_EMAIL / E2E_USER_PASSWORD (or E2E_OPTIONAL=1 to soft-skip)
 *
 * Seed helper: `npx tsx scripts/e2e-seed-mfg-1018.ts`
 */
import { expect, test, type Page } from '@playwright/test';

/** Fixture: 8× qty2 + 2× qty1 at 1200×1400 mm → 18 units, 30.24 m² */
const FIXTURE = {
  positions: 10,
  units: 18,
  widthMm: 1200,
  heightMm: 1400,
  areaM2: Number(((1200 * 1400 * 18) / 1_000_000).toFixed(2)), // 30.24
};

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
  test('aggregate BOM + pooled optimize + reload with area and bar reconciliation', async ({
    page,
  }) => {
    test.setTimeout(360_000);

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

    // KPI units + area from fixture dimensions × quantities
    const unitsCard = page.getByText('Total Units', { exact: true }).locator('..');
    await expect(unitsCard.getByText(String(FIXTURE.units), { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(`${FIXTURE.areaM2.toFixed(2)} m²`)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Aggregate Project BOM/i }).click();

    // Complete (non-partial) estimate — all 10 positions must resolve
    await expect(page.getByText(/Estimate only — manufacturing approval/i)).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByText(/Partial estimate only/i)).toHaveCount(0);
    await expect(page.getByText(/BOM failed/i)).toHaveCount(0);
    await expect(page.getByText(/10\/10 positions calculated/i)).toBeVisible({
      timeout: 15_000,
    });

    // CostCard renders "{count} items" under Profiles — aggregate generation only
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

    // Provisional pricing must remain clearly identified (not approved manufacturing prices)
    const bodyAfterBom = await page.locator('body').innerText();
    expect(bodyAfterBom).toMatch(/provisional|TBD|estimate only|manufacturing approval/i);

    // Pooled optimization: Studio → Optimize tab → optimize all poses
    await page.getByRole('tab', { name: /^Studio$/i }).click();
    await page.getByRole('tab', { name: /^Optimize$/i }).click();
    await expect(page.getByText(/Project cutting estimate/i)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Optimize all poses \(estimate\)/i }).click();

    await expect
      .poll(
        async () => {
          const text = await page.locator('body').innerText();
          const match = text.match(
            /(\d+)\s+positions\s*·\s*(\d+)\s+pieces\s*·\s*(\d+)\s+stock bars/i,
          );
          if (!match) return null;
          return {
            positions: Number(match[1]),
            pieces: Number(match[2]),
            bars: Number(match[3]),
          };
        },
        { timeout: 180_000 },
      )
      .toEqual(
        expect.objectContaining({
          positions: FIXTURE.positions,
        }),
      );

    const optSummary = await page.locator('body').innerText();
    const summaryMatch = optSummary.match(
      /(\d+)\s+positions\s*·\s*(\d+)\s+pieces\s*·\s*(\d+)\s+stock bars/i,
    );
    expect(summaryMatch).toBeTruthy();
    const pieces = Number(summaryMatch![2]);
    const bars = Number(summaryMatch![3]);
    expect(pieces).toBeGreaterThan(100);
    expect(bars).toBeGreaterThan(0);

    // Kerf / stock / waste reconciliation visible per profile group
    await expect(page.getByText(/kerf\s+\d+/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/stock\s+\d+\s*mm/i).first()).toBeVisible();
    await expect(page.getByText(/remaining stock:/i).first()).toBeVisible();
    await expect(page.getByText(/Estimate only/i).first()).toBeVisible();

    // Persist + reload: cutting_estimate saved on project meta
    await expect(page.getByText(/Project cutting estimate saved|estimate calculated/i)).toBeVisible({
      timeout: 60_000,
    }).catch(() => {
      /* toast may dismiss; reload check is authoritative */
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Studio$/i }).click();
    await page.getByRole('tab', { name: /^Optimize$/i }).click();

    // After reload, saved estimate must restore (Recalculate button) with same pooled totals
    await expect(
      page.getByRole('button', { name: /Recalculate all poses|Optimize all poses \(estimate\)/i }),
    ).toBeVisible({ timeout: 60_000 });

    await expect
      .poll(
        async () => {
          const text = await page.locator('body').innerText();
          const match = text.match(
            /(\d+)\s+positions\s*·\s*(\d+)\s+pieces\s*·\s*(\d+)\s+stock bars/i,
          );
          if (!match) return 0;
          return Number(match[2]);
        },
        { timeout: 60_000 },
      )
      .toBeGreaterThan(100);

    const reloaded = await page.locator('body').innerText();
    const reloadMatch = reloaded.match(
      /(\d+)\s+positions\s*·\s*(\d+)\s+pieces\s*·\s*(\d+)\s+stock bars/i,
    );
    expect(reloadMatch).toBeTruthy();
    expect(Number(reloadMatch![1])).toBe(FIXTURE.positions);
    expect(Number(reloadMatch![2])).toBe(pieces);
    expect(Number(reloadMatch![3])).toBe(bars);
    expect(reloaded).toMatch(/Estimate only/i);
    expect(reloaded).not.toMatch(/Partial estimate only/i);

    console.log(
      JSON.stringify({
        fixture: FIXTURE,
        pooled: { pieces, bars },
        reload: {
          positions: Number(reloadMatch![1]),
          pieces: Number(reloadMatch![2]),
          bars: Number(reloadMatch![3]),
        },
      }),
    );
  });
});
