/**
 * BOM Generator Constants
 * 
 * Defines accuracy targets, confidence thresholds, and scoring weights
 * for BOM generation and validation.
 * 
 * @since Phase 2: Preset-Aware BOM System (Weeks 11-14)
 */

/**
 * Accuracy and confidence targets
 */
export const BOM_ACCURACY_TARGETS = {
  /**
   * Target accuracy for BOM generation (99.8%)
   * This matches the existing cutting list accuracy
   */
  TARGET_ACCURACY: 0.998,

  /**
   * Minimum confidence threshold (95%+)
   * BOMs below this threshold should be flagged for review
   */
  MIN_CONFIDENCE: 0.95,
} as const;

/**
 * Confidence scoring weights (percentages)
 */
export const CONFIDENCE_WEIGHTS = {
  /**
   * Profile completeness weight (40% of total score)
   */
  PROFILE_COMPLETENESS: 40,

  /**
   * Hardware completeness weight (30% of total score)
   */
  HARDWARE_COMPLETENESS: 30,

  /**
   * Glazing completeness weight (30% of total score)
   */
  GLAZING_COMPLETENESS: 30,

  /**
   * Frame profile score (20 points within profile completeness)
   */
  FRAME_PROFILE_SCORE: 20,

  /**
   * Sash profile score (20 points within profile completeness)
   */
  SASH_PROFILE_SCORE: 20,
} as const;

/**
 * Checksum generation constants
 */
export const CHECKSUM_CONSTANTS = {
  /**
   * Maximum length for fallback checksum (base64 substring)
   * Used when crypto.subtle is not available
   */
  FALLBACK_CHECKSUM_LENGTH: 32,
} as const;

