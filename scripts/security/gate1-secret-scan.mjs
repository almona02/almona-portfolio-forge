#!/usr/bin/env node
/**
 * Gate 1 — repository secret / shipability scan (FP-013 / FP-014).
 * Exit 0 = pass; exit 1 = fail.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
let failed = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed += 1;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function collectTsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collectTsFiles(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

const forbiddenEnv = tracked.filter(
  (f) => f === '.env' || f === 'python_backend/.env' || f === 'pg.env',
);

if (forbiddenEnv.length) {
  fail(`Tracked secret env files: ${forbiddenEnv.join(', ')}`);
} else {
  ok('No tracked .env / python_backend/.env / pg.env');
}

const historyCount = Number(
  execSync('git rev-list --all --count -- .env python_backend/.env pg.env', {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim() || '0',
);
if (historyCount > 0) {
  fail(`.env still reachable in git history (${historyCount} commit(s)) — purge stash/branches/history`);
} else {
  ok('No .env / python_backend/.env / pg.env in reachable git history');
}

const srcRoot = join(ROOT, 'src');
const srcFiles = existsSync(srcRoot) ? collectTsFiles(srcRoot) : [];

const checks = [
  { name: 'VITE_STRIPE_SECRET_KEY', test: (t) => /VITE_STRIPE_SECRET_KEY/.test(t) },
  { name: 'sk_live_ literal', test: (t) => /sk_live_[A-Za-z0-9]{16,}/.test(t) },
  { name: 'sk_test_ literal', test: (t) => /sk_test_[A-Za-z0-9]{16,}/.test(t) },
  {
    name: "runtime import from 'stripe'",
    test: (t) => /import\s+(?!type\b)[^;]*from\s+['"]stripe['"]/.test(t),
  },
  { name: 'new Stripe(', test: (t) => /new\s+Stripe\s*\(/.test(t) },
];

for (const file of srcFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  for (const { name, test } of checks) {
    if (test(text)) fail(`${name} in ${rel}`);
  }
}

const paymentService = join(ROOT, 'src/services/payments/PaymentService.ts');
if (existsSync(paymentService)) {
  const ps = readFileSync(paymentService, 'utf8');
  if (/from\s+['"]stripe['"]/.test(ps) || /await import\(['"]stripe['"]\)/.test(ps)) {
    fail('PaymentService.ts still imports stripe');
  } else {
    ok('PaymentService.ts has no stripe import');
  }
  if (/loadStripe/.test(ps)) {
    fail('PaymentService.ts still has loadStripe helper');
  } else {
    ok('PaymentService.ts has no loadStripe');
  }
}

const envExample = join(ROOT, '.env.example');
if (existsSync(envExample)) {
  const ex = readFileSync(envExample, 'utf8');
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./.test(ex)) {
    fail('.env.example contains a JWT-like key — use placeholders');
  } else {
    ok('.env.example has no JWT-like secrets');
  }
}

if (failed > 0) {
  console.error(`\nGate 1 secret scan FAILED (${failed} issue(s)).`);
  process.exit(1);
}
console.log('\nGate 1 secret scan PASSED.');
process.exit(0);
