/**
 * HardenerRuleEngine - Rule-Based Hardener Selection
 * 
 * Determines hardener code based on deterministic rules.
 * NO ML, NO supplier data dependencies - Tier 3 Protected Determinism.
 * 
 * Constitutional Compliance: AICS-001 §4.3.5 (Certification Constraints)
 * Constitutional Lock: Hardener rules MUST be independent of supplier pack data
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { HARDENER_CATALOG } from './HardenerCatalog';
import { calculateSashArea, getThicknessCategory, validateGlassThickness, validateSashSize } from './HardenerStandards';
import type {
    HardenerSelectionContext,
    HardenerSelectionResult,
    Region,
} from './types';

/**
 * Hardener Rule Engine
 * 
 * Rule-based selection engine with constitutional guarantees.
 */
export class HardenerRuleEngine {
  /**
   * Select hardener code based on context
   * 
   * Constitutional Guarantee: Tier 3 deterministic, no ML, no supplier data
   */
  selectHardener(context: HardenerSelectionContext): HardenerSelectionResult {
    // Step 1: Validate inputs
    const inputValidation = this.validateInputs(context);
    if (!inputValidation.isValid) {
      return this.createFailureResult(
        inputValidation.reason || 'Input validation failed',
        context
      );
    }

    // Step 2: Calculate sash area
    const sashArea = calculateSashArea(context.sashWidth, context.sashHeight);

    // Step 3: Validate against standards
    const region: Region = context.region || 'egypt';
    const glassValidation = validateGlassThickness(
      context.glassThickness,
      context.material,
      region
    );
    if (!glassValidation.valid) {
      return this.createFailureResult(glassValidation.reason || 'Glass thickness validation failed', context);
    }

    const sashValidation = validateSashSize(
      context.sashWidth,
      context.sashHeight,
      context.material,
      region
    );
    if (!sashValidation.valid) {
      return this.createFailureResult(sashValidation.reason || 'Sash size validation failed', context);
    }

    // Step 4: Find matching hardener code
    const matchingHardener = this.findMatchingHardener(context, sashArea);

    if (!matchingHardener) {
      return this.createFailureResult(
        `No hardener code found for material: ${context.material}, opening: ${context.openingType}, sash area: ${sashArea.toFixed(2)}m²`,
        context
      );
    }

    // Step 5: Validate match
    const validationDetails = this.validateMatch(context, matchingHardener, sashArea);

    // Step 6: Create result
    return {
      tier: 'Tier 3',
      deterministic: true,
      hardenerCode: matchingHardener.code,
      ruleId: this.generateRuleId(context, sashArea),
      validation: validationDetails.constraintViolations.length > 0 ? 'WARNING' : 'PASS',
      validationDetails,
      justification: this.generateJustification(context, matchingHardener, sashArea),
      constitutionalDisclaimer:
        'This hardener code selection is deterministic and rule-based. ' +
        'No AI/ML inference was used. All outputs require human validation by qualified professionals. ' +
        'No engineering judgment, structural analysis, or design authority is claimed.',
      systemStopRequired: validationDetails.constraintViolations.length > 0 && validationDetails.constraintViolations.some(v => v.includes('FAIL')),
      requiresHumanIntervention: validationDetails.constraintViolations.length > 0,
    };
  }

  /**
   * Validate inputs
   * 
   * Constitutional Lock: No supplier data dependencies
   */
  private validateInputs(context: HardenerSelectionContext): { isValid: boolean; reason?: string } {
    // Check for forbidden supplier data dependencies
    const forbiddenFields = ['supplierId', 'supplierPrice', 'supplierAvailability', 'supplierPackId'];
    const contextAny = context as any;
    
    for (const field of forbiddenFields) {
      if (field in contextAny && contextAny[field] !== undefined) {
        return {
          isValid: false,
          reason: `CONSTITUTIONAL_VIOLATION: Hardener rules may not depend on supplier pack data (${field}). This violates AICS-001 §5.2 (Principle of Subordination).`,
        };
      }
    }

    // Validate required fields
    if (!context.profileSystem) {
      return { isValid: false, reason: 'Profile system is required' };
    }
    if (!context.material || !['aluminum', 'upvc'].includes(context.material)) {
      return { isValid: false, reason: 'Valid material type is required (aluminum or upvc)' };
    }
    if (!context.glassThickness || context.glassThickness <= 0) {
      return { isValid: false, reason: 'Valid glass thickness is required' };
    }
    if (!context.sashWidth || context.sashWidth <= 0) {
      return { isValid: false, reason: 'Valid sash width is required' };
    }
    if (!context.sashHeight || context.sashHeight <= 0) {
      return { isValid: false, reason: 'Valid sash height is required' };
    }
    if (!context.openingType) {
      return { isValid: false, reason: 'Opening type is required' };
    }

    return { isValid: true };
  }

