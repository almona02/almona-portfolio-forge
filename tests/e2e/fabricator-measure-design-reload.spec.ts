/**
 * Measuring → Design save/reload with Multi-pane OFF.
 * Credentials are required: missing env fails the suite (not a successful skip).
 * Set E2E_OPTIONAL=1 only for local soft runs.
 *
 * E2E_POSE_DESIGN_URL may be absolute or site-relative; Playwright baseURL must
 * serve this branch (CI builds vite preview of the PR).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

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

/** Predictive layout / canvas edits can re-enable Multi-pane; force it off. */
async function ensureMultiPaneOff(toggle: Locator): Promise<void> {
  await expect(toggle).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(
      async () => {
        const pressed = await toggle.getAttribute('aria-pressed');
        if (pressed === 'true') {
          await toggle.click();
        }
        return toggle.getAttribute('aria-pressed');
      },
      { timeout: 20_000, intervals: [200, 400, 800] },
    )
    .toBe('false');
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

test.describe('Fabricator measure → design reload', () => {
  test('two sliding cells survive reload with Multi-pane off', async ({ page }) => {
    test.setTimeout(180_000);

    const email = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    const poseDesignPath = toPath(requireEnv('E2E_POSE_DESIGN_URL'));

    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await login(page, email, password);

    const measurePath = poseDesignPath.replace(/\/design\/?$/, '/measuring');
    await page.goto(measurePath, { waitUntil: 'domcontentloaded' });

    const multiPane = page.getByTestId('measuring-multipane-toggle');
    await expect(multiPane).toBeVisible({ timeout: 60_000 });

    // Explicit 2-sash sliding (drives predictive two-cell grid)
    const windowType = page.getByTestId('measuring-window-type');
    await expect(windowType).toBeVisible({ timeout: 30_000 });
    await windowType.click();
    await page.getByRole('option', { name: /2.?sash|two.?sash/i }).first().click();

    const width = page.getByTestId('measuring-width-mm');
    const height = page.getByTestId('measuring-height-mm');
    await expect(width).toBeVisible({ timeout: 30_000 });
    await width.fill('1200');
    await height.fill('1400');

    const measuringSummary = page.getByTestId('measuring-grid-summary');
    await expect(measuringSummary).toHaveAttribute('data-cells', '2', { timeout: 30_000 });

    // After prediction/canvas may flip Multi-pane on — require OFF for this case
    await ensureMultiPaneOff(multiPane);
    await expect(measuringSummary).toHaveAttribute('data-grid-mode', 'off');
    await expect(page.getByTestId('measuring-grid-cell')).toHaveCount(2);

    const finalize = page
      .getByRole('button', { name: /finalize|save design|complete measur|next step/i })
      .first();
    await expect(finalize).toBeVisible({ timeout: 30_000 });
    await finalize.click();

    // Wizard may need a final save on last step
    const saveDesign = page.getByRole('button', { name: /finalize|save design|complete measur/i }).first();
    if (await saveDesign.isVisible().catch(() => false)) {
      await saveDesign.click();
    }

    await page.goto(poseDesignPath, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });

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
