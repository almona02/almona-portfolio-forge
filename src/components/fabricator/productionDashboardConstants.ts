/**
 * Production Dashboard Constants
 * 
 * Defines monitoring intervals, alert limits, UI dimensions,
 * time conversions, and display formatting constants.
 * 
 * @since Phase 2: Production Dashboard Enhancement
 */

/**
 * Monitoring and update intervals
 */
export const MONITORING_CONSTANTS = {
  /**
   * Production monitoring update interval (ms)
   * Updates metrics every 5 seconds
   */
  MONITORING_INTERVAL_MS: 5000,

  /**
   * Maximum number of alerts to keep in memory
   * Prevents unbounded memory growth
   */
  MAX_ALERTS_LIMIT: 50,
} as const;

/**
 * Time conversion constants
 */
export const TIME_CONVERSION = {
  /**
   * Milliseconds to minutes conversion
   * 1 minute = 60,000 milliseconds
   */
  MS_TO_MINUTES: 60000,
} as const;

/**
 * Decimal places for display formatting
 */
export const DECIMAL_PLACES = {
  /**
   * Decimal places for success rate display
   * e.g., 95.5%
   */
  SUCCESS_RATE: 1,

  /**
   * Decimal places for accuracy display
   * e.g., 98.75%
   */
  ACCURACY: 2,

  /**
   * Decimal places for memory usage display
   * e.g., 45.2%
   */
  MEMORY_USAGE: 1,

  /**
   * Decimal places for workflow duration display
   * e.g., 12.5 min
   */
  WORKFLOW_DURATION: 1,

  /**
   * Decimal places for performance metrics
   * e.g., 98.50%
   */
  PERFORMANCE_METRICS: 2,
} as const;

/**
 * UI dimension constants (Tailwind classes)
 */
export const UI_DIMENSIONS = {
  /**
   * Loading container height
   */
  LOADING_CONTAINER_HEIGHT: 'h-64',

  /**
   * Icon sizes
   */
  ICON_SMALL: 'h-3 w-3',
  ICON_MEDIUM: 'h-4 w-4',
  ICON_LARGE: 'h-5 w-5',
  ICON_LOADING: 'h-8 w-8',

  /**
   * Progress bar height
   */
  PROGRESS_BAR_HEIGHT: 'h-2',
} as const;

/**
 * Grid layout constants
 */
export const GRID_LAYOUT = {
  /**
   * KPI cards grid columns
   * Responsive: 1 col (mobile), 2 cols (tablet), 4 cols (desktop)
   */
  KPI_CARDS_COLS: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',

  /**
   * Workshop impact grid columns
   * Responsive: 1 col (mobile), 4 cols (tablet+)
   */
  WORKSHOP_IMPACT_COLS: 'grid-cols-1 md:grid-cols-4',

  /**
   * Performance trends grid columns
   * Responsive: 1 col (mobile), 2 cols (tablet+)
   */
  TRENDS_COLS: 'grid-cols-1 md:grid-cols-2',
} as const;

