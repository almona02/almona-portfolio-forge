import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e/marketplace', timeout: 60000, fullyParallel: false, workers: 1,
  reporter: [['list']], outputDir: 'test-results/marketplace',
  use: { ...devices['Pixel 7'], locale: 'en-US', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'marketplace-mobile', use: { browserName: 'chromium' } }],
});
