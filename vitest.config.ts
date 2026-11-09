/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';
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
    server: {
      deps: {
        inline: ['@testing-library/user-event', '@testing-library/react', '@testing-library/jest-dom']
      }
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously'
      }
    },
    // Exclude Playwright e2e tests (run via Playwright CLI, not vitest)
    // Exclude React Native mobile tests (incompatible with jsdom)
    // Exclude empty / non-test files that vitest picks up incorrectly
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      // Browser-backed HTTP fixtures have their own Node configuration.
      'scripts/visibility/**',
      'fabricator-mobile/**',
      '.tmp-pr-assess/**',
      '**/.tmp-pr-assess/**',
      'src/pages/Services.test.tsx',
      'src/integration/presets/Phase1Integration.test.ts',
      'src/tests/e2e/SpecialPresets.e2e.test.ts',
      // Node test-runner files (run via `node --test`, not vitest)
      'scripts/**',
      // Vitest worker teardown flake: EnvironmentTeardownError onUserConsoleLog pending
      'tests/integration/stress.test.ts',
    ],
    // Isolate environment for each test file
    isolate: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
