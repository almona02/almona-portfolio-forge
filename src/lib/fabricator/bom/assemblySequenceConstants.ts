/**
 * Assembly Sequence Constants
 * 
 * Defines time estimates and thresholds for assembly sequence generation.
 * These values are based on industry standards and can be adjusted per workshop.
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 */

/**
 * Time estimates per component/item (minutes)
 */
export const ASSEMBLY_TIME_ESTIMATES = {
  /**
   * Time per profile component (minutes)
   * Includes cutting, preparation, and basic setup
   */
  PER_PROFILE_MINUTES: 2,

  /**
   * Time for frame assembly (minutes)
   * Includes corner key installation and squareness check
   */
  FRAME_ASSEMBLY_MINUTES: 15,

  /**
   * Time for mullion and transom installation (minutes)
   * Includes positioning, drilling, and alignment
   */
  MULLION_TRANSOM_INSTALLATION_MINUTES: 10,

  /**
   * Time for sash assembly (minutes)
   * Includes corner key installation and fit check
   */
  SASH_ASSEMBLY_MINUTES: 20,

  /**
   * Time per hardware item (minutes)
   * Includes positioning, drilling, and installation
   */
  PER_HARDWARE_ITEM_MINUTES: 5,

  /**
   * Time per glazing pane (minutes)
   * Includes glass preparation, bead installation, and sealing
   */
  PER_GLAZING_PANE_MINUTES: 10,

  /**
   * Time for final quality control and inspection (minutes)
   * Includes comprehensive checks and documentation
   */
  QUALITY_CONTROL_MINUTES: 15,
} as const;

