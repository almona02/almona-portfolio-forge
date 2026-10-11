import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

/** Isolated runner for cut-ledger preservation tests (avoids broken storybook vitest projects). */
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('test') },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: [],
    include: [
      'src/lib/fabricator/bom/preserveCutLedger.test.ts',
      'src/lib/fabricator/bom/ledgerParity.test.ts',
    ],
    pool: 'forks',
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
