/**
 * Repeatable ledger contract runner for merge evidence.
 * Authoritative suite: scripts/fg-ledger-contract-suite.mjs (vite-node).
 * Does not depend on Vitest/Storybook describe.config.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const cwd = resolve('.');
const art = resolve('test-results/final-goal-staging');
mkdirSync(art, { recursive: true });

const suite = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite-node', 'scripts/fg-ledger-contract-suite.mjs'],
  { cwd, stdio: 'inherit', shell: true },
);

const report = {
  runner: 'vite-node scripts/fg-ledger-contract-suite.mjs',
  status: suite.status === 0 ? 'passed' : 'failed',
  exitCode: suite.status ?? 1,
  at: new Date().toISOString(),
  sha: process.env.GITHUB_SHA || null,
};
writeFileSync(resolve(art, 'fg-ledger-contract-report.json'), `${JSON.stringify(report, null, 2)}\n`);
process.exit(suite.status ?? 1);
