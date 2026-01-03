/**
 * Profile BOM Calculation Constants
 * 
 * Defines standard values for profile BOM calculations including:
 * - Kerf compensation values
 * - Standard stock lengths
 * - Default profile dimensions
 * - Miter angles
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 11)
 */

/**
 * Kerf and cutting constants
 */
export const CUTTING_CONSTANTS = {
  /**
   * Standard saw blade kerf in millimeters
   * Typical values: 1.5-3mm depending on blade type
   */
  STANDARD_KERF_MM: 2,

  /**
   * Standard stock length in millimeters
   * Common values: 5800mm or 6000mm (6 meters)
   */
  STANDARD_STOCK_LENGTH_MM: 6000,
} as const;

/**
 * Default profile dimensions
 */
export const DEFAULT_PROFILE_DIMENSIONS = {
  /**
   * Default profile width in millimeters
   * Common system pack widths: 60mm, 70mm, 80mm
   */
  DEFAULT_WIDTH_MM: 60,

  /**
   * Default cost per meter in currency units
   * This is a fallback when profile cost is not specified
   */
  DEFAULT_COST_PER_METER: 25,
} as const;

/**
 * Miter angle constants
 */
export const MITER_ANGLES = {
  /**
   * Standard miter angle for corner joints (45 degrees)
   */
  CORNER_MITER: 45,

  /**
   * Straight cut angle (90 degrees)
   */
  STRAIGHT_CUT: 90,
} as const;

/**
 * Profile code prefixes
 */
export const PROFILE_CODE_PREFIXES = {
  FRAME: 'FRAME-60',
  SASH: 'SASH-60',
  MULLION: 'MULLION-60',
  TRANSOM: 'TRANSOM-60',
} as const;

/**
 * Geometric calculation constants
 */
export const GEOMETRIC_CONSTANTS = {
  /**
   * Perimeter multiplier (2 sides: width + height)
   * Formula: perimeter = (width + height) * 2
   */
  PERIMETER_MULTIPLIER: 2,

  /**
   * Frame width deduction multiplier
   * Formula: opening = dimension - (frameWidth * 2)
   */
  FRAME_WIDTH_DEDUCTION_MULTIPLIER: 2,

  /**
   * Number of corners per sash
   * Each sash has 4 corners (top-left, top-right, bottom-left, bottom-right)
   */
  CORNERS_PER_SASH: 4,
} as const;

