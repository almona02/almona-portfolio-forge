/**
 * Fillet/Chamfer Utilities
 * 
 * Tools for rounding (fillet) and beveling (chamfer) corners
 * 
 * Constitutional: Deterministic geometry operations, no ML/AI
 * Tier: 3 Protected Determinism
 * 
 * Performance: Input validation, bounds checking, early returns
 */

import type { Line, Point, Rectangle } from '../types/drafting';
import {
    angleBetweenLines,
    lineLineIntersection
} from './geometryUtils';
import { SAFETY_LIMITS } from './inputValidator';

// Performance constants
const MIN_FILLET_RADIUS = 0.1; // mm
const MAX_FILLET_RADIUS = 1000; // mm
const MIN_CHAMFER_DISTANCE = 0.1; // mm
const MAX_CHAMFER_DISTANCE = 1000; // mm

export interface FilletResult {
  success: boolean;
  newLines: Line[];
  arc?: {
    center: Point;
    radius: number;
    startAngle: number;
    endAngle: number;
  };
}

export interface ChamferResult {
  success: boolean;
  newLines: Line[];
  chamferLine?: Line;
}

/**
 * Apply fillet (rounded corner) to two lines
 * Performance: Input validation, bounds checking, early returns
 */
export function applyFillet(
  line1: Line,
  line2: Line,
  radius: number
): FilletResult {
  // Input validation
  if (!line1 || !line2 || !line1.start || !line1.end || !line2.start || !line2.end) {
    return { success: false, newLines: [] };
  }
  
  // Validate radius
  if (!isFinite(radius) || radius < MIN_FILLET_RADIUS || radius > MAX_FILLET_RADIUS) {
    return { success: false, newLines: [] };
  }
  
  // Find intersection point
  const intersection = lineLineIntersection(line1, line2);
  
  if (!intersection) {
    return { success: false, newLines: [] };
  }
  
  // Calculate unit vectors along each line
  const dir1 = {
    x: line1.end.x - line1.start.x,
    y: line1.end.y - line1.start.y
  };
  const len1 = Math.sqrt(dir1.x * dir1.x + dir1.y * dir1.y);
  if (len1 === 0) {
    return { success: false, newLines: [] };
  }
  dir1.x /= len1;
  dir1.y /= len1;
  
  const dir2 = {
    x: line2.end.x - line2.start.x,
    y: line2.end.y - line2.start.y
  };
  const len2 = Math.sqrt(dir2.x * dir2.x + dir2.y * dir2.y);
  if (len2 === 0) {
    return { success: false, newLines: [] };
  }
  dir2.x /= len2;
  dir2.y /= len2;
  
  // Calculate angle between lines
  const angle = Math.abs(angleBetweenLines(line1, line2));
  
  // Check for degenerate cases (parallel lines, zero angle)
  if (angle < 0.01 || angle > Math.PI - 0.01) {
    return { success: false, newLines: [] };
  }
  
  const halfAngle = angle / 2;
  
  // Calculate distance from intersection to fillet start/end
  const tanHalfAngle = Math.tan(halfAngle);
  if (tanHalfAngle < 1e-10) {
    return { success: false, newLines: [] };
  }
  
  const dist = radius / tanHalfAngle;
  
  // Validate distance
  if (!isFinite(dist) || dist < 0 || dist > SAFETY_LIMITS.MAX_DIMENSION) {
    return { success: false, newLines: [] };
  }
  
  // Calculate fillet start and end points
  const filletStart: Point = {
    x: intersection.x - dir1.x * dist,
    y: intersection.y - dir1.y * dist
  };
  
  const filletEnd: Point = {
    x: intersection.x - dir2.x * dist,
    y: intersection.y - dir2.y * dist
  };
  
  // Calculate fillet center (perpendicular to both lines at fillet points)
  const perp1 = { x: -dir1.y, y: dir1.x };
  const _perp2 = { x: -dir2.y, y: dir2.x };
  
  // Center is at radius distance along perpendicular
  const center: Point = {
    x: filletStart.x + perp1.x * radius,
    y: filletStart.y + perp1.y * radius
  };
  
  // Calculate angles for arc
  const startAngle = Math.atan2(filletStart.y - center.y, filletStart.x - center.x);
  const endAngle = Math.atan2(filletEnd.y - center.y, filletEnd.x - center.x);
  
  // Create new lines (trimmed to fillet points)
  const newLine1: Line = {
    ...line1,
    end: filletStart
  };
  
  const newLine2: Line = {
    ...line2,
    start: filletEnd
  };
  
  return {
    success: true,
    newLines: [newLine1, newLine2],
    arc: {
      center,
      radius,
      startAngle,
      endAngle
    }
  };
}

/**
 * Apply chamfer (beveled corner) to two lines
 * Performance: Input validation, bounds checking, early returns
 */
