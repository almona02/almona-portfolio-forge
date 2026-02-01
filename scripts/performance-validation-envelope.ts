/**
 * Performance Validation for ValidationEnvelope
 * 
 * Tests performance with all 70+ constraints.
 */

import {
  getValidationEnvelope,
  resetValidationEnvelope,
  resetConstraintRegistry,
  ConstraintCategory,
} from '../src/core/authority/validation_envelopes';
import {
  registerGeometricConstraints,
  type DesignValidationContext,
} from '../src/core/authority/validation_envelopes/RegisteredConstraints';
import {
  registerMaterialAndCertificationConstraints,
} from '../src/core/authority/validation_envelopes/MaterialCertificationConstraints';
import {
  registerMachineConstraints,
} from '../src/core/authority/validation_envelopes/MachineConstraints';
import {
  registerProcessConstraints,
} from '../src/core/authority/validation_envelopes/ProcessConstraints';
import { getConstraintRegistry } from '../src/core/authority/validation_envelopes/ConstraintRegistry';
import type { WindowGrid } from '../src/types/fabricator';

// Helper: Create a simple window grid
function createSimpleWindowGrid(rows: number = 1, cols: number = 1): WindowGrid {
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        type: col === 0 ? 'sash' : 'fixed',
      });
    }
  }
  return { rows, cols, cells };
}

// Helper: Create a design validation context
function createDesignContext(
  width: number,
  height: number,
  grid?: WindowGrid,
  systemId?: string
): DesignValidationContext {
  return {
    width,
    height,
    grid: grid || createSimpleWindowGrid(),
    systemId: systemId || 'generic',
  };
}

// Reset and register all constraints
resetConstraintRegistry();
resetValidationEnvelope();

registerGeometricConstraints();
registerMaterialAndCertificationConstraints();
registerMachineConstraints();
registerProcessConstraints();

const registry = getConstraintRegistry();
const envelope = getValidationEnvelope();

// Count constraints
const categories = [
  ConstraintCategory.GEOMETRIC,
  ConstraintCategory.MATERIAL,
  ConstraintCategory.MACHINE,
  ConstraintCategory.PROCESS,
  ConstraintCategory.CERTIFICATION,
];

let totalConstraints = 0;
categories.forEach((category) => {
  const count = registry.getByCategory(category).length;
  totalConstraints += count;
});

console.log('Performance Validation for ValidationEnvelope\n');
console.log('='.repeat(60));
console.log(`Total Constraints: ${totalConstraints}`);
console.log('='.repeat(60));
console.log('\nRunning performance tests...\n');

// Test 1: Simple validation (valid design)
console.log('Test 1: Simple validation (valid design)');
const context1 = createDesignContext(1500, 2000);
const start1 = performance.now();
const result1 = envelope.validate(context1);
const end1 = performance.now();
const duration1 = end1 - start1;
console.log(`  Duration: ${duration1.toFixed(2)}ms`);
console.log(`  Result: ${result1.complies ? 'PASSED' : 'FAILED'}`);
console.log(`  Constraints evaluated: ${result1.allConstraintResults.length}`);
console.log(`  Status: ${duration1 < 500 ? '✅ PASS (<500ms)' : '❌ FAIL (>=500ms)'}`);

// Test 2: Complex validation (large grid)
console.log('\nTest 2: Complex validation (large grid)');
const context2 = createDesignContext(3000, 2500, createSimpleWindowGrid(3, 3));
const start2 = performance.now();
const result2 = envelope.validate(context2);
const end2 = performance.now();
const duration2 = end2 - start2;
console.log(`  Duration: ${duration2.toFixed(2)}ms`);
console.log(`  Result: ${result2.complies ? 'PASSED' : 'FAILED'}`);
console.log(`  Constraints evaluated: ${result2.allConstraintResults.length}`);
console.log(`  Status: ${duration2 < 500 ? '✅ PASS (<500ms)' : '❌ FAIL (>=500ms)'}`);

// Test 3: Invalid design (should fail quickly)
console.log('\nTest 3: Invalid design (should fail quickly)');
const context3 = createDesignContext(100, 100); // Too small
const start3 = performance.now();
const result3 = envelope.validate(context3);
const end3 = performance.now();
const duration3 = end3 - start3;
console.log(`  Duration: ${duration3.toFixed(2)}ms`);
console.log(`  Result: ${result3.complies ? 'PASSED' : 'FAILED'}`);
console.log(`  Constraints evaluated: ${result3.allConstraintResults.length}`);
console.log(`  Status: ${duration3 < 500 ? '✅ PASS (<500ms)' : '❌ FAIL (>=500ms)'}`);

// Test 4: Multiple validations (average performance)
console.log('\nTest 4: Multiple validations (average performance)');
const contexts = [
  createDesignContext(1500, 2000),
  createDesignContext(2000, 1800),
  createDesignContext(1800, 2200),
  createDesignContext(1600, 1900),
  createDesignContext(1900, 2100),
];
const start4 = performance.now();
contexts.forEach(context => envelope.validate(context));
const end4 = performance.now();
const avgDuration = (end4 - start4) / contexts.length;
console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
console.log(`  Total duration: ${(end4 - start4).toFixed(2)}ms`);
console.log(`  Status: ${avgDuration < 500 ? '✅ PASS (<500ms avg)' : '❌ FAIL (>=500ms avg)'}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('Performance Summary:');
console.log('='.repeat(60));
const allPassed = duration1 < 500 && duration2 < 500 && duration3 < 500 && avgDuration < 500;
console.log(`All tests passed: ${allPassed ? '✅ YES' : '❌ NO'}`);
console.log(`Max duration: ${Math.max(duration1, duration2, duration3, avgDuration).toFixed(2)}ms`);
console.log(`Target: <500ms`);
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);

