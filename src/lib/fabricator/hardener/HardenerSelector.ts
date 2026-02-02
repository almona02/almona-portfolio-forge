/**
 * HardenerSelector - Main Hardener Selection Interface
 * 
 * Public API for hardener code selection.
 * This is the main entry point for hardener selection in the system.
 * 
 * Constitutional Compliance: AICS-001 §4.3.5 (Certification Constraints)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { HardenerRuleEngine } from './HardenerRuleEngine';
import { HardenerValidationGate } from './HardenerValidationGate';
import type {
    HardenerSelectionContext,
    HardenerSelectionResult,
    ValidationResult,
} from './types';

/**
 * Hardener Selector
 * 
 * Main interface for hardener code selection with constitutional guarantees.
 */
export class HardenerSelector {
  private ruleEngine: HardenerRuleEngine;
  private validationGate: HardenerValidationGate;

  constructor() {
    this.ruleEngine = new HardenerRuleEngine();
    this.validationGate = new HardenerValidationGate();
  }

  /**
   * Select hardener code for a window unit
   * 
   * Constitutional Guarantee: Tier 3 deterministic, no ML, no supplier data
   */
  selectHardenerForWindowUnit(
    windowUnit: WindowUnit,
    systemPack: SystemPack | null
  ): HardenerSelectionResult {
    // Extract context from window unit
    const context = this.extractContext(windowUnit, systemPack);

    // Select hardener using rule engine
    const selection = this.ruleEngine.selectHardener(context);

    // Validate through constitutional gate
    const validation = this.validationGate.validateHardenerSelection(selection, windowUnit);

    // If validation fails, return failure result
    if (!validation.isValid && validation.systemStop) {
      return {
        ...selection,
        validation: 'FAIL',
        systemStopRequired: true,
        requiresHumanIntervention: true,
      };
    }

    // Return validated selection
    return selection;
  }

  /**
   * Select hardener code from context
   * 
   * Direct selection from context (for testing and advanced use cases)
   */
  selectHardener(context: HardenerSelectionContext): HardenerSelectionResult {
    const selection = this.ruleEngine.selectHardener(context);
    return selection;
  }

  /**
   * Validate hardener selection result
   */
  validateSelection(selection: HardenerSelectionResult, windowUnit: WindowUnit): ValidationResult {
    return this.validationGate.validateHardenerSelection(selection, windowUnit);
  }

  /**
   * Check if system stop is required
   */
  isSystemStopRequired(selection: HardenerSelectionResult): boolean {
    return this.validationGate.isSystemStopRequired(selection);
  }

  /**
   * Extract selection context from window unit
   * 
   * Public method for context extraction (used by audit logging)
   */
  extractContext(
    windowUnit: WindowUnit,
    systemPack: SystemPack | null
  ): HardenerSelectionContext {
    // Determine material from system pack category
    const material = systemPack?.category?.includes('upvc') ? 'upvc' : 'aluminum';

    // Get glass thickness (default to 6mm if not specified)
    const glassThickness = windowUnit.glazing?.thickness || 6;

    // Get sash dimensions (use overall dimensions as fallback)
    const sashWidth = windowUnit.overallWidth || 1000;
    const sashHeight = windowUnit.overallHeight || 1000;

    // Determine opening type from window unit type
    const openingType = this.mapOpeningType(windowUnit.type);

    // Get profile system from system pack
    const profileSystem = systemPack?.id || windowUnit.systemPackId || 'unknown';

    return {
      profileSystem,
      material,
      glassThickness,
      sashWidth,
      sashHeight,
      openingType,
      region: 'egypt', // Default to Egypt, can be overridden
    };
  }

  /**
   * Map window unit type to opening type
   */
  private mapOpeningType(windowType: string | undefined): HardenerSelectionContext['openingType'] {
    if (!windowType) return 'casement'; // Default if type is missing
    const typeLower = windowType.toLowerCase();
    if (typeLower.includes('casement')) return 'casement';
    if (typeLower.includes('tilt') || typeLower.includes('turn')) return 'tilt-turn';
    if (typeLower.includes('sliding')) return 'sliding';
    if (typeLower.includes('fixed')) return 'fixed';
    if (typeLower.includes('pivot')) return 'pivot';
    return 'casement'; // Default to casement
  }
}

/**
 * Singleton instance for convenience
 */
export const hardenerSelector = new HardenerSelector();