export function applyChamfer(
  line1: Line,
  line2: Line,
  distance1: number,
  distance2?: number
): ChamferResult {
  // Input validation
  if (!line1 || !line2 || !line1.start || !line1.end || !line2.start || !line2.end) {
    return { success: false, newLines: [] };
  }
  
  // If distance2 not provided, use distance1 for both
  const dist1 = distance1;
  const dist2 = distance2 ?? distance1;
  
  // Validate distances
  if (!isFinite(dist1) || dist1 < MIN_CHAMFER_DISTANCE || dist1 > MAX_CHAMFER_DISTANCE ||
      !isFinite(dist2) || dist2 < MIN_CHAMFER_DISTANCE || dist2 > MAX_CHAMFER_DISTANCE) {
    return { success: false, newLines: [] };
  }
  
  // Find intersection point
  const intersection = lineLineIntersection(line1, line2);
  
  if (!intersection) {
    return { success: false, newLines: [] };
  }
  
  // Calculate unit vectors along each line
  const dir1 = {
    x: line1.end.x - line1.start.x,
    y: line1.end.y - line1.start.y
  };
  const len1 = Math.sqrt(dir1.x * dir1.x + dir1.y * dir1.y);
  if (len1 === 0) {
    return { success: false, newLines: [] };
  }
  dir1.x /= len1;
  dir1.y /= len1;
  
  const dir2 = {
    x: line2.end.x - line2.start.x,
    y: line2.end.y - line2.start.y
  };
  const len2 = Math.sqrt(dir2.x * dir2.x + dir2.y * dir2.y);
  if (len2 === 0) {
    return { success: false, newLines: [] };
  }
  dir2.x /= len2;
  dir2.y /= len2;
  
  // Calculate chamfer points
  const chamferStart: Point = {
    x: intersection.x - dir1.x * dist1,
    y: intersection.y - dir1.y * dist1
  };
  
  const chamferEnd: Point = {
    x: intersection.x - dir2.x * dist2,
    y: intersection.y - dir2.y * dist2
  };
  
  // Create chamfer line
  const chamferLine: Line = {
    start: chamferStart,
    end: chamferEnd,
    type: 'solid'
  };
  
  // Create new lines (trimmed to chamfer points)
  const newLine1: Line = {
    ...line1,
    end: chamferStart
  };
  
  const newLine2: Line = {
    ...line2,
    start: chamferEnd
  };
  
  return {
    success: true,
    newLines: [newLine1, newLine2],
    chamferLine
  };
}

/**
 * Apply fillet to rectangle corner
 */
export function applyFilletToRectangle(
  rect: Rectangle,
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  radius: number
): FilletResult {
  // Create lines for the rectangle
  const topLine: Line = {
    start: { x: rect.x, y: rect.y },
    end: { x: rect.x + rect.width, y: rect.y },
    type: 'solid'
  };

  const rightLine: Line = {
    start: { x: rect.x + rect.width, y: rect.y },
    end: { x: rect.x + rect.width, y: rect.y + rect.height },
    type: 'solid'
  };

  const bottomLine: Line = {
    start: { x: rect.x + rect.width, y: rect.y + rect.height },
    end: { x: rect.x, y: rect.y + rect.height },
    type: 'solid'
  };

  const leftLine: Line = {
    start: { x: rect.x, y: rect.y + rect.height },
    end: { x: rect.x, y: rect.y },
    type: 'solid'
  };
  
  let line1: Line;
  let line2: Line;
  
  switch (corner) {
    case 'topLeft':
      line1 = leftLine;
      line2 = topLine;
      break;
    case 'topRight':
      line1 = topLine;
      line2 = rightLine;
      break;
    case 'bottomRight':
      line1 = rightLine;
      line2 = bottomLine;
      break;
    case 'bottomLeft':
      line1 = bottomLine;
      line2 = leftLine;
      break;
  }
  
  return applyFillet(line1, line2, radius);
}

/**
 * Apply chamfer to rectangle corner
 */
export function applyChamferToRectangle(
  rect: Rectangle,
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  distance1: number,
  distance2?: number
): ChamferResult {
  // Create lines for the rectangle
  const topLine: Line = {
    start: { x: rect.x, y: rect.y },
    end: { x: rect.x + rect.width, y: rect.y },
    type: 'solid'
  };

  const rightLine: Line = {
    start: { x: rect.x + rect.width, y: rect.y },
    end: { x: rect.x + rect.width, y: rect.y + rect.height },
    type: 'solid'
  };

  const bottomLine: Line = {
    start: { x: rect.x + rect.width, y: rect.y + rect.height },
    end: { x: rect.x, y: rect.y + rect.height },
    type: 'solid'
  };

  const leftLine: Line = {
    start: { x: rect.x, y: rect.y + rect.height },
    end: { x: rect.x, y: rect.y },
    type: 'solid'
  };
  
  let line1: Line;
  let line2: Line;
  
  switch (corner) {
    case 'topLeft':
      line1 = leftLine;
      line2 = topLine;
      break;
    case 'topRight':
      line1 = topLine;
      line2 = rightLine;
      break;
    case 'bottomRight':
      line1 = rightLine;
      line2 = bottomLine;
      break;
    case 'bottomLeft':
      line1 = bottomLine;
      line2 = leftLine;
      break;
  }
  
  return applyChamfer(line1, line2, distance1, distance2);
}

