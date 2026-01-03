/**
 * Cutting Optimization Engine Constants
 * 
 * Defines default values for cutting optimization calculations,
 * waste comparison, and machine integration.
 * 
 * @since Phase 2: Cutting Optimization
 */

/**
 * Stock and calculation constants
 */
export const CUTTING_OPTIMIZATION_CONSTANTS = {
  /**
   * Standard stock length (mm)
   * Common 6-meter stock length
   */
  STANDARD_STOCK_LENGTH_MM: 6000,

  /**
   * Percentage multiplier for utilization calculations
   */
  PERCENTAGE_MULTIPLIER: 100,

  /**
   * Default cost per bar estimate (EGP)
   * Used for waste comparison calculations
   */
  DEFAULT_COST_PER_BAR_EGP: 500,

  /**
   * Decimal places for utilization and waste display
   */
  DECIMAL_PLACES: 2,
} as const;

/**
 * Machine simulation and network constants
 */
export const MACHINE_CONSTANTS = {
  /**
   * Simulation delay for machine operations (ms)
   * Used when simulating machine communication
   */
  SIMULATION_DELAY_MS: 2000,

  /**
   * Default position number
   * Used when position number is not specified
   */
  DEFAULT_POSITION_NUMBER: 1,
} as const;

/**
 * Available Yilmaz machine models
 */
export const YILMAZ_MACHINE_MODELS = [
  'AIM-3410',
  'AIM-7510',
  'ALM-6510',
  'ALM-7510',
  'PIM-6509',
  'PIM-7510',
] as const;

/**
 * Default machine model
 */
export const DEFAULT_MACHINE_MODEL: typeof YILMAZ_MACHINE_MODELS[number] = 'AIM-3410';

