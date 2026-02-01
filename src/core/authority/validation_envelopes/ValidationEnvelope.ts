/**
 * @file ValidationEnvelope.ts
 * @description Validation Envelope - Unified constraint enforcement
 * 
 * AICS-001 Reference: Section 4.4 (Constraint Enforcement Model)
 * 
 * Requirements:
 * - All candidate solutions tested against all constraint categories
 * - Failure in any single category results in rejection
 * - Partial compliance is not permitted
 * - Constraint evaluation is transparent and traceable
 * - Binary enforcement: complies or does not
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import { ConstraintCategory, getConstraintRegistry } from './ConstraintRegistry';
import type { DeterministicConstraint } from './index';

/**
 * Constraint Validation Result
 * 
 * Result of validating a single constraint.
 */
export interface ConstraintValidationResult {
  constraintId: string;
  constraintName: string;
  category: ConstraintCategory;
  passed: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Category Validation Result
 * 
 * Result of validating all constraints in a category.
 */
export interface CategoryValidationResult {
  category: ConstraintCategory;
  passed: boolean;
  constraintResults: ConstraintValidationResult[];
  errorCount: number;
  totalConstraints: number;
}

/**
 * Validation Envelope Result
 * 
 * Complete result of validation envelope evaluation.
 * 
 * AICS-001 Section 4.4: "Constraint enforcement is binary: A solution either complies or it does not."
 */
export interface ValidationEnvelopeResult {
  /**
   * Overall compliance status
   * 
   * True if ALL categories passed, false if ANY category failed.
   * AICS-001 Section 4.4: "Failure in any single category results in rejection"
   */
  complies: boolean;

  /**
   * Results for each category
   * 
   * All five categories (4.3.1-4.3.5) are tested cumulatively.
   */
  categoryResults: Map<ConstraintCategory, CategoryValidationResult>;

  /**
   * Failed categories
   * 
   * Categories that failed validation.
   */
  failedCategories: ConstraintCategory[];

  /**
   * All constraint validation results
   * 
   * Transparent and traceable evaluation record.
   */
  allConstraintResults: ConstraintValidationResult[];

  /**
   * Validation timestamp
   */
  timestamp: Date;

  /**
   * Validation metadata
   */
  metadata: {
    totalConstraints: number;
    totalCategories: number;
    passedCategories: number;
    failedCategories: number;
  };
}

/**
 * Validation Context
 * 
 * Context passed to constraint validation functions.
 */
export interface ValidationContext {
  [key: string]: unknown;
}

/**
 * Validation Envelope Engine
 * 
 * Enforces all deterministic constraints through unified evaluation.
 * 
 * AICS-001 Section 4.4 Requirements:
 * - All candidate solutions are tested against all constraint categories
 * - Failure in any single category results in rejection
 * - Partial compliance is not permitted
 * - Constraint evaluation is transparent and traceable
 * - Binary enforcement: complies or does not
 */
export class ValidationEnvelopeEngine {
  private registry = getConstraintRegistry();

  /**
   * Validate a candidate solution against all constraint categories
   * 
   * AICS-001 Section 4.4: "All candidate solutions are tested against all constraint categories"
   * 
   * @param context - Validation context (inputs to be validated)
   * @returns Validation envelope result
   */
  validate(context: ValidationContext): ValidationEnvelopeResult {
    const timestamp = new Date();
    const categoryResults = new Map<ConstraintCategory, CategoryValidationResult>();
    const allConstraintResults: ConstraintValidationResult[] = [];

    let totalConstraints = 0;

    // Validate each category
    Object.values(ConstraintCategory).forEach((category) => {
      const categoryResult = this.validateCategory(category, context, timestamp);
      categoryResults.set(category, categoryResult);
      allConstraintResults.push(...categoryResult.constraintResults);
      totalConstraints += categoryResult.totalConstraints;
    });

    // Determine overall compliance
    // AICS-001 Section 4.4: "Failure in any single category results in rejection"
    const failedCategories = Array.from(categoryResults.values())
      .filter((result) => !result.passed)
      .map((result) => result.category);

    const complies = failedCategories.length === 0;

    // Calculate metadata
    const passedCategories = categoryResults.size - failedCategories.length;

    return {
      complies,
      categoryResults,
      failedCategories,
      allConstraintResults,
      timestamp,
      metadata: {
        totalConstraints,
        totalCategories: categoryResults.size,
        passedCategories,
        failedCategories: failedCategories.length,
      },
    };
  }

