import { expect, test } from '@playwright/test';
import { serveBuiltApp } from './appFixture';

test.use({ serviceWorkers: 'block' });

for (const scenario of ['healthy', 'startup-once', 'homepage-once', 'startup-persistent', 'entry-persistent']) {
  test(`public homepage module recovery: ${scenario}`, async ({ context, page }) => {
    const app = await serveBuiltApp();
    try {
      await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
      await context.route('**/*', route => new URL(route.request().url()).origin === app.origin
        ? route.continue() : route.abort());
      let navigations = 0;
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++;
      });
      if (scenario !== 'healthy') {
        const pattern = scenario === 'entry-persistent' ? /\/assets\/index-[^/]+\.js$/ : scenario === 'homepage-once' ? /\/assets\/Index-[^/]+\.js$/ : /\/assets\/main-[^/]+\.js$/;
        await page.route(pattern, route => scenario.endsWith('-persistent') || navigations === 1
          ? route.abort('failed') : route.continue());
      }
      await page.goto(app.origin);
      if (scenario.endsWith('-persistent')) {
        await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
        // Observe beyond the automatic retry delay to detect a refresh loop.
        await page.waitForTimeout(1500);
      } else {
        await expect(page.getByText('Learn More About Us', { exact: true })).toBeVisible({ timeout: 30000 });
      }
      expect(navigations).toBe(scenario === 'healthy' || scenario === 'entry-persistent' ? 1 : 2);
      expect(errors).toEqual([]);
    } finally { await app.close(); }
  });
}
