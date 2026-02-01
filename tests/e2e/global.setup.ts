import { expect, test as setup } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  setup.setTimeout(60000); // Allow 60s for cold start (FCP ~10s in local dev)
  // Directly inject the dev bypass token into localStorage
  // This avoids UI flakiness with login forms/animations
  
  // 1. Navigate to the app to initialize the origin
  console.log('[Setup] Navigating to /');
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
  await page.goto('/', { waitUntil: 'commit' });
  try {
      await page.waitForSelector('#root', { state: 'attached', timeout: 5000 });
      console.log('[Setup] DOM Attached');
  } catch (e) {
      console.log('[Setup] Warning: DOM not attached in 5s');
  }

  // 2. Inject the dev bypass token
  console.log('[Setup] Injecting auth token');
  await page.evaluate(() => {
    window.localStorage.setItem('almona_dev_auth', 'true');
  });

  // 3. Reload to trigger AuthContext initialization with the new token
  console.log('[Setup] Reloading page');
  await page.reload({ waitUntil: 'domcontentloaded' });

  // 4. Navigate to a known protected route to ensure auth worked
  console.log('[Setup] Navigating to /fabricator/customers');
  await page.goto('/fabricator/customers');

  // 5. Wait for authenticated state (Customers page content)
  console.log('[Setup] Verifying authentication');
  await expect(page.getByText(/Fabricator Customers/i)).toBeVisible({ timeout: 20000 });

  // 5. Save the storage state (cookies, localStorage, etc.)
  await page.context().storageState({ path: authFile });
});
