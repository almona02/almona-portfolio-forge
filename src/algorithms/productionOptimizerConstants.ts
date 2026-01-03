/**
 * Production Optimizer Constants
 * 
 * Centralized constants for ProductionOptimizer to improve maintainability
 * and make configuration values easily discoverable.
 */

/** Strategy-specific iteration counts */
export const STRATEGY_ITERATIONS = {
  FAST: 10,
  BALANCED: 50,
  OPTIMAL: 200,
} as const;

/** Target utilization percentage for optimization */
export const TARGET_UTILIZATION = 95.0;

/** Minimum accuracy threshold (99.8%) */
export const ACCURACY_THRESHOLD = 99.8;

/** Default stock length in millimeters */
export const DEFAULT_STOCK_LENGTH_MM = 6000;

/** Standard saw blade kerf width in millimeters */
export const STANDARD_KERF_MM = 4.2;

/** Progress calculation constants */
export const PROGRESS_PERCENTAGES = {
  INITIALIZATION: 0,
  HEURISTIC_COMPLETE: 30,
  GENETIC_START: 30,
  GENETIC_RANGE: 60, // Genetic refinement uses 30-90% of progress
  COMPLETE: 100,
} as const;

/** Percentage multiplier for calculations */
export const PERCENTAGE_MULTIPLIER = 100;

/** Decimal precision for accuracy calculation */
export const ACCURACY_DECIMAL_PLACES = 2;

