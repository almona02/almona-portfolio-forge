/**
 * Measuring → Design save/reload with Multi-pane OFF.
 * Credentials are required: missing env fails the suite (not a successful skip).
 * Set E2E_OPTIONAL=1 only for local soft runs.
 *
 * E2E_POSE_DESIGN_URL may be absolute or site-relative; E2E_BASE_URL / Playwright
 * baseURL must point at a deployment that includes this branch's measuring UI.
 */
import { expect, test } from '@playwright/test';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    if (process.env.E2E_OPTIONAL === '1') {
      test.skip(true, `${name} missing (E2E_OPTIONAL=1)`);
      return '';
    }
    throw new Error(
      `Missing required ${name}. Authenticated acceptance must not soft-pass. ` +
        `Provide credentials/secrets, or set E2E_OPTIONAL=1 for a local optional run.`,
    );
  }
  return value;
}

function toPath(urlOrPath: string): string {
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return new URL(urlOrPath).pathname;
  }
  return urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
}

test.describe('Fabricator measure → design reload', () => {
  test('two sliding cells survive reload with Multi-pane off', async ({ page }) => {
    test.setTimeout(180_000);

    const email = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    const poseDesignPath = toPath(requireEnv('E2E_POSE_DESIGN_URL'));

    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });

    const measurePath = poseDesignPath.replace(/\/design\/?$/, '/measuring');
    await page.goto(measurePath, { waitUntil: 'domcontentloaded' });

    // Explicit 2-sash sliding; Multi-pane must stay OFF for this acceptance case
    const windowType = page.getByTestId('measuring-window-type').or(page.locator('#windowType'));
    await expect(windowType).toBeVisible({ timeout: 45_000 });
    await windowType.click();
    await page.getByRole('option', { name: /2.?sash|two.?sash|sliding/i }).first().click();

    const multiPane = page.getByTestId('measuring-multipane-toggle');
    await expect(multiPane).toBeVisible({ timeout: 15_000 });
    if ((await multiPane.getAttribute('aria-pressed')) === 'true') {
      await multiPane.click();
    }
    await expect(multiPane).toHaveAttribute('aria-pressed', 'false');

    const width = page.getByLabel(/^width/i).or(page.locator('input[name="width"]')).first();
    const height = page.getByLabel(/^height/i).or(page.locator('input[name="height"]')).first();
    await expect(width).toBeVisible({ timeout: 15_000 });
    await width.fill('1200');
    await height.fill('1400');

    // Exactly two intended cells before save (no swallowed fallbacks)
    const measuringSummary = page.getByTestId('measuring-grid-summary');
    await expect(measuringSummary).toHaveAttribute('data-cells', '2', { timeout: 30_000 });
    await expect(measuringSummary).toHaveAttribute('data-grid-mode', 'off');
    await expect(page.getByTestId('measuring-grid-cell')).toHaveCount(2);

    const finalize = page.getByRole('button', { name: /finalize|save design|complete measur/i }).first();
    await expect(finalize).toBeVisible({ timeout: 30_000 });
    await finalize.click();

    await page.goto(poseDesignPath, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Exact post-reload configuration: two cells, not a 1×1 FIXED collapse
    const designSummary = page.getByTestId('design-grid-summary');
    await expect(designSummary).toHaveAttribute('data-cells', '2', { timeout: 45_000 });
    await expect(page.getByTestId('design-grid-cell')).toHaveCount(2);
    await expect(page.getByText(/1\s*[×x]\s*1/i)).toHaveCount(0);
    await expect(page.getByTestId('design-grid-cell').first()).toHaveAttribute(
      'data-cell-type',
      /sliding/i,
    );
  });
});
