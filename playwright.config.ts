import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const useRemoteBase = !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(baseURL);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      // dependencies: ['setup'],
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      testIgnore: /fabricator-(measure-design-reload|design-tuning-pickers)\.spec\.ts/,
    },
    {
      name: 'chromium-acceptance',
      use: {
        ...devices['Desktop Chrome'],
        // Fresh login in-spec; do not require pre-baked storageState
      },
      testMatch: /fabricator-(measure-design-reload|design-tuning-pickers)\.spec\.ts/,
    },
    {
      name: 'chromium-real-login',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /3d-preview-full-workflow\.spec\.ts/,
    },
  ],

  /* Local only — remote PLAYWRIGHT_BASE_URL skips spawning Vite */
  webServer: useRemoteBase
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
