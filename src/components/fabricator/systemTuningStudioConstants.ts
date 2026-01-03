/**
 * System Tuning Studio Constants
 * 
 * Defines async delays, dialog dimensions, grid layouts,
 * and UI element sizes for the system tuning interface.
 * 
 * @since Phase 2: System Tuning Studio Enhancement
 */

/**
 * Async operation delays
 */
export const ASYNC_DELAYS = {
  /**
   * Save operation delay (ms)
   * Provides lightweight async feel for save operations
   */
  SAVE_DELAY_MS: 300,
} as const;

/**
 * Dialog dimensions
 */
export const DIALOG_DIMENSIONS = {
  /**
   * Maximum dialog width (Tailwind class)
   * 6xl = 72rem = 1152px
   */
  MAX_WIDTH: 'max-w-6xl',
} as const;

/**
 * Grid layout constants
 */
export const GRID_LAYOUT = {
  /**
   * Tabs list grid columns
   * 5 tabs: Import, Tag Roles, Hardware, Machining, Review
   */
  TABS_COLS: 'grid-cols-5',
} as const;

/**
 * UI dimension constants
 */
export const UI_DIMENSIONS = {
  /**
   * Icon sizes
   */
  ICON_SMALL: 'h-3 w-3',
  ICON_MEDIUM: 'h-4 w-4',
} as const;

