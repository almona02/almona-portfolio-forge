// src/components/fabricator/drafting/utils/precisionUtils.ts

/**
 * Precision Utility Functions
 * 
 * Provides precision handling functions for 0.01mm precision (competitive with fenestration software)
 * All coordinate and dimension calculations should use these utilities to maintain precision.
 */

/**
 * Standard precision for all calculations (0.01mm)
 * This matches competitive fenestration software (Ercom, Moxisys, Orgadata, Klaes)
 */
export const STANDARD_PRECISION = 0.01; // mm

/**
 * Round a value to the specified precision
 * 
 * @param value - The value to round
 * @param precision - Precision to round to (default: 0.01mm)
 * @returns Rounded value
 * 
 * @example
 * roundToPrecision(123.456) // 123.46
 * roundToPrecision(123.456, 0.1) // 123.5
 */
export function roundToPrecision(value: number, precision: number = STANDARD_PRECISION): number {
  if (!isFinite(value)) {
    return value;
  }
  
  if (!isFinite(precision) || precision <= 0) {
    return value;
  }
  
  // Use Math.round with scaled precision to avoid floating point errors
  const multiplier = 1 / precision;
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Validate that a value meets precision requirements
 * 
 * @param value - The value to validate
 * @param precision - Required precision (default: 0.01mm)
 * @returns True if value is valid, false otherwise
 */
export function validatePrecision(value: number, precision: number = STANDARD_PRECISION): boolean {
  if (!isFinite(value)) {
    return false;
  }
  
  if (!isFinite(precision) || precision <= 0) {
    return false;
  }
  
  // Check if value is already at the required precision (within rounding tolerance)
  const rounded = roundToPrecision(value, precision);
  const diff = Math.abs(value - rounded);
  const tolerance = precision / 1000; // Very small tolerance for floating point errors
  
  return diff <= tolerance;
}

/**
 * Normalize a coordinate to standard precision
 * 
 * @param value - Coordinate value to normalize
 * @returns Normalized coordinate value
 */
export function normalizeCoordinate(value: number): number {
  return roundToPrecision(value, STANDARD_PRECISION);
}

/**
 * Normalize a point to standard precision
 * 
 * @param point - Point with x, y coordinates
 * @returns Normalized point
 */
export function normalizePoint(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: normalizeCoordinate(point.x),
    y: normalizeCoordinate(point.y)
  };
}

/**
 * Check if two values are equal within precision tolerance
 * 
 * @param a - First value
 * @param b - Second value
 * @param precision - Precision tolerance (default: 0.01mm)
 * @returns True if values are equal within tolerance
 */
export function equalsWithinPrecision(
  a: number,
  b: number,
  precision: number = STANDARD_PRECISION
): boolean {
  if (!isFinite(a) || !isFinite(b)) {
    return a === b;
  }
  
  return Math.abs(a - b) <= precision / 2;
}

/**
 * Clamp a value to precision (round to nearest precision step)
 * 
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param precision - Precision step (default: 0.01mm)
 * @returns Clamped and rounded value
 */
export function clampToPrecision(
  value: number,
  min: number,
  max: number,
  precision: number = STANDARD_PRECISION
): number {
  const clamped = Math.max(min, Math.min(max, value));
  return roundToPrecision(clamped, precision);
}
