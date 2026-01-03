/**
 * Algorithm Selection Constants
 * 
 * Defines cut count thresholds, expected performance metrics,
 * and algorithm selection rules for deterministic optimization.
 * 
 * Constitutional Compliance: Tier 3 (Protected Determinism)
 * - No ML/AI in algorithm selection
 * - Pure rule-based selection
 * - Fully auditable decision logic
 * 
 * @version 2.0.0 (Constitutional Compliance)
 */

/**
 * Cut count thresholds for algorithm selection
 */
export const ALGORITHM_THRESHOLDS = {
  /**
   * Simple job threshold
   * Jobs with fewer than this many cuts use greedy algorithm
   */
  SIMPLE_JOB_MAX_CUTS: 50,

  /**
   * Medium job threshold
   * Jobs with 50-500 cuts use linear programming
   */
  MEDIUM_JOB_MAX_CUTS: 500,
} as const;

/**
 * Expected waste percentages (historical averages, not predictions)
 * These are based on historical data, not ML predictions
 */
export const EXPECTED_WASTE_PERCENTAGES = {
  /**
   * Expected waste for greedy algorithm (%)
   */
  GREEDY_WASTE_PERCENT: 8,

  /**
   * Expected waste for linear programming (%)
   */
  LINEAR_WASTE_PERCENT: 6,

  /**
   * Expected waste for genetic algorithm (%)
   */
  GENETIC_WASTE_PERCENT: 4,
} as const;

/**
 * Expected algorithm durations (milliseconds)
 * Historical averages, not predictions
 */
export const EXPECTED_ALGORITHM_DURATIONS = {
  /**
   * Expected duration for greedy algorithm (ms)
   */
  GREEDY_DURATION_MS: 2000,

  /**
   * Expected duration for linear programming (ms)
   */
  LINEAR_DURATION_MS: 10000,

  /**
   * Expected duration for genetic algorithm (ms)
   */
  GENETIC_DURATION_MS: 45000,
} as const;

