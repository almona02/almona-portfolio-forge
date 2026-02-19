#!/usr/bin/env npx tsx
/**
 * Gold Tier Verification Script
 * Precision discipline: type-check, lint gold-tier path, build
 * Run: npx tsx scripts/verify-gold-tier.ts
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const GOLD_TIER = join(ROOT, 'src/lib/fabricator/goldTier');

function run(cmd: string, desc: string): boolean {
  console.log(`\n▶ ${desc}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    console.log(`✅ ${desc}`);
    return true;
  } catch {
    console.error(`❌ ${desc} failed`);
    return false;
  }
}

function main(): void {
  console.log('🔬 Gold Tier Verification — Precision Discipline\n');
  console.log('Target: gold-tier core, BOM, hardener, gold-tier tests');
  console.log('Checks: type-check, lint (0 warnings), build');

  if (!existsSync(GOLD_TIER)) {
    console.error('❌ Gold tier directory not found:', GOLD_TIER);
    process.exit(1);
  }

  const steps = [
    () => run('npm run type-check', 'TypeScript type-check'),
    () => run(`npx eslint "src/lib/fabricator/goldTier/*.ts" "src/lib/fabricator/bom/*.ts" "src/lib/fabricator/hardener/*.ts" --ignore-pattern "*__tests__*" --ignore-pattern "*.test.ts" --max-warnings 0`, 'Lint gold-tier + BOM + hardener (0 warnings)'),
    () => run(`npx eslint "src/lib/fabricator/goldTier/__tests__/*.ts" --max-warnings 0`, 'Lint gold-tier tests (0 warnings)'),
    () => run('npm run build', 'Production build'),
  ];

  for (const step of steps) {
    if (!step()) {
      process.exit(1);
    }
  }

  console.log('\n✅ Gold Tier verification passed — precision discipline achieved.\n');
}

main();
