/**
 * Preset Pattern Matching Constants
 * 
 * Defines confidence thresholds and matching criteria
 * for pattern-to-grid matching and validation.
 * 
 * @since Phase 2: Preset-Aware BOM System
 */

/**
 * Pattern matching confidence thresholds
 */
export const PATTERN_MATCHING_THRESHOLDS = {
  /**
   * Minimum confidence for pattern match (85%)
   * Patterns below this are not considered matches
   */
  MIN_MATCH_CONFIDENCE: 85,

  /**
   * Minimum confidence for best match selection (70%)
   * Used when finding best matching pattern for a grid
   */
  MIN_BEST_MATCH_CONFIDENCE: 70,

  /**
   * Percentage multiplier for confidence calculation
   */
  PERCENTAGE_MULTIPLIER: 100,
} as const;

