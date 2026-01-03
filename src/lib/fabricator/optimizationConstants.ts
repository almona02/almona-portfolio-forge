/**
 * Optimization Engine Constants
 * 
 * Defines precision, rounding, and calculation constants for the
 * First-Fit Decreasing optimization algorithm.
 * 
 * Focus: Achieve 99.8% accuracy through micron-level precision.
 * 
 * @since Phase 2: University-Grade Precision
 * @version 2.0.0
 */

/**
 * Precision and rounding constants
 */
export const OPTIMIZATION_PRECISION = {
  /**
   * Precision multiplier for floating point rounding
   * JavaScript is bad at math - round to 0.01mm precision
   * Formula: Math.round(num * 100) / 100
   */
  PRECISION_MULTIPLIER: 100,

  /**
   * Decimal places for utilization and waste display
   * Round to 2 decimal places for readability
   */
  DECIMAL_PLACES: 2,

  /**
   * Percentage multiplier for utilization calculations
   * Formula: (totalUsed / totalMaterial) * 100
   */
  PERCENTAGE_MULTIPLIER: 100,
} as const;

/**
 * Default bar initialization values
 */
export const DEFAULT_BAR_VALUES = {
  /**
   * Default used length for new bars (mm)
   * New bars start with 0 used length
   */
  DEFAULT_USED_LENGTH_MM: 0,

  /**
   * Default position for first cut in new bar (mm)
   * First cut starts at position 0
   */
  DEFAULT_FIRST_CUT_POSITION_MM: 0,

  /**
   * Default kerf for last cut (mm)
   * Last cut doesn't need kerf (no material left after cut)
   */
  DEFAULT_LAST_CUT_KERF_MM: 0,
} as const;