  /**
   * Validate a single category
   * 
   * Tests all constraints in the category.
   * Category passes only if ALL constraints pass.
   * 
   * @param category - The constraint category to validate
   * @param context - Validation context
   * @param timestamp - Validation timestamp
   * @returns Category validation result
   */
  private validateCategory(
    category: ConstraintCategory,
    context: ValidationContext,
    timestamp: Date
  ): CategoryValidationResult {
    const constraints = this.registry.getByCategory(category);
    const constraintResults: ConstraintValidationResult[] = [];

    // Validate each constraint in the category
    constraints.forEach((constraint) => {
      const result = this.validateConstraint(constraint, category, context, timestamp);
      constraintResults.push(result);
    });

    // Category passes only if ALL constraints pass
    // AICS-001 Section 4.4: "Partial compliance is not permitted"
    const errorCount = constraintResults.filter((r) => !r.passed).length;
    const passed = errorCount === 0;

    return {
      category,
      passed,
      constraintResults,
      errorCount,
      totalConstraints: constraints.length,
    };
  }

  /**
   * Validate a single constraint
   * 
   * Executes the constraint's validation function.
   * 
   * @param constraint - The constraint to validate
   * @param category - The constraint's category
   * @param context - Validation context
   * @param timestamp - Validation timestamp
   * @returns Constraint validation result
   */
  private validateConstraint(
    constraint: DeterministicConstraint,
    category: ConstraintCategory,
    context: ValidationContext,
    timestamp: Date
  ): ConstraintValidationResult {
    try {
      // Execute constraint validation function
      const passed = constraint.validationFn(context);

      return {
        constraintId: constraint.constraintId,
        constraintName: constraint.description,
        category,
        passed,
        timestamp,
        ...(passed
          ? {}
          : {
              error: `Constraint ${constraint.constraintId} (${constraint.description}) failed validation`,
            }),
      };
    } catch (error) {
      // Constraint validation function threw an error
      // This is treated as a failure
      return {
        constraintId: constraint.constraintId,
        constraintName: constraint.description,
        category,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp,
      };
    }
  }

  /**
   * Get validation summary
   * 
   * Provides human-readable summary of validation result.
   */
  getValidationSummary(result: ValidationEnvelopeResult): string {
    if (result.complies) {
      return `Validation PASSED: All ${result.metadata.totalCategories} categories passed (${result.metadata.totalConstraints} constraints)`;
    }

    const failedCategoryNames = result.failedCategories.join(', ');
    const totalFailed = result.allConstraintResults.filter((r) => !r.passed).length;

    return `Validation FAILED: ${result.metadata.failedCategories} category/categories failed (${failedCategoryNames}). ${totalFailed} constraint(s) failed.`;
  }

  /**
   * Get detailed error report
   * 
   * Provides detailed error information for debugging and auditing.
   */
  getErrorReport(result: ValidationEnvelopeResult): string[] {
    const errors: string[] = [];

    if (result.complies) {
      return errors;
    }

    // Add failed categories
    result.failedCategories.forEach((category) => {
      const categoryResult = result.categoryResults.get(category);
      if (categoryResult) {
        errors.push(`Category ${category} FAILED:`);
        categoryResult.constraintResults
          .filter((r) => !r.passed)
          .forEach((r) => {
            errors.push(`  - ${r.constraintName} (${r.constraintId}): ${r.error || 'Validation failed'}`);
          });
      }
    });

    return errors;
  }
}

/**
 * Global validation envelope engine instance
 */
let globalEnvelope: ValidationEnvelopeEngine | null = null;

/**
 * Get the global validation envelope engine
 */
export function getValidationEnvelope(): ValidationEnvelopeEngine {
  if (!globalEnvelope) {
    globalEnvelope = new ValidationEnvelopeEngine();
  }
  return globalEnvelope;
}

/**
 * Reset the global validation envelope engine (mainly for testing)
 */
export function resetValidationEnvelope(): void {
  globalEnvelope = new ValidationEnvelopeEngine();
}

