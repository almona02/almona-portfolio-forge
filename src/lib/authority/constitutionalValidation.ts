/**
 * Constitutional Validation for Tier 3 Operations
 * 
 * Validates that production outputs comply with ALMONA constitutional guarantees:
 * - Tier 3: Protected Determinism (no ML/AI in execution)
 * - Full audit trail
 * - Human validation required disclaimers
 * - Deterministic guarantees
 * 
 * Location: Core Authority Layer
 */

import type { WindowUnit, Profile } from '@/types/fabricator';
import type { OperationMode } from '@/core/authority/constitution/AuthorityContext';

export interface ConstitutionalValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string; consequences?: string[] }>;
  warnings: string[];
  tier: 'Tier 3';
  requiresHumanReview: boolean;
}

export interface ConstitutionalMetadata {
  tier: 'Tier 3';
  deterministic: boolean;
  operationMode: OperationMode;
  workshopId?: string;
  validatedAt: string;
  disclaimer: string;
  auditTrailId?: string;
}

/**
 * Validate constitutional compliance before Tier 3 operations (production)
 */
export function validateConstitutionalCompliance(
  project: WindowUnit,
  inventory: Profile[],
  operationMode: OperationMode
): ConstitutionalValidationResult {
  const errors: Array<{ field: string; message: string; consequences?: string[] }> = [];
  const warnings: string[] = [];

  // Check 1: Project must have optimization (deterministic cutting plan)
  if (!project.optimization) {
    errors.push({
      field: 'optimization',
      message: 'Project must have a deterministic cutting plan before production',
      consequences: [
        'Cannot generate manufacturing instructions',
        'Material requirements cannot be calculated',
        'Production cannot proceed safely'
      ]
    });
  }

  // Check 2: Optimization must be deterministic (no ML predictions in execution)
  if (project.optimization) {
    // Verify optimization result structure is deterministic
    if (!project.optimization.cuttingPlan || project.optimization.cuttingPlan.length === 0) {
      errors.push({
        field: 'optimization.cuttingPlan',
        message: 'Cutting plan is empty or invalid',
        consequences: [
          'No manufacturing instructions available',
          'Cannot proceed to production'
        ]
      });
    }

    // Check for any ML/confidence scores in optimization (forbidden in Tier 3)
    const optimizationStr = JSON.stringify(project.optimization);
    if (optimizationStr.includes('confidence') || 
        optimizationStr.includes('prediction') ||
        optimizationStr.includes('ml') ||
        optimizationStr.includes('neural')) {
      errors.push({
        field: 'optimization',
        message: 'Optimization contains prohibited ML/AI logic (Tier 3 violation)',
        consequences: [
          'Constitutional guarantee violated',
          'Output is not deterministic',
          'Cannot proceed to production'
        ]
      });
    }
  }

  // Check 3: Components must be validated
  if (!project.components || project.components.length === 0) {
    errors.push({
      field: 'components',
      message: 'Project must have validated components before production',
      consequences: [
        'No window structure defined',
        'Cannot generate BOM',
        'Production cannot proceed'
      ]
    });
  }

  // Check 4: Inventory must be available
  if (!inventory || inventory.length === 0) {
    warnings.push('No inventory profiles available - stock validation may be incomplete');
  }

  // Check 5: Operation mode must be valid
  if (operationMode === 'certified' && !project.optimization) {
    errors.push({
      field: 'operationMode',
      message: 'Certified mode requires validated optimization',
      consequences: [
        'Cannot proceed in certified mode',
        'Switch to sandbox or production mode'
      ]
    });
  }

  const isValid = errors.length === 0;
  const requiresHumanReview = warnings.length > 0 || operationMode === 'certified';

  return {
    isValid,
    errors,
    warnings,
    tier: 'Tier 3',
    requiresHumanReview
  };
}

/**
 * Generate constitutional metadata for production outputs
 */
export function generateConstitutionalMetadata(
  project: WindowUnit,
  operationMode: OperationMode,
  workshopId?: string,
  auditTrailId?: string
): ConstitutionalMetadata {
  return {
    tier: 'Tier 3',
    deterministic: true,
    operationMode,
    workshopId,
    validatedAt: new Date().toISOString(),
    disclaimer: 'This output contains manufacturable instructions only. ' +
                'No engineering judgment, structural analysis, or design authority is claimed. ' +
                'All outputs require human validation by qualified professionals before use in production.',
    auditTrailId
  };
}

