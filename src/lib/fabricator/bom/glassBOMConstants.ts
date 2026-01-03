/**
 * Glass BOM Calculation Constants
 * 
 * Defines standard values for glass BOM calculations including:
 * - Edge clearance values
 * - Default glass thickness
 * - Glass density for weight calculations
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 11)
 */

/**
 * Glass edge clearance constants
 */
export const GLASS_EDGE_CLEARANCE = {
  /**
   * Standard edge clearance in millimeters
   * This is the gap between glass edge and frame/sash profile
   * Typical values: 3-8mm depending on system pack
   */
  STANDARD_MM: 5,
} as const;

/**
 * Default glass thickness constants
 */
export const GLASS_THICKNESS = {
  /**
   * Default thickness for single glazing in millimeters
   * Typical single pane: 4-6mm
   */
  SINGLE_GLAZING_MM: 5,

  /**
   * Default thickness per pane for double/triple glazing in millimeters
   * Typical IGU panes: 4mm each
   */
  MULTI_GLAZING_PANE_MM: 4,
} as const;

/**
 * Glass material properties
 */
export const GLASS_PROPERTIES = {
  /**
   * Glass density in kg/m² per millimeter of thickness
   * Standard float glass: ~2.5 kg/m² per mm
   */
  DENSITY_KG_PER_M2_PER_MM: 2.5,
} as const;

