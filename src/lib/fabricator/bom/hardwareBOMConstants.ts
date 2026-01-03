/**
 * Hardware BOM Calculation Constants
 * 
 * Defines standard values for hardware BOM calculations including:
 * - Torque specifications
 * - Installation time estimates
 * - Hardware positioning standards
 * - Quantity calculation thresholds
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 12)
 */

/**
 * Torque specifications (Newton-meters)
 */
export const HARDWARE_TORQUE = {
  /**
   * Standard torque for casement hinges (Nm)
   * Typical range: 6-10 Nm
   */
  HINGE_CASEMENT_NM: 8,

  /**
   * Standard torque for window handles (Nm)
   * Typical range: 4-8 Nm
   */
  HANDLE_STANDARD_NM: 6,
} as const;

/**
 * Installation time estimates (minutes per item)
 */
export const INSTALLATION_TIME = {
  /**
   * Time to install one hinge (minutes)
   */
  PER_HINGE_MINUTES: 5,

  /**
   * Time to install one roller (minutes)
   */
  PER_ROLLER_MINUTES: 3,

  /**
   * Time to install one handle (minutes)
   */
  PER_HANDLE_MINUTES: 4,

  /**
   * Time to install one lock (minutes)
   */
  PER_LOCK_MINUTES: 5,

  /**
   * Time to install one corner key (minutes)
   */
  PER_CORNER_KEY_MINUTES: 2,

  /**
   * Default installation time for unknown hardware (minutes)
   */
  DEFAULT_MINUTES: 5,
} as const;

/**
 * Hardware positioning standards
 */
export const HARDWARE_POSITIONING = {
  /**
   * Standard handle height from bottom in millimeters (Egyptian standard)
   * This is the ergonomic height for comfortable operation
   */
  HANDLE_HEIGHT_FROM_BOTTOM_MM: 1100,
} as const;

/**
 * Hardware quantity constants
 */
export const HARDWARE_QUANTITY = {
  /**
   * Number of corner keys per frame (fixed: 4 corners)
   */
  CORNER_KEYS_PER_FRAME: 4,
} as const;

/**
 * Hinge quantity calculation thresholds (millimeters)
 */
export const HINGE_QUANTITY_THRESHOLDS = {
  /**
   * Height threshold for 2 hinges (mm)
   */
  TWO_HINGES_MAX_HEIGHT_MM: 1200,

  /**
   * Height threshold for 3 hinges (mm)
   */
  THREE_HINGES_MAX_HEIGHT_MM: 1800,

  /**
   * Height threshold for 4 hinges (mm)
   */
  FOUR_HINGES_MAX_HEIGHT_MM: 2400,
} as const;

/**
 * Roller quantity calculation thresholds
 */
export const ROLLER_QUANTITY_THRESHOLDS = {
  /**
   * Area threshold for standard 2-roller configuration (m²)
   * Windows larger than this require 4 rollers (heavy-duty)
   */
  STANDARD_TWO_ROLLER_MAX_AREA_M2: 2.5,
} as const;

/**
 * Hardware quantity defaults
 */
export const HARDWARE_QUANTITY_DEFAULTS = {
  /**
   * Default sash count when not specified
   * Used as fallback when grid doesn't specify sash count
   */
  DEFAULT_SASH_COUNT: 1,

  /**
   * Standard hinge quantities
   */
  STANDARD_HINGE_COUNT: 2,
  THREE_HINGE_COUNT: 3,
  FOUR_HINGE_COUNT: 4,
  FIVE_HINGE_COUNT: 5, // Very tall sashes

  /**
   * Standard roller quantities
   */
  STANDARD_ROLLER_COUNT: 2, // Standard: 2 rollers
  HEAVY_DUTY_ROLLER_COUNT: 4, // Heavy-duty: 4 rollers for large windows
} as const;

/**
 * Unit conversion constants
 */
export const UNIT_CONVERSION = {
  /**
   * Millimeters squared to square meters conversion
   * 1 m² = 1,000,000 mm²
   */
  MM2_TO_M2: 1_000_000,
} as const;

