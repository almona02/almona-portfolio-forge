/**
 * Egyptian Pricing Constants
 * 
 * Defines Egyptian market pricing for hardware, glazing, and labor.
 * These values are based on current market rates and can be adjusted
 * for different regions or suppliers.
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 */

/**
 * Hardware pricing in Egyptian Pounds (EGP) per unit
 */
export const HARDWARE_PRICES_EGP = {
  /**
   * Price per hinge (EGP)
   */
  HINGE: 25,

  /**
   * Price per handle (EGP)
   */
  HANDLE: 45,

  /**
   * Price per lock (EGP)
   */
  LOCK: 60,

  /**
   * Price per roller (EGP)
   */
  ROLLER: 8,

  /**
   * Price per corner key (EGP)
   */
  CORNER_KEY: 3,

  /**
   * Price per meter of gasket (EGP/m)
   */
  GASKET_PER_METER: 2,

  /**
   * Default price for other hardware items (EGP)
   */
  OTHER: 20,

  /**
   * Shutter Winder (Manual)
   */
  SHUTTER_WINDER: 150,

  /**
   * Shutter Strap (Coiler)
   */
  SHUTTER_STRAP: 85,

  /**
   * Shutter Motor (Standard)
   */
  SHUTTER_MOTOR: 1200,

  /**
   * Fly Screen Roller
   */
  SCREEN_ROLLER: 15,
} as const;

/**
 * Glazing pricing in Egyptian Pounds (EGP) per square meter
 */
export const GLAZING_PRICES_EGP_PER_M2 = {
  /**
   * Single glazing price (EGP/m²)
   */
  SINGLE: 150,

  /**
   * Double glazing price (EGP/m²)
   */
  DOUBLE: 250,

  /**
   * Triple glazing price (EGP/m²)
   */
  TRIPLE: 350,
} as const;

/**
 * Labor rates in Egyptian Pounds (EGP) per hour
 */
export const LABOR_RATES_EGP_PER_HOUR = {
  /**
   * Cairo labor rate (EGP/hour)
   */
  CAIRO: 50,

  /**
   * Alexandria labor rate (EGP/hour)
   * Slightly higher due to coastal location
   */
  ALEXANDRIA: 55,

  /**
   * Upper Egypt labor rate (EGP/hour)
   */
  UPPER_EGYPT: 45,

  /**
   * Default labor rate (EGP/hour)
   */
  DEFAULT: 50,
} as const;

/**
 * Location pricing multipliers
 * Small adjustments based on location (typically 0.95-1.05)
 */
export const LOCATION_MULTIPLIERS = {
  /**
   * Upper Egypt multiplier (slightly cheaper)
   */
  UPPER_EGYPT: 0.95,

  /**
   * Alexandria multiplier (slightly more expensive - coastal)
   */
  ALEXANDRIA: 1.05,

  /**
   * Cairo multiplier (baseline)
   */
  CAIRO: 1.0,
} as const;

/**
 * Glazing type detection thresholds (millimeters)
 */
export const GLAZING_TYPE_THRESHOLDS = {
  /**
   * Maximum thickness for single glazing (mm)
   */
  SINGLE_MAX_THICKNESS_MM: 5,

  /**
   * Maximum thickness for double glazing (mm)
   */
  DOUBLE_MAX_THICKNESS_MM: 12,
} as const;

/**
 * Time conversion constants
 */
export const TIME_CONVERSION = {
  /**
   * Minutes per hour
   */
  MINUTES_PER_HOUR: 60,
} as const;

