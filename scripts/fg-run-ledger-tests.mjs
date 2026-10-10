/**
 * Working runner for cut-ledger tests when root vitest/storybook config is broken.
 * Prefer: npx vitest run --config vitest.ledger.config.ts
 * Fallback: this vite-node harness.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const vitest = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', '--config', 'vitest.ledger.config.ts', '--reporter=verbose'],
  { cwd: resolve('.'), stdio: 'inherit', shell: true },
);
if (vitest.status === 0) process.exit(0);

console.error('vitest.ledger.config failed; running vite-node assert harness');
const harness = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite-node', 'scripts/fg-ledger-test-harness.mjs'],
  { cwd: resolve('.'), stdio: 'inherit', shell: true },
);
process.exit(harness.status ?? 1);