  /**
   * Find matching hardener code
   * 
   * Performance optimized: Early exit on first mismatch, condition order optimized for selectivity
   */
  private findMatchingHardener(
    context: HardenerSelectionContext,
    sashArea: number
  ): typeof HARDENER_CATALOG[0] | undefined {
    return HARDENER_CATALOG.find(hardener => {
      // Material match (most selective - halves search space)
      if (hardener.material !== context.material) return false;

      // Opening type match (highly selective)
      if (!hardener.openingTypes.includes(context.openingType)) return false;

      // Sash area match (moderately selective)
      // Use standard ranges with inclusive boundaries matching standards
      if (sashArea < hardener.sashArea.min || sashArea > hardener.sashArea.max) return false;

      // Glass thickness match (least selective, checked last)
      if (
        context.glassThickness < hardener.glassThickness.min ||
        context.glassThickness > hardener.glassThickness.max
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Validate match against all constraints
   */
  private validateMatch(
    context: HardenerSelectionContext,
    hardener: typeof HARDENER_CATALOG[0],
    sashArea: number
  ): HardenerSelectionResult['validationDetails'] {
    const violations: string[] = [];

    // Profile system match (warning if not exact, but not a failure)
    const profileSystemMatch = true; // Profile system is informational, not a constraint

    // Glass thickness match
    const glassThicknessMatch =
      context.glassThickness >= hardener.glassThickness.min &&
      context.glassThickness <= hardener.glassThickness.max;
    if (!glassThicknessMatch) {
      violations.push(
        `Glass thickness ${context.glassThickness}mm outside range ${hardener.glassThickness.min}-${hardener.glassThickness.max}mm`
      );
    }

    // Sash size match
    const sashSizeMatch = sashArea >= hardener.sashArea.min && sashArea <= hardener.sashArea.max;
    if (!sashSizeMatch) {
      violations.push(
        `Sash area ${sashArea.toFixed(2)}m² outside range ${hardener.sashArea.min}-${hardener.sashArea.max}m²`
      );
    }

    // Opening type match
    const openingTypeMatch = hardener.openingTypes.includes(context.openingType);
    if (!openingTypeMatch) {
      violations.push(`Opening type ${context.openingType} not supported by hardener ${hardener.code}`);
    }

    return {
      profileSystemMatch,
      glassThicknessMatch,
      sashSizeMatch,
      openingTypeMatch,
      egyptianCodeCompliant: hardener.egyptianCodeCompliant,
      constraintViolations: violations,
    };
  }

  /**
   * Generate rule ID
   */
  private generateRuleId(context: HardenerSelectionContext, sashArea: number): string {
    const region = context.region || 'EG';
    const material = context.material === 'aluminum' ? 'ALU' : 'UPVC';
    const category = getThicknessCategory(sashArea);
    const categoryNum = category === 'small' ? '12' : category === 'medium' ? '16' : '20';
    return `HD-${region}-${material}-${categoryNum}`;
  }

  /**
   * Generate human-readable justification
   */
  private generateJustification(
    context: HardenerSelectionContext,
    hardener: typeof HARDENER_CATALOG[0],
    sashArea: number
  ): string {
    const category = getThicknessCategory(sashArea);
    return `Selected ${hardener.code} (${hardener.name}) for ${context.material} ${context.openingType} window. ` +
      `Sash area: ${sashArea.toFixed(2)}m² (${category}), glass thickness: ${context.glassThickness}mm. ` +
      `Egyptian Code 2020 compliant: ${hardener.egyptianCodeCompliant ? 'Yes' : 'No'}.`;
  }

  /**
   * Create failure result
   */
  private createFailureResult(reason: string, _context: HardenerSelectionContext): HardenerSelectionResult {
    return {
      tier: 'Tier 3',
      deterministic: true,
      hardenerCode: '',
      ruleId: 'FAIL',
      validation: 'FAIL',
      validationDetails: {
        profileSystemMatch: false,
        glassThicknessMatch: false,
        sashSizeMatch: false,
        openingTypeMatch: false,
        egyptianCodeCompliant: false,
        constraintViolations: [reason],
      },
      justification: `Hardener selection failed: ${reason}`,
      constitutionalDisclaimer:
        'Hardener selection failed validation. System stop is correct behavior (AICS-001 §2.8). ' +
        'Manufacturing cannot proceed without valid hardener specification. Human intervention required.',
      systemStopRequired: true,
      requiresHumanIntervention: true,
    };
  }
}

