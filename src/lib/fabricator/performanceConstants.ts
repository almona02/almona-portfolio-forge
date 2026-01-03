/**
 * Performance Optimization Constants
 * 
 * Defines cache durations, size limits, and timing constants
 * for performance optimization utilities.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map - Day 5-6)
 */

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /**
   * Cache duration in milliseconds
   * 5 minutes: Balances freshness vs performance
   * - Too short (<2min): Excessive recalculations
   * - Too long (>10min): Stale data risk
   */
  DURATION_MS: 5 * 60 * 1000, // 5 minutes

  /**
   * Maximum cache size (number of entries)
   * Limits memory usage while maintaining performance
   */
  MAX_SIZE: 50,
} as const;

/**
 * Progressive loading timing
 */
export const PROGRESSIVE_LOADING = {
  /**
   * Delay before loading enhancements (milliseconds)
   * Small delay ensures UI responsiveness before background loading
   */
  ENHANCEMENT_DELAY_MS: 100,
} as const;

