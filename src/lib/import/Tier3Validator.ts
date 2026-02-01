/**
 * Tier 3 Validator
 * 
 * Validates imported data against Tier 3 constraints (AICS-001 §3.1).
 * 
 * Constitutional Compliance: AICS-001 §3.1 (Tier 3 Protected Determinism)
 * All validation must be deterministic and rule-based (no AI/ML).
 * 
 * @since Phase 4: Precision Upgrade Plan (January 2026)
 */

import type { WindowUnit } from '@/types/fabricator';
import type { ImportValidationResult } from './types';

/**
 * Tier 3 Validator
 * 
 * Validates data against Tier 3 constraints deterministically.
 */
export class Tier3Validator {
  /**
   * Validate window unit
   * 
   * Performs deterministic validation against Tier 3 constraints.
   */
  async validate(windowUnit: WindowUnit): Promise<ImportValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missing: string[] = [];
    const mismatched: string[] = [];

    // Required fields validation
    if (!windowUnit.id) {
      errors.push('Window unit ID is required');
      missing.push('id');
    }

    if (!windowUnit.overallWidth || windowUnit.overallWidth <= 0) {
      errors.push('Overall width must be greater than 0');
      missing.push('overallWidth');
    }

    if (!windowUnit.overallHeight || windowUnit.overallHeight <= 0) {
      errors.push('Overall height must be greater than 0');
      missing.push('overallHeight');
    }

    // Dimension constraints (Egyptian standards)
    const MIN_WIDTH = 300; // 300mm minimum
    const MAX_WIDTH = 6000; // 6000mm maximum
    const MIN_HEIGHT = 300; // 300mm minimum
    const MAX_HEIGHT = 4000; // 4000mm maximum

    if (windowUnit.overallWidth < MIN_WIDTH) {
      errors.push(`Width ${windowUnit.overallWidth}mm is below minimum ${MIN_WIDTH}mm`);
      mismatched.push('overallWidth');
    }

    if (windowUnit.overallWidth > MAX_WIDTH) {
      errors.push(`Width ${windowUnit.overallWidth}mm exceeds maximum ${MAX_WIDTH}mm`);
      mismatched.push('overallWidth');
    }

    if (windowUnit.overallHeight < MIN_HEIGHT) {
      errors.push(`Height ${windowUnit.overallHeight}mm is below minimum ${MIN_HEIGHT}mm`);
      mismatched.push('overallHeight');
    }

    if (windowUnit.overallHeight > MAX_HEIGHT) {
      errors.push(`Height ${windowUnit.overallHeight}mm exceeds maximum ${MAX_HEIGHT}mm`);
      mismatched.push('overallHeight');
    }

    // Aspect ratio validation
    const aspectRatio = windowUnit.overallWidth / windowUnit.overallHeight;
    if (aspectRatio < 0.3 || aspectRatio > 3.0) {
      warnings.push(`Aspect ratio ${aspectRatio.toFixed(2)} is outside recommended range (0.3-3.0)`);
    }

    // Components validation
    if (!windowUnit.components || windowUnit.components.length === 0) {
      warnings.push('No components defined. Window unit may be incomplete.');
    }

    // Grid validation
    if (!windowUnit.grid) {
      warnings.push('No grid defined. Window unit may be incomplete.');
    } else {
      if (!windowUnit.grid.cells || windowUnit.grid.cells.length === 0) {
        warnings.push('Grid has no cells. Window unit may be incomplete.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missing,
      mismatched,
    };
  }
}

