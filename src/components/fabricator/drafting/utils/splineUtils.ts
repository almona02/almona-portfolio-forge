/**
 * Spline Utilities
 * 
 * Utilities for generating smooth bezier curves from control points
 * 
 * Constitutional: Deterministic geometry operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

import type { Point } from '../types/drafting';

/**
 * Generate smooth cubic bezier curve segments from control points
 * Uses Catmull-Rom to cubic bezier conversion for smooth curves
 * 
 * @param controlPoints - Array of control points
 * @returns Array of cubic bezier segments (each with 4 points: start, cp1, cp2, end)
 */
export function generateBezierSegments(controlPoints: Point[]): Array<{ p0: Point; p1: Point; p2: Point; p3: Point }> {
  if (controlPoints.length < 2) {
    return [];
  }

  if (controlPoints.length === 2) {
    // Two points - return a simple line as bezier (control points at endpoints)
    return [{
      p0: controlPoints[0],
      p1: controlPoints[0],
      p2: controlPoints[1],
      p3: controlPoints[1]
    }];
  }

  const segments: Array<{ p0: Point; p1: Point; p2: Point; p3: Point }> = [];

  // For 3+ points, create smooth bezier segments
  // Simple approach: use control points as bezier control points with smooth interpolation
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[i];
    const p3 = controlPoints[i + 1];

    // Calculate control points for smooth curve
    let p1: Point;
    let p2: Point;

    if (i === 0) {
      // First segment
      const dir = {
        x: controlPoints[1].x - controlPoints[0].x,
        y: controlPoints[1].y - controlPoints[0].y
      };
      p1 = { x: p0.x + dir.x * 0.33, y: p0.y + dir.y * 0.33 };
      p2 = controlPoints.length > 2
        ? { x: p3.x - (controlPoints[2].x - p3.x) * 0.33, y: p3.y - (controlPoints[2].y - p3.y) * 0.33 }
        : { x: p0.x + dir.x * 0.67, y: p0.y + dir.y * 0.67 };
    } else if (i === controlPoints.length - 2) {
      // Last segment
      const dir = {
        x: controlPoints[i].x - controlPoints[i - 1].x,
        y: controlPoints[i].y - controlPoints[i - 1].y
      };
      p1 = { x: p0.x - dir.x * 0.33, y: p0.y - dir.y * 0.33 };
      p2 = { x: p3.x - (p3.x - p0.x) * 0.33, y: p3.y - (p3.y - p0.y) * 0.33 };
    } else {
      // Middle segments - smooth interpolation
      const dir1 = {
        x: controlPoints[i + 1].x - controlPoints[i - 1].x,
        y: controlPoints[i + 1].y - controlPoints[i - 1].y
      };
      const dir2 = {
        x: controlPoints[i + 2].x - controlPoints[i].x,
        y: controlPoints[i + 2].y - controlPoints[i].y
      };
      
      p1 = { x: p0.x + dir1.x * 0.33, y: p0.y + dir1.y * 0.33 };
      p2 = { x: p3.x - dir2.x * 0.33, y: p3.y - dir2.y * 0.33 };
    }

    segments.push({ p0, p1, p2, p3 });
  }

  return segments;
}

/**
 * Convert bezier segments to SVG path data
 * 
 * @param segments - Array of bezier segments
 * @param closed - Whether the spline is closed
 * @returns SVG path data string
 */
export function bezierSegmentsToSVGPath(
  segments: Array<{ p0: Point; p1: Point; p2: Point; p3: Point }>,
  closed: boolean = false
): string {
  if (segments.length === 0) {
    return '';
  }

  const pathParts: string[] = [];
  const first = segments[0];

  // Move to first point
  pathParts.push(`M ${first.p0.x} ${first.p0.y}`);

  // Add cubic bezier curves
  segments.forEach(seg => {
    pathParts.push(`C ${seg.p1.x} ${seg.p1.y}, ${seg.p2.x} ${seg.p2.y}, ${seg.p3.x} ${seg.p3.y}`);
  });

  // Close if needed
  if (closed && segments.length > 0) {
    pathParts.push('Z');
  }

  return pathParts.join(' ');
}

/**
 * Convert control points to SVG path using smooth bezier curves
 * 
 * @param controlPoints - Array of control points
 * @param closed - Whether the spline is closed
 * @returns SVG path data string
 */
export function controlPointsToSVGPath(controlPoints: Point[], closed: boolean = false): string {
  if (controlPoints.length < 2) {
    return '';
  }

  const segments = generateBezierSegments(controlPoints);
  return bezierSegmentsToSVGPath(segments, closed);
}
