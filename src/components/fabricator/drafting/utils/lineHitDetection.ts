/**
 * Line Hit Detection Utilities
 * 
 * Optimized line hit testing for canvas interactions
 * Performance: Cached calculations, early returns, squared distances
 * 
 * Constitutional: Deterministic geometry, no ML/AI
 * Tier: 3 Protected Determinism
 */

import type { Line, Point } from '../types/drafting';

// Performance constants
const HIT_TOLERANCE = 5; // pixels (5mm tolerance for clicking)
const _HIT_TOLERANCE_SQ = HIT_TOLERANCE * HIT_TOLERANCE;

/**
 * Find line at point (optimized for performance)
 * Uses squared distances to avoid sqrt calculations
 */
export function findLineAtPoint(
  point: Point,
  lines: Line[],
  tolerance: number = HIT_TOLERANCE
): Line | null {
  if (!point || !Array.isArray(lines) || lines.length === 0) {
    return null;
  }

  const toleranceSq = tolerance * tolerance;
  let closestLine: Line | null = null;
  let minDistSq = Infinity;

  for (const line of lines) {
    if (!line || !line.start || !line.end) continue;

    // Quick bounds check first (faster than distance calculation)
    const minX = Math.min(line.start.x, line.end.x);
    const maxX = Math.max(line.start.x, line.end.x);
    const minY = Math.min(line.start.y, line.end.y);
    const maxY = Math.max(line.start.y, line.end.y);

    // Expand bounds by tolerance
    if (point.x < minX - tolerance || point.x > maxX + tolerance ||
        point.y < minY - tolerance || point.y > maxY + tolerance) {
      continue; // Point is outside bounding box
    }

    // Calculate squared distance to line (faster than regular distance)
    const distSq = pointToLineDistanceSq(point, line);

    if (distSq <= toleranceSq && distSq < minDistSq) {
      minDistSq = distSq;
      closestLine = line;
    }
  }

  return closestLine;
}

/**
 * Calculate squared distance from point to line (optimized, no sqrt)
 */
function pointToLineDistanceSq(
  point: Point,
  line: Line
): number {
  const A = point.x - line.start.x;
  const B = point.y - line.start.y;
  const C = line.end.x - line.start.x;
  const D = line.end.y - line.start.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line is a point
    return A * A + B * B;
  }

  const param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    xx = line.start.x;
    yy = line.start.y;
  } else if (param > 1) {
    xx = line.end.x;
    yy = line.end.y;
  } else {
    xx = line.start.x + param * C;
    yy = line.start.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return dx * dx + dy * dy;
}

/**
 * Batch find lines at point (for multiple points)
 * Performance: Single pass through lines array
 */
export function findLinesAtPoints(
  points: Point[],
  lines: Line[],
  tolerance: number = HIT_TOLERANCE
): Map<Point, Line | null> {
  const results = new Map<Point, Line | null>();

  if (!Array.isArray(points) || points.length === 0 || !Array.isArray(lines)) {
    points.forEach(p => results.set(p, null));
    return results;
  }

  // Pre-calculate tolerance squared
  const toleranceSq = tolerance * tolerance;

  for (const point of points) {
    let closestLine: Line | null = null;
    let minDistSq = Infinity;

    for (const line of lines) {
      if (!line || !line.start || !line.end) continue;

      // Quick bounds check
      const minX = Math.min(line.start.x, line.end.x);
      const maxX = Math.max(line.start.x, line.end.x);
      const minY = Math.min(line.start.y, line.end.y);
      const maxY = Math.max(line.start.y, line.end.y);

      if (point.x < minX - tolerance || point.x > maxX + tolerance ||
          point.y < minY - tolerance || point.y > maxY + tolerance) {
        continue;
      }

      const distSq = pointToLineDistanceSq(point, line);

      if (distSq <= toleranceSq && distSq < minDistSq) {
        minDistSq = distSq;
        closestLine = line;
      }
    }

    results.set(point, closestLine);
  }

  return results;
}

