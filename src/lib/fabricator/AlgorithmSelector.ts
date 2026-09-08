/**
 * RULE-BASED ALGORITHM SELECTOR
 * 
 * Supreme Source: AICS-001 (Deterministic Authority)
 * Tier: 3 (Protected Determinism)
 * 
 * NOT Machine Learning. NOT YDT Intelligence.
 * Pure rule-based selection for transparency and auditability.
 * 
 * Constitutional Compliance:
 * - No AI inference in algorithm selection
 * - Deterministic rule application only
 * - Fully auditable decision logic
 * - No "confidence" or "prediction" claims
 * 
 * @version 2.0.0 (Constitutional Compliance)
 * @date 2026-01-01
 */

import { JobComplexity } from '@/algorithms/adaptiveSolver';
import {
  ALGORITHM_THRESHOLDS,
  EXPECTED_ALGORITHM_DURATIONS,
  EXPECTED_WASTE_PERCENTAGES,
} from './algorithmSelectionConstants';
import { ManufacturingAuthorityError } from './manufacturingAuthority';

/**
 * Algorithm Selection Result
 * 
 * Note: This is NOT a "prediction" - it is a deterministic selection
 * based on explicit rules. No ML, no AI, no uncertainty.
 */
export interface AlgorithmSelection {
  /**
   * Selected algorithm based on deterministic rules
   */
  algorithm: 'greedy' | 'linear' | 'genetic';

  /**
   * Rationale: Clear explanation of which rule was applied
   */
  rationale: string;
  
  /**
   * When true, selection is advisory/search-only and must not drive Tier-3 manufacturing truth (FP-016 Option B).
   */
  advisoryOnly?: boolean;
  
  /**
   * Expected performance metrics (based on historical averages, not predictions)
   */
  expectedWastePercentage: number;
  expectedDuration: number; // milliseconds
  
  /**
   * Constitutional note: Explicitly states tier and authority
   */
  constitutionalNote: string;
  
  /**
   * Rule identifier: Which specific rule was applied
   */
  ruleId: string;
}

/**
 * Rule-Based Algorithm Selector
 * 
 * Selects optimization algorithm using deterministic rules only.
 * No ML, no AI, no predictions - just transparent, auditable logic.
 */
export class AlgorithmSelector {
  /**
   * Select algorithm using deterministic rules
   * 
   * Rules are applied in priority order:
   * 1. Cut count thresholds
   * 2. Profile diversity
   * 3. Complexity score
   * 
   * All rules are explicit, auditable, and deterministic.
   */
  selectByRule(complexity: JobComplexity): AlgorithmSelection {
    // Rule 1: Simple jobs (<50 cuts) → Greedy
    if (complexity.totalCuts < ALGORITHM_THRESHOLDS.SIMPLE_JOB_MAX_CUTS) {
      return {
        algorithm: 'greedy',
        rationale: `Selected by deterministic rule 1.1: Job has ${complexity.totalCuts} cuts (below ${ALGORITHM_THRESHOLDS.SIMPLE_JOB_MAX_CUTS} threshold). Greedy algorithm is optimal for simple jobs.`,
        expectedWastePercentage: EXPECTED_WASTE_PERCENTAGES.GREEDY_WASTE_PERCENT, // Historical average, not prediction
        expectedDuration: EXPECTED_ALGORITHM_DURATIONS.GREEDY_DURATION_MS, // Historical average, not prediction
        constitutionalNote: 'Tier 3 deterministic selection. No AI involved. Rule-based only.',
        ruleId: 'rule_1.1_simple_job'
      };
    }
    
    // Rule 2: Medium jobs (50-500 cuts) → Linear Programming
    if (complexity.totalCuts < ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS) {
      return {
        algorithm: 'linear',
        rationale: `Selected by deterministic rule 1.2: Job has ${complexity.totalCuts} cuts (${ALGORITHM_THRESHOLDS.SIMPLE_JOB_MAX_CUTS}-${ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS} range). Linear programming provides optimal balance between speed and waste reduction.`,
        expectedWastePercentage: EXPECTED_WASTE_PERCENTAGES.LINEAR_WASTE_PERCENT, // Historical average, not prediction
        expectedDuration: EXPECTED_ALGORITHM_DURATIONS.LINEAR_DURATION_MS, // Historical average, not prediction
        constitutionalNote: 'Tier 3 deterministic selection. No AI involved. Rule-based only.',
        ruleId: 'rule_1.2_medium_job'
      };
    }
    
    // Rule 3: Complex jobs (500+ cuts) → Greedy (Tier-3 deterministic, scalable).
    // Genetic remains available as advisory/search-only via suggestAdvisoryGenetic() — FP-016 Option B.
    return {
      algorithm: 'greedy',
      rationale: `Selected by deterministic rule 1.3: Job has ${complexity.totalCuts} cuts (above ${ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS} threshold). Greedy is the Tier-3 manufacturing path for large jobs; genetic search is advisory-only (FP-016 Option B / AICS-001).`,
      expectedWastePercentage: EXPECTED_WASTE_PERCENTAGES.GREEDY_WASTE_PERCENT,
      expectedDuration: EXPECTED_ALGORITHM_DURATIONS.GREEDY_DURATION_MS,
      constitutionalNote: 'Tier 3 deterministic selection. No AI involved. Genetic excluded from manufacturing truth path.',
      ruleId: 'rule_1.3_complex_job_greedy',
      advisoryOnly: false,
    };
  }

