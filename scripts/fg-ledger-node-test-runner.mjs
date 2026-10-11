/** Thin alias — authoritative suite is fg-ledger-contract-suite.mjs */
import { spawnSync } from 'node:child_process';
const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite-node', 'scripts/fg-ledger-contract-suite.mjs'],
  { cwd: process.cwd(), stdio: 'inherit', shell: true },
);
process.exit(r.status ?? 1);
