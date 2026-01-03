/**
 * Real-Time Quote Constants
 * 
 * Defines cost breakdown percentages, payment term multipliers,
 * and conversion factors for quote calculations.
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

/**
 * Material cost breakdown percentages
 * These percentages allocate total material cost across different categories
 */
export const MATERIAL_BREAKDOWN_PERCENTAGES = {
  /**
   * Profiles percentage of total material cost
   * Typically the largest component (40%)
   */
  PROFILES: 0.4,

  /**
   * Glass percentage of total material cost
   * Second largest component (30%)
   */
  GLASS: 0.3,

  /**
   * Hardware percentage of total material cost
   * Third component (20%)
   */
  HARDWARE: 0.2,

  /**
   * Accessories percentage of total material cost
   * Smallest component (10%)
   */
  ACCESSORIES: 0.1,
} as const;

/**
 * Labor cost breakdown percentages
 * These percentages allocate total labor cost across different operations
 */
export const LABOR_BREAKDOWN_PERCENTAGES = {
  /**
   * Cutting percentage of total labor cost
   * Initial operation (30%)
   */
  CUTTING: 0.3,

  /**
   * Assembly percentage of total labor cost
   * Main operation (40%)
   */
  ASSEMBLY: 0.4,

  /**
   * Installation percentage of total labor cost
   * Final operation (20%)
   */
  INSTALLATION: 0.2,

  /**
   * Other labor percentage of total labor cost
   * Miscellaneous operations (10%)
   */
  OTHER: 0.1,
} as const;

/**
 * Payment term multipliers
 * These multipliers adjust the final price based on payment terms
 */
export const PAYMENT_TERM_MULTIPLIERS = {
  /**
   * Cash payment multiplier (discount)
   * Cash payments typically receive a 5% discount (0.95)
   */
  CASH: 0.95,

  /**
   * 30-day credit multiplier (premium)
   * 30-day credit adds 10% premium (1.1)
   */
  CREDIT_30_DAYS: 1.1,

  /**
   * 90-day credit multiplier (premium)
   * 90-day credit adds 20% premium (1.2)
   */
  CREDIT_90_DAYS: 1.2,
} as const;

/**
 * Conversion and calculation constants
 */
export const QUOTE_CALCULATION_CONSTANTS = {
  /**
   * Profit margin percentage multiplier
   * Converts decimal margin (0.15) to percentage (15%)
   */
  PROFIT_MARGIN_MULTIPLIER: 100,

  /**
   * Area conversion factor (mm² to m²)
   * 1 m² = 1,000,000 mm²
   */
  MM2_TO_M2: 1000000,

  /**
   * Default quantity for single unit quotes
   */
  DEFAULT_QUANTITY: 1,

  /**
   * Default installation cost (when not specified)
   */
  DEFAULT_INSTALLATION_COST: 0,
} as const;

