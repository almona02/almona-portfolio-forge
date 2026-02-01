// src/components/fabricator/drafting/utils/snapUtils.ts
import type { Rectangle, Point } from '../types/drafting';
import { normalizeCoordinate, roundToPrecision } from './precisionUtils';

/**
 * Default snap spacing (backward compatible)
 */
export const DEFAULT_SNAP_SPACING = 5; // mm

/**
 * Snap spacing options (competitive with fenestration software)
 */
export const SNAP_SPACING_OPTIONS = [
  1,   // 1mm - fine precision
  2,   // 2mm - medium-fine precision
  5,   // 5mm - default (backward compatible)
  10,  // 10mm - coarse precision
] as const;

export type SnapSpacingOption = typeof SNAP_SPACING_OPTIONS[number] | number; // Allow custom spacing

/**
 * Snap a rectangle to the grid with configurable spacing
 * Constitutional: Deterministic, no ML
 * Precision: Uses precision utilities to maintain 0.01mm precision
 */
export function snapToGrid(rect: Rectangle, gridSpacing: number = DEFAULT_SNAP_SPACING): Rectangle {
  // Ensure grid spacing is at least 0.01mm (standard precision)
  const safeSpacing = Math.max(0.01, gridSpacing);
  
  return {
    ...rect,
    x: normalizeCoordinate(Math.round(rect.x / safeSpacing) * safeSpacing),
    y: normalizeCoordinate(Math.round(rect.y / safeSpacing) * safeSpacing),
    width: roundToPrecision(Math.round(rect.width / safeSpacing) * safeSpacing),
    height: roundToPrecision(Math.round(rect.height / safeSpacing) * safeSpacing),
  };
}

/**
 * Snap a point to the grid with configurable spacing
 * Precision: Uses precision utilities to maintain 0.01mm precision
 */
export function snapPointToGrid(point: Point, gridSpacing: number = DEFAULT_SNAP_SPACING): Point {
  // Ensure grid spacing is at least 0.01mm (standard precision)
  const safeSpacing = Math.max(0.01, gridSpacing);
  
  return {
    x: normalizeCoordinate(Math.round(point.x / safeSpacing) * safeSpacing),
    y: normalizeCoordinate(Math.round(point.y / safeSpacing) * safeSpacing),
  };
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

