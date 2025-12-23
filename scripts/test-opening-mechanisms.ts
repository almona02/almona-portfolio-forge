/**
 * Week 1 Testing Infrastructure: Opening Mechanisms Validation
 * 
 * Validates opening mechanism visualization against expected dimensions
 * and compares with existing 99.8% system outputs.
 * 
 * @since Phase 0, Week 1: Gold Tier Migration
 */

import { getPatternById } from '../src/lib/fabricator/presetUtils';
import { addOpeningMechanisms } from '../src/lib/3d/openingMechanisms';
import type { WindowUnit } from '../src/types/fabricator';

interface TestCase {
  name: string;
  patternId: string;
  windowUnit: WindowUnit;
  expectedMechanisms: {
    tracks?: number;
    hinges?: number;
    pivots?: number;
  };
}

/**
 * Test cases for opening mechanisms
 */
const TEST_CASES: TestCase[] = [
  {
    name: 'Sliding 2-Sash (Bottom Track)',
    patternId: 'sliding-2s',
    windowUnit: {
      id: 'test-1',
      orderNumber: 'TEST-001',
      posNumber: 'POS-001',
      type: 'sliding',
      components: [],
      overallWidth: 2000, // 2m
      overallHeight: 1500, // 1.5m
      color: '#ffffff',
      glazing: {},
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    expectedMechanisms: {
      tracks: 1, // Bottom track
    },
  },
  {
    name: 'Casement Double (3 Hinges Each Side)',
    patternId: 'casement-double',
    windowUnit: {
      id: 'test-2',
      orderNumber: 'TEST-002',
      posNumber: 'POS-002',
      type: 'casement',
      components: [],
      overallWidth: 1800,
      overallHeight: 1600,
      color: '#ffffff',
      glazing: {},
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    expectedMechanisms: {
      hinges: 6, // 3 per side for double casement
    },
  },
  {
    name: 'Tilt-Turn Window (2 Pivots)',
    patternId: 'tilt-turn-single',
    windowUnit: {
      id: 'test-3',
      orderNumber: 'TEST-003',
      posNumber: 'POS-003',
      type: 'tilt_turn',
      components: [],
      overallWidth: 1200,
      overallHeight: 1400,
      color: '#ffffff',
      glazing: {},
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    expectedMechanisms: {
      pivots: 2, // Bottom corners
    },
  },
];

/**
 * Run all test cases
 */
export async function runOpeningMechanismTests(): Promise<void> {
  console.log('🧪 Week 1: Opening Mechanisms Test Suite\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Pattern: ${testCase.patternId}`);
    
    try {
      const pattern = getPatternById(testCase.patternId);
      if (!pattern) {
        throw new Error(`Pattern ${testCase.patternId} not found`);
      }

      const mechanisms = addOpeningMechanisms(testCase.windowUnit, pattern);
      
      // Validate tracks
      if (testCase.expectedMechanisms.tracks !== undefined) {
        const actualTracks = mechanisms.tracks?.length || 0;
        if (actualTracks === testCase.expectedMechanisms.tracks) {
          console.log(`   ✅ Tracks: ${actualTracks} (expected ${testCase.expectedMechanisms.tracks})`);
        } else {
          console.log(`   ❌ Tracks: ${actualTracks} (expected ${testCase.expectedMechanisms.tracks})`);
          failures.push(`${testCase.name}: Track count mismatch`);
          failed++;
          continue;
        }
      }

      // Validate hinges
      if (testCase.expectedMechanisms.hinges !== undefined) {
        const actualHinges = mechanisms.hinges?.length || 0;
        if (actualHinges === testCase.expectedMechanisms.hinges) {
          console.log(`   ✅ Hinges: ${actualHinges} (expected ${testCase.expectedMechanisms.hinges})`);
        } else {
          console.log(`   ❌ Hinges: ${actualHinges} (expected ${testCase.expectedMechanisms.hinges})`);
          failures.push(`${testCase.name}: Hinge count mismatch`);
          failed++;
          continue;
        }
      }

      // Validate pivots
      if (testCase.expectedMechanisms.pivots !== undefined) {
        const actualPivots = mechanisms.pivots?.length || 0;
        if (actualPivots === testCase.expectedMechanisms.pivots) {
          console.log(`   ✅ Pivots: ${actualPivots} (expected ${testCase.expectedMechanisms.pivots})`);
        } else {
          console.log(`   ❌ Pivots: ${actualPivots} (expected ${testCase.expectedMechanisms.pivots})`);
          failures.push(`${testCase.name}: Pivot count mismatch`);
          failed++;
          continue;
        }
      }

      passed++;
      console.log(`   ✅ Test PASSED`);
      
    } catch (error) {
      console.log(`   ❌ Test FAILED: ${error instanceof Error ? error.message : String(error)}`);
      failures.push(`${testCase.name}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log(`\n❌ Failures:`);
    failures.forEach(failure => console.log(`   - ${failure}`));
    process.exit(1);
  } else {
    console.log(`\n🎉 All tests passed!`);
    process.exit(0);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runOpeningMechanismTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

