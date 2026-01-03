/**
 * Constraint Validation Constants
 * 
 * Defines thresholds and limits for window design validation.
 * These values are based on industry standards and structural requirements.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map - Day 5-6)
 */

/**
 * Validation threshold configuration
 */
export const VALIDATION_THRESHOLDS = {
  /**
   * Minimum validation score required (0-1 scale)
   * 80% compliance required for validation to pass
   */
  WARNING_THRESHOLD: 0.8,

  /**
   * Error penalty per error (reduces validation score)
   * Each error reduces score by 30%
   */
  ERROR_PENALTY: 0.3,

  /**
   * Warning penalty per warning (reduces validation score)
   * Each warning reduces score by 10%
   */
  WARNING_PENALTY: 0.1,
} as const;

/**
 * Dimension validation constants
 */
export const DIMENSION_CONSTRAINTS = {
  /**
   * Aspect ratio tolerance
   * Allows ±30% deviation from ideal aspect ratio
   */
  ASPECT_RATIO_TOLERANCE: 0.3,
} as const;

/**
 * Grid validation constants
 */
export const GRID_CONSTRAINTS = {
  /**
   * Minimum cell size in millimeters
   * Cells smaller than this may be too small for proper operation
   */
  MIN_CELL_SIZE_MM: 300,

  /**
   * Minimum sash width in millimeters
   * Sashes narrower than this may limit hardware options
   */
  MIN_SASH_WIDTH_MM: 400,
} as const;

/**
 * Sash validation constants
 */
export const SASH_CONSTRAINTS = {
  /**
   * Maximum sash weight in kilograms for standard hardware
   * Sashes heavier than this require heavy-duty hardware
   */
  MAX_SASH_WEIGHT_KG: 40,

  /**
   * Default glass thickness for single glazing (millimeters)
   */
  DEFAULT_SINGLE_GLAZING_THICKNESS_MM: 5,

  /**
   * Default glass thickness for double/triple glazing (millimeters)
   */
  DEFAULT_MULTI_GLAZING_THICKNESS_MM: 4,

  /**
   * Estimated frame weight in kilograms (added to glass weight)
   */
  ESTIMATED_FRAME_WEIGHT_KG: 2,

  /**
   * Sliding sash width threshold (mm)
   * Sashes wider than this may require dual rollers
   */
  SLIDING_SASH_DUAL_ROLLER_THRESHOLD_MM: 1200,
} as const;

/**
 * Opening mechanism validation constants
 */
export const MECHANISM_CONSTRAINTS = {
  /**
   * Wide sliding window threshold (mm)
   * Windows wider than this may require reinforced track
   */
  WIDE_SLIDING_WINDOW_THRESHOLD_MM: 3000,

  /**
   * Tall sash height threshold (mm)
   * Sashes taller than this require additional hinges
   */
  TALL_SASH_HEIGHT_THRESHOLD_MM: 1500,

  /**
   * Recommended hinge spacing (mm)
   * Standard spacing between hinges for tall sashes
   */
  RECOMMENDED_HINGE_SPACING_MM: 700,

  /**
   * Default hinge count
   * Standard number of hinges for casement windows
   */
  DEFAULT_HINGE_COUNT: 2,

  /**
   * Wide casement sash threshold (mm)
   * Sashes wider than this may require stay bars
   */
  WIDE_CASEMENT_SASH_THRESHOLD_MM: 900,

  /**
   * Tall tilt-turn window threshold (mm)
   * Windows taller than this require mechanism verification
   */
  TALL_TILT_TURN_THRESHOLD_MM: 1800,
} as const;

/**
 * Structural validation constants
 */
export const STRUCTURAL_CONSTRAINTS = {
  /**
   * Wind load consideration threshold (m²)
   * Glass areas larger than this require wind load verification
   */
  WIND_LOAD_THRESHOLD_M2: 4,

  /**
   * Structural mullion area threshold (m²)
   * Windows larger than this may require structural mullions
   */
  STRUCTURAL_MULLION_AREA_THRESHOLD_M2: 6,

  /**
   * Structural mullion width threshold (mm)
   * Windows wider than this may require structural mullions
   */
  STRUCTURAL_MULLION_WIDTH_THRESHOLD_MM: 3000,

  /**
   * Structural mullion height threshold (mm)
   * Windows taller than this may require structural mullions
   */
  STRUCTURAL_MULLION_HEIGHT_THRESHOLD_MM: 2500,
} as const;

/**
 * Validation calculation constants
 */
export const VALIDATION_CALCULATION = {
  /**
   * Total number of validation categories
   * Used for score calculation
   */
  TOTAL_VALIDATION_CATEGORIES: 6,

  /**
   * Base validation score (perfect score)
   * Score starts at 1.0 and is reduced by penalties
   */
  BASE_SCORE: 1.0,

  /**
   * Minimum validation score
   * Score cannot go below 0
   */
  MIN_SCORE: 0,

  /**
   * Decimal places for aspect ratio display
   */
  ASPECT_RATIO_DECIMAL_PLACES: 2,

  /**
   * Decimal places for cell dimension display
   */
  CELL_DIMENSION_DECIMAL_PLACES: 0,

  /**
   * Decimal places for sash dimension display
   */
  SASH_DIMENSION_DECIMAL_PLACES: 0,

  /**
   * Decimal places for glass area display
   */
  GLASS_AREA_DECIMAL_PLACES: 1,
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

