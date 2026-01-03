/**
 * Profile Tuning Studio Constants
 * 
 * Defines default geometry values, cache settings, timeouts,
 * validation patterns, and UI dimensions.
 * 
 * @since Phase 2: Profile Tuning Studio Enhancement
 */

/**
 * Default geometry configuration values
 */
export const DEFAULT_GEOMETRY_CONFIG = {
  /**
   * Default archetype
   * Standard hollow box profile archetype
   */
  DEFAULT_ARCHETYPE: 'hollow_box',

  /**
   * Default wall thickness (mm)
   * Standard aluminum profile wall thickness
   */
  DEFAULT_WALL_THICKNESS_MM: 1.5,

  /**
   * Default glazing pocket depth (mm)
   * Zero indicates no glazing pocket by default
   */
  DEFAULT_GLAZING_POCKET_DEPTH_MM: 0,

  /**
   * Default glazing pocket width (mm)
   * Zero indicates no glazing pocket by default
   */
  DEFAULT_GLAZING_POCKET_WIDTH_MM: 0,

  /**
   * Default thermal break width (mm)
   * Zero indicates no thermal break by default
   */
  DEFAULT_THERMAL_BREAK_WIDTH_MM: 0,

  /**
   * Default flange width (mm)
   * Zero indicates no flange by default
   */
  DEFAULT_FLANGE_WIDTH_MM: 0,

  /**
   * Default web offset (mm)
   * Zero indicates no web offset by default
   */
  DEFAULT_WEB_OFFSET_MM: 0,
} as const;

/**
 * Storage and cache constants
 */
export const STORAGE_CONSTANTS = {
  /**
   * Cache control duration (seconds)
   * 1 hour cache for uploaded files
   */
  CACHE_CONTROL_DURATION_SECONDS: 3600,
} as const;

/**
 * Timeout constants
 */
export const TIMEOUT_CONSTANTS = {
  /**
   * Import banner auto-hide timeout (ms)
   * Banner disappears after 10 seconds
   */
  IMPORT_BANNER_TIMEOUT_MS: 10000,
} as const;

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  /**
   * UUID v4 validation regex pattern
   * Matches standard UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   */
  UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
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
  ICON_LARGE: 'h-5 w-5',

  /**
   * Badge icon sizes
   */
  BADGE_ICON: 'h-3 w-3',

  /**
   * Studio container dimensions
   */
  STUDIO_MAX_WIDTH: 'max-w-6xl',
  STUDIO_MAX_HEIGHT: 'max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]',
} as const;

