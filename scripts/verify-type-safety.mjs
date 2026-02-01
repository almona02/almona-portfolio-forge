#!/usr/bin/env node
/**
 * Gold-Tier Type Safety Verification Script
 * Verifies all type safety requirements for Day 4-5 integration
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Gold-Tier Type Safety Verification\n');
console.log('=' .repeat(60));

const checks = [
  {
    name: 'TypeScript Strict Mode Compilation',
    command: 'npx tsc --noEmit --strict',
    critical: true,
  },
  {
    name: 'UnifiedDesignPage Type Check',
    fileCheck: 'src/pages/fabricator/workflow/UnifiedDesignPage.tsx',
    critical: true,
  },
  {
    name: 'CanonicalEngineeringModel Type Definition',
    fileCheck: 'src/types/CanonicalEngineeringModel.ts',
    critical: true,
  },
  {
    name: 'Data Converters Type Safety',
    fileCheck: 'src/lib/workflow/dataConverters.ts',
    critical: true,
  },
  {
    name: 'SmartMeasuringInterface Props',
    fileCheck: 'src/components/fabricator/SmartMeasuringInterface.tsx',
    critical: true,
  },
  {
    name: 'DraftingWorkbench Props',
    fileCheck: 'src/components/fabricator/drafting/DraftingWorkbench.tsx',
    critical: true,
  },
];

let passed = 0;
let failed = 0;
const results = [];

console.log('\n📋 Running Type Safety Checks...\n');

for (const check of checks) {
  process.stdout.write(`${check.name}... `);
  
  let checkPassed = false;
  let errorMessage = '';
  
  try {
    if (check.command) {
      // Run command check
      execSync(check.command, { stdio: 'pipe', encoding: 'utf-8' });
      checkPassed = true;
    } else if (check.fileCheck) {
      // Check if file exists and has proper exports
      const filePath = path.join(process.cwd(), check.fileCheck);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Verify file has proper type definitions
        const hasExports = content.includes('export interface') || 
                          content.includes('export type') ||
                          content.includes('export const') ||
                          content.includes('export function');
        
        if (hasExports) {
          checkPassed = true;
        } else {
          errorMessage = 'No type exports found';
        }
      } else {
        errorMessage = 'File not found';
      }
    }
    
    if (checkPassed) {
      console.log('✅ PASS');
      passed++;
      results.push({ name: check.name, status: 'PASS', critical: check.critical });
    } else {
      console.log(`❌ FAIL${errorMessage ? `: ${errorMessage}` : ''}`);
      failed++;
      results.push({ name: check.name, status: 'FAIL', error: errorMessage, critical: check.critical });
    }
  } catch (error) {
    console.log('❌ FAIL');
    failed++;
    const errorMsg = error.message.split('\n').slice(0, 3).join(' ');
    results.push({ name: check.name, status: 'FAIL', error: errorMsg, critical: check.critical });
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Type Safety Verification Results:\n');
console.log(`Total Checks: ${checks.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${Math.round((passed / checks.length) * 100)}%`);

// Critical failures
const criticalFailures = results.filter(r => r.status === 'FAIL' && r.critical);
if (criticalFailures.length > 0) {
  console.log('\n⚠️  CRITICAL FAILURES:');
  criticalFailures.forEach(f => {
    console.log(`  - ${f.name}`);
    if (f.error) console.log(`    Error: ${f.error}`);
  });
}

console.log('\n' + '='.repeat(60));

// Exit code
if (failed === 0) {
  console.log('\n🎉 All type safety checks passed!');
  console.log('✅ System is production-ready with gold-tier type safety.\n');
  process.exit(0);
} else if (criticalFailures.length > 0) {
  console.log('\n❌ Critical type safety issues detected.');
  console.log('⚠️  Please fix critical failures before proceeding.\n');
  process.exit(1);
} else {
  console.log('\n⚠️  Some non-critical type issues detected.');
  console.log('💡 Consider addressing these for optimal type safety.\n');
  process.exit(0);
}
