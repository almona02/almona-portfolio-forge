/**
 * Micron Engine Constants
 * 
 * Defines precision calculation constants for 99.8% accuracy:
 * - Saw blade kerf (Yilmaz/Elumatec standard)
 * - Bar end trim allowances
 * - Machine clamp safety factors
 * - Transom milling depths (profile-specific)
 * - Screen sash adapter offsets
 * - Floating point precision multipliers
 * 
 * This is the ENGINE that saves the business.
 * No UI, no empire, just math that works.
 * 
 * @since Phase 1: Foundational Precision
 */

/**
 * Default saw blade kerf (mm)
 * Yilmaz/Elumatec standard saw blade kerf
 */
export const DEFAULT_SAW_BLADE_KERF_MM = 4.2;

/**
 * Default bar end trim (mm per end)
 * Standard trim allowance for oxidized/damaged bar ends
 */
export const DEFAULT_BAR_END_TRIM_MM = 15;

/**
 * Default bar nominal length (mm)
 * Standard 6-meter aluminum bar length
 */
export const DEFAULT_BAR_NOMINAL_LENGTH_MM = 6000;

/**
 * Machine clamp safety factor (mm)
 * Safety factor for CNC clamp - prevents machine hitting clamp on last cut
 * Formula: Usable_Length = Nominal - (Trim × 2) - Machine_Clamp_Safety
 * Example: 6000 - (15 × 2) - 50 = 5920mm usable
 */
export const MACHINE_CLAMP_SAFETY_MM = 50;

/**
 * Floating point precision multiplier
 * JavaScript is bad at math - round to 0.01mm precision
 * Formula: Math.round(num * 100) / 100
 */
export const PRECISION_MULTIPLIER = 100;

/**
 * Precision tolerance (mm)
 * All calculations use 0.01mm precision
 */
export const PRECISION_TOLERANCE_MM = 0.01;

/**
 * Profile-specific transom milling depths (mm)
 * The miller removes material from each side for T-joint connection
 * If not accounted for, visible glass area is correct but aluminum falls out
 */
export const TRANSOM_MILLING_DEPTHS = {
  /**
   * ROCK 60 system milling depth (mm)
   */
  ROCK60: 2.5,

  /**
   * Panda 50/100 system milling depth (mm)
   */
  PANDA: 2.5,

  /**
   * Jumbo 100 system milling depth (mm)
   */
  JUMBO100: 3.0,

  /**
   * Generic/default milling depth (mm)
   */
  GENERIC: 2.0,
} as const;

/**
 * Screen sash adapter offsets (Panda system)
 * CRITICAL: The screen adapter pushes the screen sash outward
 * If not accounted for, every screen sash needs trimming on site
 */
export const SCREEN_SASH_OFFSETS = {
  /**
   * Default adapter offset (mm)
   * Typical range: 12-18mm, default: 15mm
   */
  DEFAULT_ADAPTER_OFFSET_MM: 15,

  /**
   * Default clearance factor (mm)
   * Clearance to prevent binding
   */
  DEFAULT_CLEARANCE_MM: 10,
} as const;

/**
 * Default Micron Engine configuration
 */
export const DEFAULT_MICRON_CONFIG = {
  sawBladeKerf: DEFAULT_SAW_BLADE_KERF_MM,
  barEndTrim: DEFAULT_BAR_END_TRIM_MM,
  barNominalLength: DEFAULT_BAR_NOMINAL_LENGTH_MM,
  machineClampSafety: MACHINE_CLAMP_SAFETY_MM,
} as const;

