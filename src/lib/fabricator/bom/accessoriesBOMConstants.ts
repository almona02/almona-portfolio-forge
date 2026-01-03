/**
 * Accessories BOM Calculation Constants
 * 
 * Defines pricing and calculation constants for accessories including:
 * - Glazing beads
 * - Seals and gaskets
 * - Screws and fasteners
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 11)
 */

/**
 * Accessory pricing in Egyptian Pounds (EGP)
 */
export const ACCESSORY_PRICES_EGP = {
  /**
   * Glazing bead price per meter (EGP/m)
   */
  GLAZING_BEAD_PER_METER: 8,

  /**
   * Primary seal (EPDM) price per meter (EGP/m)
   */
  PRIMARY_SEAL_PER_METER: 12,

  /**
   * Standard screw price per unit (EGP)
   */
  SCREW_STANDARD: 0.5,
} as const;

/**
 * Fastener calculation constants
 */
export const FASTENER_CONSTANTS = {
  /**
   * Screw spacing in millimeters
   * One screw every 300mm is standard for frame mounting
   */
  SCREW_SPACING_MM: 300,
} as const;

/**
 * Unit conversion constants
 */
export const UNIT_CONVERSION = {
  /**
   * Millimeters per meter
   */
  MM_PER_METER: 1000,
} as const;

