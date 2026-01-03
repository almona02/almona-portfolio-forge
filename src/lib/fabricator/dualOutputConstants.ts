/**
 * Dual Output Generator Constants
 * 
 * Defines accuracy targets, tolerance thresholds, default values,
 * and time estimates for dual output generation.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map)
 */

/**
 * Accuracy targets
 */
export const DUAL_OUTPUT_ACCURACY = {
  /**
   * Target accuracy for fabrication data (99.8%)
   * Matches existing cutting list accuracy
   */
  FABRICATION_ACCURACY: 0.998,

  /**
   * Visual geometry accuracy (85-90% - Beta)
   * Lower accuracy acceptable for visualization
   */
  VISUAL_ACCURACY_MIN: 0.85,
  VISUAL_ACCURACY_MAX: 0.90,
} as const;

/**
 * Cross-validation tolerance thresholds
 */
export const CROSS_VALIDATION_TOLERANCES = {
  /**
   * Minimum difference to flag (1mm)
   * Differences below this are considered within tolerance
   */
  MIN_DIFFERENCE_MM: 1,

  /**
   * Warning threshold (5mm)
   * Differences between 1-5mm are warnings
   */
  WARNING_THRESHOLD_MM: 5,

  /**
   * Error threshold (10mm)
   * Differences above 10mm are errors requiring review
   */
  ERROR_THRESHOLD_MM: 10,
} as const;

/**
 * Default profile specifications
 */
export const DEFAULT_PROFILE_SPECS = {
  /**
   * Default frame profile width (mm)
   */
  DEFAULT_FRAME_WIDTH_MM: 60,

  /**
   * Default frame profile depth (mm)
   */
  DEFAULT_FRAME_DEPTH_MM: 50,

  /**
   * Default weight per meter (kg/m)
   * Typical for aluminum profiles
   */
  DEFAULT_WEIGHT_PER_METER_KG: 1.2,

  /**
   * Default cost per meter (currency)
   * Base cost for aluminum profiles
   */
  DEFAULT_COST_PER_METER: 25,

  /**
   * Default kerf (mm)
   * Standard saw blade kerf
   */
  DEFAULT_KERF_MM: 2,

  /**
   * Default bar trim allowance (mm)
   * Trim allowance for cutting operations
   */
  DEFAULT_BAR_TRIM_MM: 0.5,

  /**
   * Default miter allowance (mm)
   * Allowance for miter joint assembly
   */
  DEFAULT_MITER_ALLOWANCE_MM: 0.3,
} as const;

/**
 * Standard stock and cutting constants
 */
export const STOCK_CONSTANTS = {
  /**
   * Standard stock length (mm)
   * Common 6-meter stock length
   */
  STANDARD_STOCK_LENGTH_MM: 6000,
} as const;

/**
 * Default cutting angles
 */
export const CUTTING_ANGLES = {
  /**
   * Straight cut angle (degrees)
   */
  STRAIGHT_CUT_DEG: 90,

  /**
   * Miter cut angle (degrees)
   * Standard 45-degree miter for corners
   */
  MITER_CUT_DEG: 45,
} as const;

/**
 * Production time estimates (minutes)
 */
export const PRODUCTION_TIME_ESTIMATES = {
  /**
   * Time per profile cut (minutes)
   */
  MINUTES_PER_PROFILE_CUT: 2,

  /**
   * Time per machining operation (minutes)
   */
  MINUTES_PER_MACHINING_OP: 3,

  /**
   * Frame assembly time (minutes)
   */
  FRAME_ASSEMBLY_MINUTES: 15,

  /**
   * Mullion/transom installation time (minutes)
   */
  MULLION_TRANSOM_INSTALL_MINUTES: 10,

  /**
   * Sash assembly time (minutes)
   */
  SASH_ASSEMBLY_MINUTES: 20,

  /**
   * Time per hardware item (minutes)
   */
  MINUTES_PER_HARDWARE_ITEM: 5,

  /**
   * Time per glass pane (minutes)
   */
  MINUTES_PER_GLASS_PANE: 10,

  /**
   * Quality control time (minutes)
   */
  QC_INSPECTION_MINUTES: 15,
} as const;

/**
 * Glazing calculation constants
 */
export const GLAZING_CONSTANTS = {
  /**
   * Default edge clearance (mm)
   * Standard clearance between glass and frame
   */
  DEFAULT_EDGE_CLEARANCE_MM: 5,

  /**
   * Default glass thickness for single glazing (mm)
   * Used when glazing type is 'single'
   */
  DEFAULT_SINGLE_GLAZING_THICKNESS_MM: 5,

  /**
   * Default glass thickness per pane for multi-glazing (mm)
   * Used for double/triple glazing systems
   */
  DEFAULT_MULTI_GLAZING_THICKNESS_MM: 4,
} as const;

/**
 * Display formatting constants
 */
export const DISPLAY_FORMAT = {
  /**
   * Decimal places for difference display (mm)
   */
  DIFFERENCE_DECIMAL_PLACES: 2,
} as const;

