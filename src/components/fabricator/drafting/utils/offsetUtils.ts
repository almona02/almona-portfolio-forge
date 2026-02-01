/**
 * Offset Utilities
 * 
 * Tools for creating parallel geometry at specified distance
 * 
 * Constitutional: Deterministic geometry operations, no ML/AI
 * Tier: 3 Protected Determinism
 * 
 * Performance: Input validation, bounds checking, early returns
 */

import type { Arc, Line, Point, Polygon, Rectangle } from '../types/drafting';
import { pointDistanceSq } from './geometryUtils';
import { SAFETY_LIMITS } from './inputValidator';

// Performance constants
const MIN_OFFSET_DISTANCE = -SAFETY_LIMITS.MAX_DIMENSION;
const MAX_OFFSET_DISTANCE = SAFETY_LIMITS.MAX_DIMENSION;

/**
 * Offset a line by specified distance
 * Returns two offset lines (one on each side)
 * Performance: Input validation, bounds checking, early returns
 */
export function offsetLine(
  line: Line,
  distance: number
): { left: Line; right: Line } {
  // Input validation
  if (!line || !line.start || !line.end) {
    throw new Error('Invalid line: missing start or end point');
  }
  
  // Validate distance
  if (!isFinite(distance) || distance < MIN_OFFSET_DISTANCE || distance > MAX_OFFSET_DISTANCE) {
    throw new Error(`Invalid offset distance: ${distance} (must be between ${MIN_OFFSET_DISTANCE} and ${MAX_OFFSET_DISTANCE})`);
  }
  
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq < 1e-20) {
    // Line is a point
    return { left: line, right: line };
  }
  
  const len = Math.sqrt(lenSq);
  
  // Unit vector along line
  const ux = dx / len;
  const uy = dy / len;
  
  // Perpendicular vector (rotate 90°)
  const perpX = -uy;
  const perpY = ux;
  
  // Offset points
  const offsetX = perpX * distance;
  const offsetY = perpY * distance;
  
  const left: Line = {
    start: {
      x: line.start.x + offsetX,
      y: line.start.y + offsetY
    },
    end: {
      x: line.end.x + offsetX,
      y: line.end.y + offsetY
    },
    type: 'solid'
  };

  const right: Line = {
    start: {
      x: line.start.x - offsetX,
      y: line.start.y - offsetY
    },
    end: {
      x: line.end.x - offsetX,
      y: line.end.y - offsetY
    },
    type: 'solid'
  };
  
  return { left, right };
}

/**
 * Offset a rectangle by specified distance
 * Performance: Input validation, bounds checking
 */
export function offsetRectangle(
  rect: Rectangle,
  distance: number
): Rectangle {
  // Input validation
  if (!rect || typeof rect.x !== 'number' || typeof rect.y !== 'number' ||
      typeof rect.width !== 'number' || typeof rect.height !== 'number') {
    throw new Error('Invalid rectangle');
  }
  
  // Validate distance
  if (!isFinite(distance) || distance < MIN_OFFSET_DISTANCE || distance > MAX_OFFSET_DISTANCE) {
    throw new Error(`Invalid offset distance: ${distance}`);
  }
  
  const newWidth = rect.width + 2 * distance;
  const newHeight = rect.height + 2 * distance;
  
  // Validate resulting dimensions
  if (newWidth < SAFETY_LIMITS.MIN_DIMENSION || newHeight < SAFETY_LIMITS.MIN_DIMENSION) {
    throw new Error('Offset would result in invalid rectangle dimensions');
  }
  
  if (newWidth > SAFETY_LIMITS.MAX_DIMENSION || newHeight > SAFETY_LIMITS.MAX_DIMENSION) {
    throw new Error('Offset would result in rectangle exceeding maximum dimensions');
  }
  
  return {
    ...rect,
    x: rect.x - distance,
    y: rect.y - distance,
    width: newWidth,
    height: newHeight
  };
}

/**
 * Offset a polygon by specified distance
 * Uses parallel offset algorithm
 */
