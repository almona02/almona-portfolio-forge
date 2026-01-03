/**
 * Precision Design Interface Constants
 * 
 * Defines default dimensions, zoom levels, grid defaults,
 * calculation multipliers, and interaction tolerances.
 * 
 * @since Phase 2: Precision Design Interface
 */

/**
 * Default view and zoom constants
 */
export const VIEW_CONSTANTS = {
  /**
   * Default zoom level (1 = 100%)
   */
  DEFAULT_ZOOM: 1,

  /**
   * Default pan position (x, y)
   */
  DEFAULT_PAN_X: 0,
  DEFAULT_PAN_Y: 0,
} as const;

/**
 * Default grid configuration
 */
export const GRID_DEFAULTS = {
  /**
   * Default number of rows
   */
  DEFAULT_ROWS: 1,

  /**
   * Default number of columns
   */
  DEFAULT_COLS: 1,
} as const;

/**
 * Profile and stock constants
 */
export const PROFILE_CONSTANTS = {
  /**
   * Default stock length (mm)
   * Common Turkish profile stock length (6.5 meters)
   */
  DEFAULT_STOCK_LENGTH_MM: 6500,
} as const;

/**
 * Calculation multipliers
 */
export const CALCULATION_MULTIPLIERS = {
  /**
   * Millimeters to meters conversion
   * 1 meter = 1000 millimeters
   */
  MM_TO_M: 1000,

  /**
   * Rounding multiplier for efficiency/waste (1 decimal place)
   * Formula: Math.round(value * 10) / 10
   */
  ROUNDING_MULTIPLIER_1_DECIMAL: 10,

  /**
   * Rounding multiplier for price (2 decimal places)
   * Formula: Math.round(value * 100) / 100
   */
  ROUNDING_MULTIPLIER_2_DECIMAL: 100,
} as const;

/**
 * SVG rendering constants
 */
export const SVG_CONSTANTS = {
  /**
   * Base SVG width (px)
   * Fixed width for consistent rendering
   */
  BASE_SVG_WIDTH_PX: 1200,

  /**
   * Base SVG height (px)
   * Calculated from aspect ratio, but base is 1200
   */
  BASE_SVG_HEIGHT_PX: 1200,
} as const;

/**
 * Cell dimension constraints
 */
export const CELL_CONSTRAINTS = {
  /**
   * Minimum cell width (mm)
   * Prevents cells from being too small
   */
  MIN_CELL_WIDTH_MM: 200,

  /**
   * Default maximum sash width (mm)
   * Used when system pack doesn't specify maxPanelWidthMm
   */
  DEFAULT_MAX_SASH_WIDTH_MM: 1500,
} as const;

/**
 * Interaction tolerances (px)
 */
export const INTERACTION_TOLERANCES = {
  /**
   * Mullion click tolerance (px)
   * Distance from mullion center to detect click
   */
  MULLION_CLICK_TOLERANCE_PX: 10,

  /**
   * Split edge tolerance (px)
   * Distance from cell edge to detect split action
   */
  SPLIT_EDGE_TOLERANCE_PX: 20,
} as const;

