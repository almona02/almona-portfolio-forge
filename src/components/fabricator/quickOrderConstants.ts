/**
 * Quick Order Mode Constants
 * 
 * Defines default dimensions, glazing specs, quantity,
 * and UI limits for quick order creation.
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

/**
 * Default order parameters
 */
export const DEFAULT_ORDER_PARAMS = {
  /**
   * Default width (mm)
   * Standard window width for quick orders
   */
  DEFAULT_WIDTH_MM: 1800,

  /**
   * Default height (mm)
   * Standard window height for quick orders
   */
  DEFAULT_HEIGHT_MM: 1500,

  /**
   * Default quantity
   * Single unit order
   */
  DEFAULT_QUANTITY: 1,
} as const;

/**
 * Default glazing specifications
 */
export const DEFAULT_GLAZING = {
  /**
   * Default glazing type
   */
  DEFAULT_TYPE: 'double' as const,

  /**
   * Default glazing thickness (mm)
   * Standard double glazing thickness
   */
  DEFAULT_THICKNESS_MM: 24,
} as const;

/**
 * UI display limits
 */
export const UI_LIMITS = {
  /**
   * Maximum templates to display in recent templates list
   */
  MAX_RECENT_TEMPLATES: 5,
} as const;

