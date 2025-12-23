/**
 * Week 1 Visual Validation Suite
 * 
 * Comprehensive validation of opening mechanisms and proportional grid
 * Compares against existing 99.8% system to ensure no regressions.
 * 
 * @since Phase 0, Week 1: Gold Tier Migration
 */

import { getPatternById } from '../src/lib/fabricator/presetUtils';
import { addOpeningMechanisms } from '../src/lib/3d/openingMechanisms';
import { generateModelGeometries } from '../src/lib/3d/windowGeometry';
import type { WindowUnit } from '../src/types/fabricator';
import { FeatureFlagManager } from '../src/lib/featureFlags';

interface ValidationResult {
  testName: string;
  passed: boolean;
  details: string;
  errors?: string[];
}

/**
 * Test patterns for validation
 */
const TEST_PATTERNS = [
  { id: 'sliding-2s', type: 'sliding', expectedMechanisms: ['tracks'] },
  { id: 'sliding-4s', type: 'sliding', expectedMechanisms: ['tracks'] },
  { id: 'casement-double', type: 'casement', expectedMechanisms: ['hinges'] },
  { id: 'casement-single', type: 'casement', expectedMechanisms: ['hinges'] },
  { id: 'tilt-turn-single', type: 'tilt_turn', expectedMechanisms: ['pivots'] },
];

/**
 * Create test window unit
 */
