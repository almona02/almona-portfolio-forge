/**
 * Optimization Equalizer Constants
 * 
 * Defines default values, slider ranges, query limits,
 * and input constraints for optimization strategy configuration.
 * 
 * @since Phase 2: Optimization Equalizer Enhancement
 */

/**
 * Default optimization parameters
 */
export const DEFAULT_OPTIMIZATION_PARAMS = {
  /**
   * Default minimum remnant length (mm)
   * Remnants shorter than this will not be considered for reuse
   */
  DEFAULT_MIN_REMNANT_LENGTH_MM: 200,

  /**
   * Default maximum remnant age (days)
   * Remnants older than this will be excluded from optimization
   */
  DEFAULT_MAX_REMNANT_AGE_DAYS: 90,
} as const;

/**
 * Database query limits
 */
export const QUERY_LIMITS = {
  /**
   * Maximum number of saved preferences to load
   * Limits query results for performance
   */
  MAX_SAVED_PREFERENCES: 10,
} as const;

/**
 * Slider configuration
 */
export const SLIDER_CONFIG = {
  /**
   * Minimum slider value (percentage)
   */
  MIN_VALUE: 0,

  /**
   * Maximum slider value (percentage)
   */
  MAX_VALUE: 100,

  /**
   * Slider step increment
   */
  STEP: 1,
} as const;

/**
 * Input field constraints
 */
export const INPUT_CONSTRAINTS = {
  /**
   * Minimum remnant length (mm)
   */
  MIN_REMNANT_LENGTH_MM: 0,

  /**
   * Maximum remnant length (mm)
   */
  MAX_REMNANT_LENGTH_MM: 1000,

  /**
   * Minimum remnant age (days)
   */
  MIN_REMNANT_AGE_DAYS: 1,

  /**
   * Maximum remnant age (days)
   */
  MAX_REMNANT_AGE_DAYS: 365,
} as const;

/**
 * UI dimension constants
 */
export const UI_DIMENSIONS = {
  /**
   * Icon sizes
   */
  ICON_MEDIUM: 'h-4 w-4',
  ICON_LARGE: 'h-5 w-5',
} as const;

