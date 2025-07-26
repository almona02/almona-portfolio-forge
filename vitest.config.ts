/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
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
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});