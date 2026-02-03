/// <reference types="vitest/config" />
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const enableStorybookBrowser = process.env.STORYBOOK_BROWSER_TESTS === '1';

export default defineConfig({
  plugins: [react()],
  // Force test environment mode for React (prevents act() errors)
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      reporter: ['text', 'json', 'html']
    },
    css: true,
    deps: {
      inline: ['@testing-library/user-event', '@testing-library/react', '@testing-library/jest-dom']
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously'
      }
    },
    // Isolate environment for each test file
    isolate: true,
    ...(enableStorybookBrowser ? {
      projects: [{
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook')
          })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['.storybook/vitest.setup.ts']
        }
      }]
    } : {})
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});