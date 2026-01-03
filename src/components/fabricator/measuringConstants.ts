/**
 * Smart Measuring Interface Constants
 * 
 * Defines default dimensions, wall deductions, grid defaults,
 * zoom levels, glazing specs, and animation values.
 * 
 * @since Phase 2: Smart Measuring Interface
 */

/**
 * Default measurement values
 */
export const DEFAULT_MEASUREMENTS = {
  /**
   * Default width (mm)
   * Professional stub dimension for initial measurement
   */
  DEFAULT_WIDTH_MM: 1200,

  /**
   * Default height (mm)
   * Professional stub dimension for initial measurement
   */
  DEFAULT_HEIGHT_MM: 1200,

  /**
   * Default wall deduction (mm)
   * Standard deduction for wall tolerance in hole measurement mode
   */
  DEFAULT_WALL_DEDUCTION_MM: 15,

  /**
   * Default cut length deduction (mm)
   * Simplified calculation for MVP verification
   */
  DEFAULT_CUT_LENGTH_DEDUCTION_MM: 6,
} as const;

/**
 * Default grid configuration
 */
export const DEFAULT_GRID = {
  /**
   * Default number of rows
   */
  DEFAULT_ROWS: 1,

  /**
   * Default number of columns
   */
  DEFAULT_COLS: 1,

  /**
   * Default cell ID format
   */
  DEFAULT_CELL_ID: '0-0',
} as const;

/**
 * Blueprint zoom and view constants
 */
export const BLUEPRINT_VIEW = {
  /**
   * Default zoom level (1 = 100%)
   */
  DEFAULT_ZOOM: 1,

  /**
   * Zoom level for 120% (example)
   */
  ZOOM_120_PERCENT: 1.2,
} as const;

/**
 * Default glazing specifications
 */
export const DEFAULT_GLAZING_SPECS = {
  /**
   * Default glass thickness (mm)
   * Standard double glazing thickness
   */
  DEFAULT_THICKNESS_MM: 24,

  /**
   * Default spacer width (mm)
   * Standard spacer between glass panes
   */
  DEFAULT_SPACER_MM: 12,

  /**
   * Default gas fill
   */
  DEFAULT_GAS_FILL: 'argon' as const,
} as const;

/**
 * Animation constants
 */
export const ANIMATION_CONSTANTS = {
  /**
   * Slide animation offset (px)
   * Distance for slide transitions
   */
  SLIDE_OFFSET_PX: 50,

  /**
   * Default opacity (fully visible)
   */
  DEFAULT_OPACITY: 1,

  /**
   * Hidden opacity (transparent)
   */
  HIDDEN_OPACITY: 0,
} as const;

