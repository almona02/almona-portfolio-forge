/**
 * Cutting List Generator Constants
 * 
 * Defines default values and cutting rule offsets for cutting list generation.
 * These values are system-specific and can be overridden by system pack specifications.
 * 
 * @since Phase 2: University-Grade Precision
 * @version 2.0.0
 */

/**
 * Default glazing specifications
 */
export const DEFAULT_GLAZING_SPECS = {
  /**
   * Default total thickness for double glazing (mm)
   * Standard IGU (Insulated Glass Unit) thickness
   */
  DEFAULT_TOTAL_THICKNESS_MM: 24,

  /**
   * Default weight per square meter (kg/m²)
   * Typical for double glazing
   */
  DEFAULT_WEIGHT_PER_SQM_KG: 20,
} as const;

/**
 * Default grid configurations
 */
export const DEFAULT_GRID_CONFIG = {
  /**
   * Default rows for transom grid
   */
  DEFAULT_TRANSOM_ROWS: 2,

  /**
   * Default columns for transom grid
   */
  DEFAULT_TRANSOM_COLS: 1,

  /**
   * Default rows for sliding window grid
   */
  DEFAULT_SLIDING_ROWS: 1,

  /**
   * Default columns for sliding window grid (2 sashes)
   */
  DEFAULT_SLIDING_COLS: 2,

  /**
   * Equal width ratio for sashes (1:1)
   */
  EQUAL_WIDTH_RATIO: 1,
} as const;

/**
 * Default cutting rule offsets (mm)
 * These are fallback values when system pack doesn't specify cutting rules
 */
export const DEFAULT_CUTTING_RULE_OFFSETS = {
  /**
   * Default frame length allowance (mm)
   * Added to window dimension for frame pieces
   */
  DEFAULT_FRAME_ALLOWANCE_MM: 50,

  /**
   * Default sash length deduction (mm)
   * Subtracted from window dimension for sash pieces
   */
  DEFAULT_SASH_DEDUCTION_MM: 40,

  /**
   * Default bead length deduction (mm)
   * Subtracted from window dimension for bead pieces
   */
  DEFAULT_BEAD_DEDUCTION_MM: 167,
} as const;

/**
 * System-specific cutting rule offsets
 */
export const SYSTEM_CUTTING_RULES = {
  /**
   * ROCK 60 system cutting rules
   */
  ROCK60: {
    FRAME_ALLOWANCE_MM: 60,
    SASH_DEDUCTION_MM: 44,
    BEAD_DEDUCTION_MM: 167,
  },

  /**
   * Panda system cutting rules (50 and 100)
   */
  PANDA: {
    FRAME_ALLOWANCE_MM: 50,
    SASH_DEDUCTION_MM: 40,
    BEAD_DEDUCTION_MM: 167,
  },
} as const;

/**
 * Component quantities
 */
export const COMPONENT_QUANTITIES = {
  /**
   * Number of frame pieces (4: top, bottom, left, right)
   */
  FRAME_PIECES: 4,

  /**
   * Number of sash pieces (4: top, bottom, left, right)
   */
  SASH_PIECES: 4,

  /**
   * Number of bead pieces (4: 2 horizontal, 2 vertical)
   */
  BEAD_PIECES: 4,
} as const;