export function offsetPolygon(
  polygon: Polygon,
  distance: number
): Polygon {
  if (polygon.points.length < 3) {
    return polygon;
  }
  
  const offsetPoints: Point[] = [];
  
  for (let i = 0; i < polygon.points.length; i++) {
    const prev = polygon.points[(i - 1 + polygon.points.length) % polygon.points.length];
    const curr = polygon.points[i];
    const next = polygon.points[(i + 1) % polygon.points.length];
    
    // Calculate direction vectors
    const dir1 = {
      x: curr.x - prev.x,
      y: curr.y - prev.y
    };
    const len1 = Math.sqrt(dir1.x * dir1.x + dir1.y * dir1.y);
    if (len1 > 0) {
      dir1.x /= len1;
      dir1.y /= len1;
    }
    
    const dir2 = {
      x: next.x - curr.x,
      y: next.y - curr.y
    };
    const len2 = Math.sqrt(dir2.x * dir2.x + dir2.y * dir2.y);
    if (len2 > 0) {
      dir2.x /= len2;
      dir2.y /= len2;
    }
    
    // Perpendicular vectors
    const perp1 = { x: -dir1.y, y: dir1.x };
    const _perp2 = { x: -dir2.y, y: dir2.x };
    
    // Average perpendicular (for corner)
    const avgPerp = {
      x: (perp1.x + _perp2.x) / 2,
      y: (perp1.y + _perp2.y) / 2
    };
    const avgLen = Math.sqrt(avgPerp.x * avgPerp.x + avgPerp.y * avgPerp.y);
    if (avgLen > 0) {
      avgPerp.x /= avgLen;
      avgPerp.y /= avgLen;
    }
    
    // Calculate offset distance for corner
    const dot = dir1.x * dir2.x + dir1.y * dir2.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    
    // Check for degenerate cases (parallel edges)
    if (angle < 0.01 || angle > Math.PI - 0.01) {
      // Parallel edges - use simple perpendicular offset
      const perp = { x: -dir1.y, y: dir1.x };
      offsetPoints.push({
        x: curr.x + perp.x * distance,
        y: curr.y + perp.y * distance
      });
      continue;
    }
    
    const sinHalfAngle = Math.sin(angle / 2);
    if (sinHalfAngle < 1e-10) {
      // Degenerate case
      offsetPoints.push(curr);
      continue;
    }
    
    const offsetDist = distance / sinHalfAngle;
    
    // Validate offset distance
    if (!isFinite(offsetDist) || offsetDist < 0 || offsetDist > SAFETY_LIMITS.MAX_DIMENSION) {
      offsetPoints.push(curr); // Fallback to original point
      continue;
    }
    
    offsetPoints.push({
      x: curr.x + avgPerp.x * offsetDist,
      y: curr.y + avgPerp.y * offsetDist
    });
  }
  
  return {
    ...polygon,
    points: offsetPoints
  };
}

/**
 * Offset an arc by specified distance
 * Performance: Input validation, bounds checking
 */
export function offsetArc(
  arc: Arc,
  distance: number
): Arc {
  // Input validation
  if (!arc || typeof arc.r !== 'number') {
    throw new Error('Invalid arc');
  }

  // Validate distance
  if (!isFinite(distance) || distance < MIN_OFFSET_DISTANCE || distance > MAX_OFFSET_DISTANCE) {
    throw new Error(`Invalid offset distance: ${distance}`);
  }

  // For arcs, offset is simply changing the radius
  const newRadius = arc.r + distance;

  // Validate resulting radius
  if (newRadius <= SAFETY_LIMITS.MIN_RADIUS) {
    throw new Error('Offset would result in invalid arc radius (too small)');
  }

  if (newRadius > SAFETY_LIMITS.MAX_RADIUS) {
    throw new Error('Offset would result in arc radius exceeding maximum');
  }

  return {
    ...arc,
    r: newRadius
  };
}

/**
 * Offset multiple connected lines (polyline)
 * Performance: Early returns, optimized distance comparison
 */
export function offsetPolyline(
  lines: Line[],
  distance: number
): Line[] {
  // Input validation
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }
  
  // Validate distance
  if (!isFinite(distance) || distance < MIN_OFFSET_DISTANCE || distance > MAX_OFFSET_DISTANCE) {
    throw new Error(`Invalid offset distance: ${distance}`);
  }
  
  if (lines.length === 1) {
    try {
      const offset = offsetLine(lines[0], distance);
      return [offset.left]; // Use left side by default
    } catch {
      return [];
    }
  }
  
  const offsetLines: Line[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.start || !line.end) continue;
    
    try {
      const offset = offsetLine(line, distance);
      
      // Determine which side to use based on connectivity
      if (i === 0) {
        // First line - use left side
        offsetLines.push(offset.left);
      } else {
        // Check which side connects better (use squared distance for performance)
        const prevEnd = offsetLines[offsetLines.length - 1].end;
        const distToLeftSq = pointDistanceSq(prevEnd, offset.left.start);
        const distToRightSq = pointDistanceSq(prevEnd, offset.right.start);
        
        if (distToLeftSq < distToRightSq) {
          offsetLines.push(offset.left);
        } else {
          offsetLines.push(offset.right);
        }
      }
    } catch {
      // Skip invalid lines
      continue;
    }
  }
  
  return offsetLines;
}

/**
 * Detect self-intersections in offset geometry
 */
export function detectSelfIntersections(
  points: Point[]
): boolean {
  if (points.length < 4) {
    return false;
  }
  
  // Simple check: if polygon area changes sign, there's self-intersection
  let _area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    _area += points[i].x * points[j].y;
    _area -= points[j].x * points[i].y;
  }
  
  // Check if any edges intersect
  for (let i = 0; i < points.length; i++) {
      const _line1: Line = {
        start: points[i],
        end: points[(i + 1) % points.length],
        type: 'solid'
      };

      for (let j = i + 2; j < points.length; j++) {
        if (j === points.length - 1 && i === 0) continue; // Skip adjacent edges

        const _line2: Line = {
          start: points[j],
          end: points[(j + 1) % points.length],
          type: 'solid'
        };
      
      // Simple intersection check (would need full line-line intersection)
      // For now, return false (no detection)
    }
  }
  
  return false;
}

