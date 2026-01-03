/**
 * Assembly Time Constants
 * 
 * Defines standard assembly time estimates for cost calculation.
 * These values are based on industry standards and can be adjusted per workshop.
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 */

/**
 * Assembly time configuration for cost estimation
 */
export const ASSEMBLY_TIME_CONFIG = {
  /**
   * Base assembly time in minutes
   * This covers basic setup, frame assembly, and final inspection
   */
  BASE_TIME_MINUTES: 30,

  /**
   * Time per profile component in minutes
   * Includes cutting, preparation, and installation
   */
  TIME_PER_PROFILE_MINUTES: 2,

  /**
   * Time per hardware item in minutes
   * Includes positioning, drilling, and installation
   */
  TIME_PER_HARDWARE_MINUTES: 5,

  /**
   * Time per glazing pane in minutes
   * Includes glass preparation, bead installation, and sealing
   */
  TIME_PER_GLAZING_PANE_MINUTES: 10,
} as const;

