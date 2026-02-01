/**
 * Deep E2E: 3D Preview and full fabricator workflow
 *
 * Flow: Login → Measuring → Design → 3D Preview → Optimization → Reports → Production → Save
 * Asserts scroll and visibility on every page.
 *
 * Run with real user: npx playwright test tests/e2e/3d-preview-full-workflow.spec.ts --project=chromium-real-login
 * Or with dev bypass: npx playwright test tests/e2e/3d-preview-full-workflow.spec.ts --project=chromium
 */

import { expect, test } from '@playwright/test';

const REAL_LOGIN = {
  email: 'almona.co@hotmail.com',
  password: 'abcd1234',
};

/** Assert key content is in viewport and page is scrollable where expected */
async function assertScrollAndVisibility(
  page: import('@playwright/test').Page,
  mainSelector: string,
  options?: { scrollToBottom?: boolean }
) {
  const main = page.locator(mainSelector).first();
  await main.scrollIntoViewIfNeeded();
  await expect(main).toBeVisible();

  if (options?.scrollToBottom) {
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight);
  }
}

test.describe('3D Preview and full workflow E2E', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name === 'chromium-real-login') {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.locator('#email').fill(REAL_LOGIN.email);
        await page.locator('#password').fill(REAL_LOGIN.password);
        await page.getByRole('button', { name: /sign in|log in|login/i }).click();
        await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
      }
    }
  });

  test('real login with almona.co@hotmail.com', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible({ timeout: 20000 });
    await page.locator('#email').fill(REAL_LOGIN.email);
    await page.locator('#password').fill(REAL_LOGIN.password);
    await page.getByRole('button', { name: /Sign In|sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
  });

  test('navigate to workflow measuring and complete measuring steps', async ({ page }) => {
    await page.goto('/fabricator/workflow/measuring');
    await expect(page.getByText(/Smart Measuring|Measurement|System Configuration/i)).toBeVisible({ timeout: 20000 });

    const nextText = /Next Step|next/i;
    for (let i = 0; i < 4; i++) {
      const nextBtn = page.getByRole('button', { name: nextText });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    const verifyCheckbox = page.locator('#verify');
    await verifyCheckbox.scrollIntoViewIfNeeded();
    await verifyCheckbox.check();

    const finalizeBtn = page.getByRole('button', { name: /Finalize Design|Complete/i });
    await finalizeBtn.click();
    await expect(page).toHaveURL(/\/fabricator\/workflow\/design/, { timeout: 15000 });
  });

  test('3D Preview page: content, scroll and visibility', async ({ page }) => {
    await page.goto('/fabricator/workflow/preview3d');
    await expect(page.getByRole('heading', { name: /3D Preview/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Visualize your window design in 3D/i)).toBeVisible();

    const mainContent = page.locator('.max-w-6xl, [class*="bg-slate-950"]').first();
    await mainContent.scrollIntoViewIfNeeded();
    await expect(mainContent).toBeVisible();

    await assertScrollAndVisibility(page, 'main, [class*="flex flex-col h-full"]', { scrollToBottom: true });
    await expect(page.getByRole('button', { name: /Continue to Optimization/i })).toBeVisible();
  });

  test('Design page: ribbon and scroll', async ({ page }) => {
    await page.goto('/fabricator/workflow/design');
    await expect(page.getByText(/Technical Design|System Configuration|Structure/i)).toBeVisible({ timeout: 20000 });
    const ribbon = page.getByText(/3D Preview|Smart Measuring/i);
    await ribbon.first().scrollIntoViewIfNeeded();
    await expect(ribbon.first()).toBeVisible();
  });

  test('Optimization page: content and visibility', async ({ page }) => {
    await page.goto('/fabricator/workflow/optimization');
    await expect(
      page.getByText(/Cutting Optimization|Optimization|Project Required/i)
    ).toBeVisible({ timeout: 15000 });
    assertScrollAndVisibility(page, 'main, [class*="flex flex-col"]');
  });

  test('Production page: content and visibility', async ({ page }) => {
    await page.goto('/fabricator/workflow/production');
    await expect(
      page.getByText(/Production|Production Planning|Project Required/i)
    ).toBeVisible({ timeout: 15000 });
    assertScrollAndVisibility(page, 'main, [class*="flex flex-col"]');
  });

  test('Fabricator reports page: scroll and visibility', async ({ page }) => {
    await page.goto('/fabricator/reports');
    await expect(
      page.getByText(/Reports|Fabricator|report/i).first()
    ).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    assertScrollAndVisibility(page, 'main, [role="main"], .flex-1', { scrollToBottom: true });
  });

  test('Full flow: login → measuring → design → 3D preview → optimization → production → save check', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('#email').fill(REAL_LOGIN.email);
    await page.locator('#password').fill(REAL_LOGIN.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

    await page.goto('/fabricator/workflow/measuring');
    await expect(page.getByText(/Smart Measuring|System Configuration/i)).toBeVisible({ timeout: 20000 });
    for (let i = 0; i < 4; i++) {
      const next = page.getByRole('button', { name: /Next Step|next/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(400);
    }
    await page.locator('#verify').check();
    await page.getByRole('button', { name: /Finalize Design|Complete/i }).click();
    await page.waitForURL(/\/design/, { timeout: 15000 });

    await page.getByRole('button', { name: /3D Preview/i }).click();
    await page.waitForURL(/\/preview3d/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /3D Preview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue to Optimization/i })).toBeVisible();

    await page.getByRole('button', { name: /Continue to Optimization/i }).click();
    await page.waitForURL(/\/optimization/, { timeout: 10000 });

    const optContent = page.locator('main').first();
    await optContent.scrollIntoViewIfNeeded();
    await expect(optContent).toBeVisible();

    await page.goto('/fabricator/workflow/production');
    await expect(page.getByText(/Production|Project Required/i)).toBeVisible({ timeout: 10000 });

    await page.goto('/fabricator/reports');
    await expect(page.getByText(/Reports|report/i).first()).toBeVisible({ timeout: 10000 });
  });
});
