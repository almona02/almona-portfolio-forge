/**
 * Production Utilities Constants
 * 
 * Defines standard values for production calculations including:
 * - Default profile dimensions
 * - Machining zone specifications
 * - Hardware quantity calculations
 * - Unit conversion factors
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map)
 */

/**
 * Default profile dimensions
 */
export const DEFAULT_PROFILE_DIMENSIONS = {
  /**
   * Default frame profile width in millimeters
   * Common system pack widths: 60mm, 70mm, 80mm
   */
  DEFAULT_FRAME_WIDTH_MM: 60,

  /**
   * Default machining zone dimensions in millimeters
   * Standard miter cut dimensions
   */
  DEFAULT_MACHINING_ZONE_DIMENSION_MM: 60,
} as const;

/**
 * Default hardware hole specifications
 */
export const DEFAULT_HOLE_SPECS = {
  /**
   * Default hole diameter in millimeters
   * Standard for most hardware mounting holes
   */
  DEFAULT_HOLE_DIAMETER_MM: 5,

  /**
   * Default hole depth in millimeters
   * Standard depth for hardware mounting
   */
  DEFAULT_HOLE_DEPTH_MM: 10,
} as const;

/**
 * Hardware quantity per component
 */
export const HARDWARE_QUANTITY_PER_COMPONENT = {
  /**
   * Number of hinges per sash
   * Standard: 2 hinges per operable sash
   */
  HINGES_PER_SASH: 2,

  /**
   * Number of rollers per sliding sash
   * Standard: 2 rollers per sliding sash (one at each bottom corner)
   */
  ROLLERS_PER_SLIDING_SASH: 2,

  /**
   * Number of handles per sash
   * Standard: 1 handle per operable sash
   */
  HANDLES_PER_SASH: 1,

  /**
   * Number of locks per sash
   * Standard: 1 lock per operable sash
   */
  LOCKS_PER_SASH: 1,

  /**
   * Default quantity for unknown hardware
   */
  DEFAULT_QUANTITY: 1,
} as const;

/**
 * Unit conversion constants
 */
export const UNIT_CONVERSION = {
  /**
   * Millimeters per meter
   */
  MM_PER_METER: 1000,

  /**
   * Square millimeters per square meter
   */
  MM2_PER_M2: 1_000_000,

  /**
   * Degrees to radians conversion factor
   */
  DEGREES_TO_RADIANS: Math.PI / 180,
} as const;

