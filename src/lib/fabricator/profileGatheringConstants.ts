/**
 * Profile Gathering Constants
 * 
 * Defines precision and default values for profile gathering operations.
 * 
 * Mathematical Precision:
 * - All calculations use millimeter precision (0.01mm tolerance)
 * - Role-specific cutting formulas applied with exact mathematical operations
 * - Comprehensive validation ensures no profile is missed
 * 
 * @since University-Grade Precision Implementation
 * @version 1.0.0
 */

/**
 * Default precision for length calculations (mm)
 * All calculations use 0.01mm precision for mathematical accuracy
 */
export const DEFAULT_PRECISION_MM = 0.01;

/**
 * Default profile gathering configuration
 */
export const DEFAULT_GATHERING_CONFIG = {
  /**
   * Whether to include glazing bead profiles (default: true if unit has glazing)
   */
  includeGlazingBeads: true,

  /**
   * Whether to include structural profiles (mullions, transoms) (default: true)
   */
  includeStructural: true,

  /**
   * Whether to include accessory profiles (default: true)
   */
  includeAccessories: true,

  /**
   * Default system type for role-specific formulas
   */
  defaultSystemType: 'sliding' as const,

  /**
   * Default precision for length calculations
   */
  precision: DEFAULT_PRECISION_MM,
} as const;

/**
 * Default dimension constants
 */
export const DEFAULT_DIMENSIONS = {
  /**
   * Default frame width (mm)
   * Used when frame profile width is not available
   */
  DEFAULT_FRAME_WIDTH_MM: 50,

  /**
   * Default sash count for sliding systems
   * Used when grid doesn't specify sash count
   */
  DEFAULT_SLIDING_SASH_COUNT: 2,
} as const;

/**
 * Quantity constants
 */
export const QUANTITY_CONSTANTS = {
  /**
   * Reinforcement quantity (horizontal)
   * Top and bottom reinforcement bars
   */
  REINFORCEMENT_HORIZONTAL_QUANTITY: 2,

  /**
   * Reinforcement quantity (vertical)
   * Left and right reinforcement bars
   */
  REINFORCEMENT_VERTICAL_QUANTITY: 2,
} as const;