  /**
   * Advisory-only genetic suggestion (NOT Tier-3 manufacturing authority).
   * Callers must not treat this as shop-floor / identical-output truth.
   */
  suggestAdvisoryGenetic(complexity: JobComplexity): AlgorithmSelection {
    return {
      algorithm: 'genetic',
      rationale: `Advisory search suggestion only: Job has ${complexity.totalCuts} cuts. Genetic optimization may explore alternatives but is NOT part of the Tier-3 protected manufacturing path (FP-016 Option B).`,
      expectedWastePercentage: EXPECTED_WASTE_PERCENTAGES.GENETIC_WASTE_PERCENT,
      expectedDuration: EXPECTED_ALGORITHM_DURATIONS.GENETIC_DURATION_MS,
      constitutionalNote: 'ADVISORY ONLY — not Tier-3 manufacturing truth. Non-deterministic search (Math.random). Do not use for identical-input identical-output guarantees.',
      ruleId: 'advisory_genetic_search_only',
      advisoryOnly: true,
    };
  }
  
  /**
   * Get all available rules (for transparency and auditability)
   */
  getRules(): Array<{
    id: string;
    description: string;
    condition: string;
    algorithm: 'greedy' | 'linear' | 'genetic';
  }> {
    return [
      {
        id: 'rule_1.1_simple_job',
        description: 'Simple job optimization',
        condition: `totalCuts < ${ALGORITHM_THRESHOLDS.SIMPLE_JOB_MAX_CUTS}`,
        algorithm: 'greedy'
      },
      {
        id: 'rule_1.2_medium_job',
        description: 'Medium job optimization',
        condition: `${ALGORITHM_THRESHOLDS.SIMPLE_JOB_MAX_CUTS} <= totalCuts < ${ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS}`,
        algorithm: 'linear'
      },
      {
        id: 'rule_1.3_complex_job_greedy',
        description: 'Complex job optimization (Tier-3 deterministic greedy)',
        condition: `totalCuts >= ${ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS}`,
        algorithm: 'greedy'
      },
      {
        id: 'advisory_genetic_search_only',
        description: 'Advisory genetic search (NOT Tier-3 manufacturing truth)',
        condition: 'explicit advisory request only',
        algorithm: 'genetic'
      }
    ];
  }
  
  /**
   * Promote a selection to Tier-3 manufacturing authority.
   * Advisory/genetic selections fail closed (FP-016 Option B).
   */
  authorizeForManufacturing(selection: AlgorithmSelection): AlgorithmSelection {
    if (selection.algorithm === 'genetic' || selection.advisoryOnly) {
      throw new ManufacturingAuthorityError(
        `[AICS-001 / FP-016] Cannot authorize algorithm="${selection.algorithm}" ` +
          `(advisoryOnly=${String(selection.advisoryOnly)}) for Tier-3 manufacturing truth.`
      );
    }
    const validation = this.validateSelection(selection);
    if (!validation.isValid) {
      throw new ManufacturingAuthorityError(
        `[AICS-001 / FP-016] Invalid Tier-3 selection: ${validation.errors.join('; ')}`
      );
    }
    return selection;
  }

  /**
   * Validate selection (constitutional compliance check)
   */
  validateSelection(selection: AlgorithmSelection): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check: No AI claims
    if (selection.rationale.toLowerCase().includes('ml') ||
        selection.rationale.toLowerCase().includes('machine learning') ||
        selection.rationale.toLowerCase().includes('ai') ||
        selection.rationale.toLowerCase().includes('predict')) {
      errors.push('Selection rationale contains prohibited AI/ML terminology');
    }
    
    // Check: Constitutional note present
    if (!selection.constitutionalNote) {
      errors.push('Selection missing required constitutional note');
    }
    
    // Check: Rule ID present
    if (!selection.ruleId) {
      errors.push('Selection missing required rule identifier');
    }
    
    // Check: Rationale explains rule (Tier-3) or advisory classification
    if (
      !selection.advisoryOnly &&
      !selection.rationale.includes('rule') &&
      !selection.rationale.includes('deterministic')
    ) {
      errors.push('Selection rationale must explain deterministic rule application');
    }

    // Check: Advisory genetic must be flagged
    if (selection.algorithm === 'genetic' && !selection.advisoryOnly) {
      errors.push('Genetic selection must set advisoryOnly=true (FP-016 Option B)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const algorithmSelector = new AlgorithmSelector();




