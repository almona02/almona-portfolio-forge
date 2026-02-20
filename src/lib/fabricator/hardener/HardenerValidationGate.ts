/**
 * HardenerValidationGate - Constitutional Validation Gate
 * 
 * Validates hardener selection results and enforces system stops.
 * This is the constitutional gate that prevents invalid hardener selections from proceeding.
 * 
 * Constitutional Compliance: AICS-001 §3.6 (Pre-Execution Validation)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import type { HardenerSelectionResult, ValidationResult } from './types';

/**
 * Hardener Validation Gate
 * 
 * Enforces constitutional requirements for hardener selection.
 */
export class HardenerValidationGate {
  /**
   * Validate hardener selection result
   * 
   * Constitutional Requirement: System stop is correct behavior when validation fails
   */
  validateHardenerSelection(
    selection: HardenerSelectionResult,
    _windowUnit: import('@/types/fabricator').WindowUnit // Unused but kept for API consistency
  ): ValidationResult {
    // Check if selection failed
    if (selection.validation === 'FAIL' || !selection.hardenerCode) {
      return {
        isValid: false,
        systemStop: true,
        reason:
          'Hardener code selection failed. Manufacturing cannot proceed without valid hardener specification.',
        constitutionalNote:
          'AICS-001 §3.6: Pre-execution validation is mandatory. System stop is correct behavior (AICS-001 §2.8).',
        requiresHumanIntervention: true,
      };
    }

    // Check for warnings
    if (selection.validation === 'WARNING') {
      return {
        isValid: true,
        systemStop: false,
        warnings: selection.validationDetails.constraintViolations,
        requiresHumanIntervention: selection.requiresHumanIntervention || false,
        hardenerCode: selection.hardenerCode,
        ruleId: selection.ruleId,
      };
    }

    // Check Tier 3 compliance
    if (selection.tier !== 'Tier 3' || !selection.deterministic) {
      return {
        isValid: false,
        systemStop: true,
        reason: 'Hardener selection does not meet Tier 3 compliance requirements.',
        constitutionalNote:
          'AICS-001 §5.2: All execution paths must be Tier 3 Protected Determinism.',
        requiresHumanIntervention: true,
      };
    }

    // Check Egyptian Code compliance
    if (!selection.validationDetails.egyptianCodeCompliant) {
      return {
        isValid: true,
        systemStop: false,
        warnings: ['Selected hardener code is not Egyptian Code 2020 compliant.'],
        requiresHumanIntervention: true,
        hardenerCode: selection.hardenerCode,
        ruleId: selection.ruleId,
      };
    }

    // All validations passed
    return {
      isValid: true,
      systemStop: false,
      hardenerCode: selection.hardenerCode,
      ruleId: selection.ruleId,
    };
  }

  /**
   * Check if system stop is required
   */
  isSystemStopRequired(selection: HardenerSelectionResult): boolean {
    return (
      selection.systemStopRequired ||
      selection.validation === 'FAIL' ||
      !selection.hardenerCode ||
      selection.tier !== 'Tier 3' ||
      !selection.deterministic
    );
  }

  /**
   * Get system stop reason
   */
  getSystemStopReason(selection: HardenerSelectionResult): string {
    if (!selection.hardenerCode) {
      return 'No hardener code selected. Manufacturing cannot proceed.';
    }
    if (selection.validation === 'FAIL') {
      return `Hardener selection failed: ${selection.validationDetails.constraintViolations.join(', ')}`;
    }
    if (selection.tier !== 'Tier 3' || !selection.deterministic) {
      return 'Hardener selection does not meet Tier 3 compliance requirements.';
    }
    return 'System stop required due to hardener selection validation failure.';
  }
}

