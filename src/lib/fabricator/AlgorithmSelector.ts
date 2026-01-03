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
   * Format: "Selected by deterministic rule X.Y from system pack Z"
   */
  rationale: string;
  
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
    
    // Rule 3: Complex jobs (500+ cuts) → Genetic Algorithm
    return {
      algorithm: 'genetic',
      rationale: `Selected by deterministic rule 1.3: Job has ${complexity.totalCuts} cuts (above ${ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS} threshold). Genetic algorithm is required for complex optimization.`,
      expectedWastePercentage: EXPECTED_WASTE_PERCENTAGES.GENETIC_WASTE_PERCENT, // Historical average, not prediction
      expectedDuration: EXPECTED_ALGORITHM_DURATIONS.GENETIC_DURATION_MS, // Historical average, not prediction
      constitutionalNote: 'Tier 3 deterministic selection. No AI involved. Rule-based only.',
      ruleId: 'rule_1.3_complex_job'
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
        id: 'rule_1.3_complex_job',
        description: 'Complex job optimization',
        condition: `totalCuts >= ${ALGORITHM_THRESHOLDS.MEDIUM_JOB_MAX_CUTS}`,
        algorithm: 'genetic'
      }
    ];
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
    
    // Check: Rationale explains rule
    if (!selection.rationale.includes('rule') && !selection.rationale.includes('deterministic')) {
      errors.push('Selection rationale must explain deterministic rule application');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const algorithmSelector = new AlgorithmSelector();




