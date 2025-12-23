/**
 * Visual Validation Helper Script
 * 
 * This script helps automate some validation checks for opening mechanisms.
 * Run this in Node.js environment to check code structure and patterns.
 * 
 * Usage: npm run validate:visual
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  test: string;
  passed: boolean;
  message: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

const results: ValidationResult[] = [];

function validateFileExists(filePath: string, testName: string): ValidationResult {
  const exists = existsSync(filePath);
  return {
    test: testName,
    passed: exists,
    message: exists ? `✅ File exists: ${filePath}` : `❌ File missing: ${filePath}`,
    severity: exists ? undefined : 'critical'
  };
}

function validateFileContent(filePath: string, testName: string, searchString: string): ValidationResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const found = content.includes(searchString);
    return {
      test: testName,
      passed: found,
      message: found 
        ? `✅ Found: ${searchString}` 
        : `❌ Missing: ${searchString}`,
      severity: found ? undefined : 'high'
    };
  } catch (error) {
    return {
      test: testName,
      passed: false,
      message: `❌ Error reading file: ${error}`,
      severity: 'critical'
    };
  }
}

// Validation Tests
console.log('🔍 Starting Visual Validation Checks...\n');

// Test 1: Opening mechanisms file exists
results.push(validateFileExists(
  join(process.cwd(), 'src/lib/3d/openingMechanisms.ts'),
  'Opening Mechanisms Module Exists'
));

// Test 2: Feature flags file exists
results.push(validateFileExists(
  join(process.cwd(), 'src/lib/featureFlags.ts'),
  'Feature Flags Module Exists'
));

// Test 3: Window geometry imports opening mechanisms
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/3d/windowGeometry.ts'),
  'Window Geometry Imports Opening Mechanisms',
  "import { addOpeningMechanisms } from './openingMechanisms'"
));

// Test 4: Feature flag manager imported
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/3d/windowGeometry.ts'),
  'Window Geometry Imports Feature Flags',
  "import { FeatureFlagManager } from '../featureFlags'"
));

// Test 5: Feature flag check exists
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/3d/windowGeometry.ts'),
  'Feature Flag Check in Code',
  "FeatureFlagManager.isEnabled('ENABLE_OPENING_MECHANISMS')"
));

// Test 6: Opening mechanisms function exists
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/3d/openingMechanisms.ts'),
  'Add Opening Mechanisms Function Exists',
  'export function addOpeningMechanisms'
));

// Test 7: Sliding tracks function exists
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/3d/openingMechanisms.ts'),
  'Sliding Tracks Function Exists',
  'sliding'
));

// Test 8: Casement hinges function exists
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/3d/openingMechanisms.ts'),
  'Casement Hinges Function Exists',
  'casement'
));

// Test 9: Feature flag uses import.meta.env (not process.env)
results.push(validateFileContent(
  join(process.cwd(), 'src/lib/featureFlags.ts'),
  'Feature Flags Use import.meta.env',
  'import.meta.env'
));

// Test 10: No process.env in feature flags (browser compatibility)
const featureFlagsContent = existsSync(join(process.cwd(), 'src/lib/featureFlags.ts'))
  ? readFileSync(join(process.cwd(), 'src/lib/featureFlags.ts'), 'utf-8')
  : '';

const hasDirectProcessEnv = featureFlagsContent.includes('process.env.') && 
  !featureFlagsContent.includes('getEnvVar');

results.push({
  test: 'No Direct process.env Usage',
  passed: !hasDirectProcessEnv,
  message: hasDirectProcessEnv 
    ? '⚠️ Direct process.env usage found (should use getEnvVar helper)'
    : '✅ Using getEnvVar helper for browser compatibility',
  severity: hasDirectProcessEnv ? 'high' : undefined
});

// Print Results
console.log('📊 Validation Results:\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;
const criticalIssues: ValidationResult[] = [];
const highIssues: ValidationResult[] = [];

results.forEach((result, index) => {
  const icon = result.passed ? '✅' : '❌';
  const severity = result.severity ? ` [${result.severity.toUpperCase()}]` : '';
  console.log(`${index + 1}. ${icon} ${result.test}${severity}`);
  console.log(`   ${result.message}\n`);
  
  if (result.passed) {
    passed++;
  } else {
    failed++;
    if (result.severity === 'critical') {
      criticalIssues.push(result);
    } else if (result.severity === 'high') {
      highIssues.push(result);
    }
  }
});

console.log('='.repeat(60));
console.log(`\n📈 Summary: ${passed} passed, ${failed} failed\n`);

if (criticalIssues.length > 0) {
  console.log('🚨 CRITICAL ISSUES FOUND:');
  criticalIssues.forEach(issue => {
    console.log(`   - ${issue.test}: ${issue.message}`);
  });
  console.log('\n❌ Validation FAILED - Fix critical issues before proceeding\n');
  process.exit(1);
}

if (highIssues.length > 0) {
  console.log('⚠️ HIGH PRIORITY ISSUES:');
  highIssues.forEach(issue => {
    console.log(`   - ${issue.test}: ${issue.message}`);
  });
  console.log('\n⚠️ Validation PASSED with warnings - Review high priority issues\n');
} else {
  console.log('✅ All automated checks PASSED!\n');
  console.log('📋 Next Steps:');
  console.log('   1. Run manual visual validation using WEEK1_VISUAL_VALIDATION_CHECKLIST.md');
  console.log('   2. Test in browser at http://localhost:3000/fabricator/new');
  console.log('   3. Verify mechanisms appear correctly in 3D preview');
  console.log('   4. Test feature flag toggle\n');
}

process.exit(failed > 0 ? 1 : 0);

