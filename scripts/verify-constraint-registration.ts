/**
 * Constraint Registration Verification Script
 * 
 * Verifies constraint registration completeness:
 * 1. All constraint categories represented
 * 2. AICS-001 references correct
 * 3. Constraint validation functions deterministic
 * 4. Priorities set appropriately
 * 5. ValidationEnvelope reports correct category coverage
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
import { getValidationEnvelope } from '../src/core/authority/validation_envelopes/ValidationEnvelope';

interface VerificationResult {
  category: ConstraintCategory;
  constraintCount: number;
  hasConstraints: boolean;
  constraints: Array<{
    constraintId: string;
    ruleId: string;
    deterministic: boolean;
    priority: number;
    category: ConstraintCategory;
  }>;
  aics001References: {
    valid: number;
    invalid: number;
    missing: number;
  };
  deterministic: {
    allDeterministic: boolean;
    nonDeterministic: string[];
  };
  priorities: {
    allSet: boolean;
    missingPriorities: string[];
  };
}

function verifyConstraintRegistration(): {
  categoryResults: Map<ConstraintCategory, VerificationResult>;
  overallStatus: {
    allCategoriesRepresented: boolean;
    allAICS001ReferencesValid: boolean;
    allDeterministic: boolean;
    allPrioritiesSet: boolean;
    totalConstraints: number;
  };
} {
  // Reset and register all constraints
  resetConstraintRegistry();
  registerGeometricConstraints();
  registerMaterialAndCertificationConstraints();
  registerMachineConstraints();

  const registry = getConstraintRegistry();
  const categoryResults = new Map<ConstraintCategory, VerificationResult>();

  // Verify each category
  Object.values(ConstraintCategory).forEach((category) => {
    const constraints = registry.getByCategory(category);
    const constraintDetails = constraints.map((entry) => ({
      constraintId: entry.constraint.constraintId,
      ruleId: entry.constraint.ruleId,
      deterministic: entry.constraint.deterministic,
      priority: entry.priority,
      category: entry.category,
    }));

    // Verify AICS-001 references
    const aics001References = {
      valid: 0,
      invalid: 0,
      missing: 0,
    };

    constraintDetails.forEach((constraint) => {
      if (!constraint.ruleId) {
        aics001References.missing++;
      } else if (constraint.ruleId.startsWith('AICS-001')) {
        // Verify format: AICS-001-4.3.X-Y
        const match = constraint.ruleId.match(/AICS-001-4\.3\.(\d+)-(\d+)/);
        if (match) {
          const section = parseInt(match[1], 10);
          const expectedSection = getExpectedSectionForCategory(category);
          if (section === expectedSection) {
            aics001References.valid++;
          } else {
            aics001References.invalid++;
          }
        } else {
          aics001References.invalid++;
        }
      } else {
        aics001References.invalid++;
      }
    });

    // Verify deterministic
    const nonDeterministic = constraintDetails
      .filter((c) => !c.deterministic)
      .map((c) => c.constraintId);

    // Verify priorities (all should be set, typically 10-200 range)
    const missingPriorities = constraintDetails
      .filter((c) => c.priority === undefined || c.priority === null)
      .map((c) => c.constraintId);

    const result: VerificationResult = {
      category,
      constraintCount: constraints.length,
      hasConstraints: constraints.length > 0,
      constraints: constraintDetails,
      aics001References,
      deterministic: {
        allDeterministic: nonDeterministic.length === 0,
        nonDeterministic,
      },
      priorities: {
        allSet: missingPriorities.length === 0,
        missingPriorities,
      },
    };

    categoryResults.set(category, result);
  });

  // Overall status
  const allCategoriesRepresented = Array.from(categoryResults.values()).every(
    (result) => result.hasConstraints
  );
  const allAICS001ReferencesValid = Array.from(categoryResults.values()).every(
    (result) =>
      result.aics001References.valid === result.constraintCount &&
      result.aics001References.invalid === 0 &&
      result.aics001References.missing === 0
  );
  const allDeterministic = Array.from(categoryResults.values()).every(
    (result) => result.deterministic.allDeterministic
  );
  const allPrioritiesSet = Array.from(categoryResults.values()).every(
    (result) => result.priorities.allSet
  );
  const totalConstraints = Array.from(categoryResults.values()).reduce(
    (sum, result) => sum + result.constraintCount,
    0
  );

  return {
    categoryResults,
    overallStatus: {
      allCategoriesRepresented,
      allAICS001ReferencesValid,
      allDeterministic,
      allPrioritiesSet,
      totalConstraints,
    },
  };
}

function getExpectedSectionForCategory(category: ConstraintCategory): number {
  switch (category) {
    case ConstraintCategory.GEOMETRIC:
      return 1;
    case ConstraintCategory.MATERIAL:
      return 2;
    case ConstraintCategory.MACHINE:
      return 3;
    case ConstraintCategory.PROCESS:
      return 4;
    case ConstraintCategory.CERTIFICATION:
      return 5;
    default:
      return 0;
  }
}

// Run verification
const verification = verifyConstraintRegistration();

// Print results
console.log('=== Constraint Registration Verification ===\n');

Object.values(ConstraintCategory).forEach((category) => {
  const result = verification.categoryResults.get(category)!;
  console.log(`\n${category.toUpperCase()} Constraints:`);
  console.log(`  Count: ${result.constraintCount}`);
  console.log(`  Has Constraints: ${result.hasConstraints ? '✅' : '❌'}`);
  console.log(`  AICS-001 References: ${result.aics001References.valid} valid, ${result.aics001References.invalid} invalid, ${result.aics001References.missing} missing`);
  console.log(`  Deterministic: ${result.deterministic.allDeterministic ? '✅ All' : '❌ ' + result.deterministic.nonDeterministic.length + ' non-deterministic'}`);
  console.log(`  Priorities Set: ${result.priorities.allSet ? '✅ All' : '❌ ' + result.priorities.missingPriorities.length + ' missing'}`);
  
  if (result.aics001References.invalid > 0 || result.aics001References.missing > 0) {
    console.log(`  ⚠️  Invalid/Missing AICS-001 References:`);
    result.constraints.forEach((c) => {
      if (!c.ruleId || !c.ruleId.startsWith('AICS-001-4.3.')) {
        console.log(`    - ${c.constraintId}: ${c.ruleId || 'MISSING'}`);
      }
    });
  }
  
  if (result.deterministic.nonDeterministic.length > 0) {
    console.log(`  ⚠️  Non-Deterministic Constraints:`);
    result.deterministic.nonDeterministic.forEach((id) => {
      console.log(`    - ${id}`);
    });
  }
  
  if (result.priorities.missingPriorities.length > 0) {
    console.log(`  ⚠️  Missing Priorities:`);
    result.priorities.missingPriorities.forEach((id) => {
      console.log(`    - ${id}`);
    });
  }
});

console.log('\n=== Overall Status ===');
console.log(`All Categories Represented: ${verification.overallStatus.allCategoriesRepresented ? '✅' : '❌'}`);
console.log(`All AICS-001 References Valid: ${verification.overallStatus.allAICS001ReferencesValid ? '✅' : '❌'}`);
console.log(`All Deterministic: ${verification.overallStatus.allDeterministic ? '✅' : '❌'}`);
console.log(`All Priorities Set: ${verification.overallStatus.allPrioritiesSet ? '✅' : '❌'}`);
console.log(`Total Constraints: ${verification.overallStatus.totalConstraints}`);

// Verify ValidationEnvelope category coverage
console.log('\n=== ValidationEnvelope Category Coverage ===');
const envelope = getValidationEnvelope();
const testContext = { width: 1200, height: 1500, grid: { rows: 1, cols: 1, cells: [] } };
const result = envelope.validate(testContext);
console.log(`Categories Evaluated: ${result.categoryResults.size}/5`);
console.log(`Categories with Constraints:`);
result.categoryResults.forEach((categoryResult, category) => {
  const registry = getConstraintRegistry();
  const constraints = registry.getByCategory(category);
  console.log(`  ${category}: ${constraints.length} constraints, ${categoryResult.totalConstraints} evaluated`);
});


