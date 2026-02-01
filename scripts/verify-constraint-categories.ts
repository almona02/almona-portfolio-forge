/**
 * Verify Constraint Categories Registration
 * 
 * Script to verify all 5 constraint categories are registered.
 */

import {
  getConstraintRegistry,
  ConstraintCategory,
  resetConstraintRegistry,
} from '../src/core/authority/validation_envelopes/ConstraintRegistry';
import {
  registerGeometricConstraints,
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

// Reset registry
resetConstraintRegistry();

// Register all constraints
registerGeometricConstraints();
registerMaterialAndCertificationConstraints();
registerMachineConstraints();
registerProcessConstraints();

// Get registry
const registry = getConstraintRegistry();

// Count constraints by category
const categories = [
  ConstraintCategory.GEOMETRIC,
  ConstraintCategory.MATERIAL,
  ConstraintCategory.MACHINE,
  ConstraintCategory.PROCESS,
  ConstraintCategory.CERTIFICATION,
];

console.log('Constraint Category Registration Status:\n');
console.log('='.repeat(60));

let totalConstraints = 0;

categories.forEach((category) => {
  const constraints = registry.getByCategory(category);
  const count = constraints.length;
  totalConstraints += count;
  
  const status = count > 0 ? '✅' : '🔴';
  const categoryName = category.charAt(0) + category.slice(1).toLowerCase();
  
  console.log(`${status} ${categoryName.padEnd(20)}: ${count.toString().padStart(3)} constraints`);
});

console.log('='.repeat(60));
console.log(`Total Constraints: ${totalConstraints}`);
console.log(`Categories Complete: ${categories.filter(cat => registry.getByCategory(cat).length > 0).length}/5`);

// Verify all categories are registered
const allRegistered = categories.every(cat => registry.getByCategory(cat).length > 0);

if (allRegistered) {
  console.log('\n✅ All 5 constraint categories are registered!');
  process.exit(0);
} else {
  console.log('\n🔴 Some constraint categories are missing!');
  process.exit(1);
}

