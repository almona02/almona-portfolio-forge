/**
 * Design/tuning bare-route pickers — requires credentials.
 * Missing env fails the suite (not a successful skip). E2E_OPTIONAL=1 for local soft runs.
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

test.describe('Fabricator design/tuning pickers', () => {
  test('bare design and tuning show pickers', async ({ page }) => {
    test.setTimeout(120_000);
    const email = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });

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
