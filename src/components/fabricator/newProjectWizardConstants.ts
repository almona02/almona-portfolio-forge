/**
 * New Project Wizard Constants
 * 
 * Defines dialog dimensions, scroll limits, grid layouts,
 * and UI element sizes for the project creation wizard.
 * 
 * @since Phase 2: New Project Wizard Enhancement
 */

/**
 * Dialog dimensions
 */
export const DIALOG_DIMENSIONS = {
  /**
   * Maximum dialog width (Tailwind class)
   * 4xl = 56rem = 896px
   */
  MAX_WIDTH: 'max-w-4xl',

  /**
   * Maximum dialog height (viewport height)
   * 90vh = 90% of viewport height
   */
  MAX_HEIGHT: 'max-h-[90vh]',
} as const;

/**
 * Scroll container limits
 */
export const SCROLL_LIMITS = {
  /**
   * Maximum height for system pack selection scroll area (px)
   * Prevents excessive vertical scrolling
   */
  MAX_SYSTEM_PACK_SCROLL_HEIGHT_PX: 260,
} as const;

/**
 * Grid layout constants
 */
export const GRID_LAYOUT = {
  /**
   * Form fields grid columns
   * 2 columns for side-by-side inputs
   */
  FORM_COLS: 'grid-cols-2',
} as const;

/**
 * UI dimension constants
 */
export const UI_DIMENSIONS = {
  /**
   * Icon sizes
   */
  ICON_SMALL: 'h-3.5 w-3.5',
  ICON_MEDIUM: 'h-4 w-4',
  ICON_LARGE: 'h-5 w-5',

  /**
   * Checkbox/radio button sizes
   */
  CHECKBOX_SIZE: 'w-5 h-5',

  /**
   * Checkmark icon size within checkbox
   */
  CHECKMARK_SIZE: 'h-3.5 w-3.5',
} as const;