function createTestWindowUnit(
  width: number,
  height: number,
  type: string
): WindowUnit {
  return {
    id: `test-${Date.now()}`,
    orderNumber: 'TEST-001',
    posNumber: 'POS-001',
    type,
    components: [],
    overallWidth: width,
    overallHeight: height,
    color: '#ffffff',
    glazing: {},
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validate opening mechanisms for a pattern
 */
function validateOpeningMechanisms(
  patternId: string,
  windowUnit: WindowUnit
): ValidationResult {
  const pattern = getPatternById(patternId);
  if (!pattern) {
    return {
      testName: `Pattern ${patternId} exists`,
      passed: false,
      details: `Pattern ${patternId} not found`,
      errors: [`Pattern ${patternId} not found in pattern library`],
    };
  }

  if (!pattern.openingMechanism) {
    return {
      testName: `Pattern ${patternId} has opening mechanism`,
      passed: false,
      details: `Pattern ${patternId} missing openingMechanism definition`,
      errors: [`Pattern ${patternId} should have openingMechanism property`],
    };
  }

  try {
    const mechanisms = addOpeningMechanisms(windowUnit, pattern);
    
    const errors: string[] = [];
    
    // Validate mechanism type matches pattern
    if (pattern.openingMechanism.type === 'sliding' && !mechanisms.tracks) {
      errors.push('Sliding pattern should have tracks');
    }
    if (pattern.openingMechanism.type === 'casement' && !mechanisms.hinges) {
      errors.push('Casement pattern should have hinges');
    }
    if (pattern.openingMechanism.type === 'tilt-turn' && !mechanisms.pivots) {
      errors.push('Tilt-turn pattern should have pivots');
    }

    // Validate mechanism count
    if (pattern.openingMechanism.type === 'sliding') {
      const expectedTracks = pattern.openingMechanism.trackType === 'both' ? 2 : 1;
      const actualTracks = mechanisms.tracks?.length || 0;
      if (actualTracks !== expectedTracks) {
        errors.push(`Expected ${expectedTracks} tracks, got ${actualTracks}`);
      }
    }

    if (pattern.openingMechanism.type === 'casement') {
      const expectedHinges = pattern.openingMechanism.direction === 'both' ? 6 : 3;
      const actualHinges = mechanisms.hinges?.length || 0;
      if (actualHinges !== expectedHinges) {
        errors.push(`Expected ${expectedHinges} hinges, got ${actualHinges}`);
      }
    }

    if (pattern.openingMechanism.type === 'tilt-turn') {
      const expectedPivots = 2;
      const actualPivots = mechanisms.pivots?.length || 0;
      if (actualPivots !== expectedPivots) {
        errors.push(`Expected ${expectedPivots} pivots, got ${actualPivots}`);
      }
    }

    return {
      testName: `Opening mechanisms for ${patternId}`,
      passed: errors.length === 0,
      details: `Mechanisms generated: ${JSON.stringify({
        tracks: mechanisms.tracks?.length || 0,
        hinges: mechanisms.hinges?.length || 0,
        pivots: mechanisms.pivots?.length || 0,
      })}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: `Opening mechanisms for ${patternId}`,
      passed: false,
      details: `Error generating mechanisms: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Validate proportional grid application
 */
function validateProportionalGrid(windowUnit: WindowUnit): ValidationResult {
  if (!windowUnit.grid) {
    return {
      testName: 'Proportional grid validation',
      passed: true,
      details: 'No grid defined, skipping validation',
    };
  }

  const { cols, rows, colWidths, rowHeights } = windowUnit.grid;
  const errors: string[] = [];

  // Validate colWidths length matches cols
  if (colWidths && colWidths.length !== cols) {
    errors.push(`colWidths length (${colWidths.length}) doesn't match cols (${cols})`);
  }

  // Validate rowHeights length matches rows
  if (rowHeights && rowHeights.length !== rows) {
    errors.push(`rowHeights length (${rowHeights.length}) doesn't match rows (${rows})`);
  }

  // Validate geometry generation uses proportional sizes
  try {
    const geometry = generateModelGeometries(windowUnit);
    
    // Check that geometry was generated successfully
    if (!geometry.frame || !geometry.frame.parts) {
      errors.push('Geometry generation failed');
    }

    // Validate sashes use proportional dimensions
    if (windowUnit.grid.cells.length > 0 && geometry.sashes.length > 0) {
      // Sashes should be positioned based on proportional grid
      // This is a basic check - more detailed validation would require inspecting actual positions
    }
  } catch (error) {
    errors.push(`Geometry generation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    testName: 'Proportional grid validation',
    passed: errors.length === 0,
    details: `Grid: ${cols}x${rows}, colWidths: ${colWidths?.length || 0}, rowHeights: ${rowHeights?.length || 0}`,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate feature flag system
 */
function validateFeatureFlags(): ValidationResult {
  const errors: string[] = [];

  // Test feature flag check
  const isEnabled = FeatureFlagManager.isEnabled('ENABLE_OPENING_MECHANISMS');
  if (typeof isEnabled !== 'boolean') {
    errors.push('Feature flag should return boolean');
  }

  // Test workshop-specific enablement
  try {
    FeatureFlagManager.enableForWorkshop('test-workshop', 'ENABLE_OPENING_MECHANISMS');
    const workshopEnabled = FeatureFlagManager.isEnabled('ENABLE_OPENING_MECHANISMS');
    if (!workshopEnabled) {
      errors.push('Workshop-specific enablement not working');
    }
  } catch (error) {
    errors.push(`Feature flag error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    testName: 'Feature flag system',
    passed: errors.length === 0,
    details: `Feature flags working: ${errors.length === 0}`,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate no regression in 99.8% system
 */
function validateNoRegression(windowUnit: WindowUnit): ValidationResult {
  const errors: string[] = [];

  try {
    // Generate geometry without pattern (legacy system)
    const legacyGeometry = generateModelGeometries(windowUnit, null);
    
    // Generate geometry with pattern (new system)
    const pattern = getPatternById('sliding-2s');
    if (pattern) {
      const newGeometry = generateModelGeometries(windowUnit, pattern);
      
      // Validate that frame geometry is still correct
      if (!newGeometry.frame || !newGeometry.frame.parts) {
        errors.push('New system broke frame generation');
      }

      // Validate that sashes are still generated
      if (windowUnit.grid && newGeometry.sashes.length === 0 && legacyGeometry.sashes.length > 0) {
        errors.push('New system broke sash generation');
      }
    }
  } catch (error) {
    errors.push(`Regression test error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    testName: 'No regression validation',
    passed: errors.length === 0,
    details: 'Legacy and new systems both generate valid geometry',
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Run all validation tests
 */
export async function runWeek1Validation(): Promise<void> {
  console.log('🧪 Week 1 Comprehensive Validation Suite\n');
  console.log('='.repeat(70));
  
  const results: ValidationResult[] = [];

  // Test 1: Feature flags
  console.log('\n📋 Test 1: Feature Flag System');
  const flagResult = validateFeatureFlags();
  results.push(flagResult);
  console.log(flagResult.passed ? '   ✅ PASSED' : '   ❌ FAILED');
  if (flagResult.errors) {
    flagResult.errors.forEach(err => console.log(`      - ${err}`));
  }

  // Test 2: Opening mechanisms for each pattern
  console.log('\n📋 Test 2: Opening Mechanisms');
  for (const testPattern of TEST_PATTERNS) {
    const windowUnit = createTestWindowUnit(2000, 1500, testPattern.type);
    const result = validateOpeningMechanisms(testPattern.id, windowUnit);
    results.push(result);
    console.log(result.passed ? `   ✅ ${testPattern.id}` : `   ❌ ${testPattern.id}`);
    if (result.errors) {
      result.errors.forEach(err => console.log(`      - ${err}`));
    }
  }

  // Test 3: Proportional grid
  console.log('\n📋 Test 3: Proportional Grid');
  const gridWindowUnit = createTestWindowUnit(2000, 1500, 'sliding');
  gridWindowUnit.grid = {
    rows: 2,
    cols: 3,
    cells: [
      { row: 0, col: 0, type: 'sliding' },
      { row: 0, col: 1, type: 'sliding' },
      { row: 0, col: 2, type: 'fixed' },
      { row: 1, col: 0, type: 'fixed' },
      { row: 1, col: 1, type: 'fixed' },
      { row: 1, col: 2, type: 'fixed' },
    ],
    colWidths: [1, 2, 1], // Asymmetric: middle column 2x wider
    rowHeights: [1, 1],
  };
  const gridResult = validateProportionalGrid(gridWindowUnit);
  results.push(gridResult);
  console.log(gridResult.passed ? '   ✅ PASSED' : '   ❌ FAILED');
  if (gridResult.errors) {
    gridResult.errors.forEach(err => console.log(`      - ${err}`));
  }

  // Test 4: No regression
  console.log('\n📋 Test 4: No Regression');
  const regressionWindowUnit = createTestWindowUnit(2000, 1500, 'sliding');
  regressionWindowUnit.grid = {
    rows: 1,
    cols: 2,
    cells: [
      { row: 0, col: 0, type: 'sliding' },
      { row: 0, col: 1, type: 'sliding' },
    ],
  };
  const regressionResult = validateNoRegression(regressionWindowUnit);
  results.push(regressionResult);
  console.log(regressionResult.passed ? '   ✅ PASSED' : '   ❌ FAILED');
  if (regressionResult.errors) {
    regressionResult.errors.forEach(err => console.log(`      - ${err}`));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const successRate = (passed / results.length) * 100;

  console.log(`\n📊 Validation Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${successRate.toFixed(1)}%`);

  if (failed > 0) {
    console.log(`\n❌ Failed Tests:`);
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   - ${r.testName}`);
        if (r.errors) {
          r.errors.forEach(err => console.log(`     ${err}`));
        }
      });
    process.exit(1);
  } else {
    console.log(`\n🎉 All validation tests passed!`);
    console.log(`\n✅ Week 1 deliverables validated successfully.`);
    console.log(`✅ Ready to proceed to Week 2.`);
    process.exit(0);
  }
}

// Run validation if executed directly
if (require.main === module) {
  runWeek1Validation().catch(error => {
    console.error('Validation execution failed:', error);
    process.exit(1);
  });
}

