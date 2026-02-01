/**
 * Trim/Extend Utilities
 * 
 * Tools for trimming and extending geometry to intersection points
 * 
 * Constitutional: Deterministic geometry operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

import type { Arc, Geometry2D, Line, Point } from '../types/drafting';
import {
    arcArcIntersection,
    lineArcIntersection,
    lineLineIntersection,
    pointDistance
} from './geometryUtils';

export interface TrimResult {
  trimmed: boolean;
  newGeometry: Line | Arc | null;
  intersectionPoint?: Point;
}

/**
 * Trim a line to intersection with another line
 */
export function trimLineToLine(
  lineToTrim: Line,
  cuttingLine: Line
): TrimResult {
  const intersection = lineLineIntersection(lineToTrim, cuttingLine);
  
  if (!intersection) {
    return { trimmed: false, newGeometry: null };
  }
  
  // Determine which end to trim based on which is closer to intersection
  const distToStart = pointDistance(intersection, lineToTrim.start);
  const distToEnd = pointDistance(intersection, lineToTrim.end);
  
  const trimmedLine: Line = {
    ...lineToTrim,
    end: distToStart < distToEnd ? intersection : lineToTrim.end,
    start: distToStart < distToEnd ? lineToTrim.start : intersection
  };
  
  return {
    trimmed: true,
    newGeometry: trimmedLine,
    intersectionPoint: intersection
  };
}

/**
 * Extend a line to intersection with another line
 */
export function extendLineToLine(
  lineToExtend: Line,
  targetLine: Line
): TrimResult {
  const intersection = lineLineIntersection(lineToExtend, targetLine);
  
  if (!intersection) {
    return { trimmed: false, newGeometry: null };
  }
  
  // Check if intersection is beyond line endpoints
  const distToStart = pointDistance(intersection, lineToExtend.start);
  const distToEnd = pointDistance(intersection, lineToExtend.end);
  const lineLength = pointDistance(lineToExtend.start, lineToExtend.end);
  
  // Determine which end to extend
  const extendStart = distToStart > lineLength;
  const extendEnd = distToEnd > lineLength;
  
  if (!extendStart && !extendEnd) {
    // Intersection is within line, no extension needed
    return { trimmed: false, newGeometry: null };
  }
  
  const extendedLine: Line = {
    ...lineToExtend,
    start: extendStart ? intersection : lineToExtend.start,
    end: extendEnd ? intersection : lineToExtend.end
  };
  
  return {
    trimmed: true,
    newGeometry: extendedLine,
    intersectionPoint: intersection
  };
}

/**
 * Trim a line to intersection with an arc
 */
export function trimLineToArc(
  lineToTrim: Line,
  cuttingArc: Arc
): TrimResult {
  const intersections = lineArcIntersection(lineToTrim, cuttingArc);
  
  if (intersections.length === 0) {
    return { trimmed: false, newGeometry: null };
  }
  
  // Find closest intersection to line endpoints
  let closestIntersection: Point | null = null;
  let minDist = Infinity;
  
  for (const intersection of intersections) {
    const distToStart = pointDistance(intersection, lineToTrim.start);
    const distToEnd = pointDistance(intersection, lineToTrim.end);
    const minDistToLine = Math.min(distToStart, distToEnd);
    
    if (minDistToLine < minDist) {
      minDist = minDistToLine;
      closestIntersection = intersection;
    }
  }
  
  if (!closestIntersection) {
    return { trimmed: false, newGeometry: null };
  }
  
  const distToStart = pointDistance(closestIntersection, lineToTrim.start);
  const distToEnd = pointDistance(closestIntersection, lineToTrim.end);
  
  const trimmedLine: Line = {
    ...lineToTrim,
    end: distToStart < distToEnd ? closestIntersection : lineToTrim.end,
    start: distToStart < distToEnd ? lineToTrim.start : closestIntersection
  };
  
  return {
    trimmed: true,
    newGeometry: trimmedLine,
    intersectionPoint: closestIntersection
  };
}

/**
 * Extend a line to intersection with an arc
 */
export function extendLineToArc(
  lineToExtend: Line,
  targetArc: Arc
): TrimResult {
  const intersections = lineArcIntersection(lineToExtend, targetArc);
  
  if (intersections.length === 0) {
    return { trimmed: false, newGeometry: null };
  }
  
  // Find intersection that extends the line (beyond endpoints)
  const lineLength = pointDistance(lineToExtend.start, lineToExtend.end);
  
  for (const intersection of intersections) {
    const distToStart = pointDistance(intersection, lineToExtend.start);
    const distToEnd = pointDistance(intersection, lineToExtend.end);
    
    const extendStart = distToStart > lineLength * 1.1; // 10% tolerance
    const extendEnd = distToEnd > lineLength * 1.1;
    
    if (extendStart || extendEnd) {
      const extendedLine: Line = {
        ...lineToExtend,
        start: extendStart ? intersection : lineToExtend.start,
        end: extendEnd ? intersection : lineToExtend.end
      };
      
      return {
        trimmed: true,
        newGeometry: extendedLine,
        intersectionPoint: intersection
      };
    }
  }
  
  return { trimmed: false, newGeometry: null };
}

/**
 * Trim multiple lines to their intersections
 */
export function trimMultipleLines(
  lines: Line[],
  options: {
    trimToFirst?: boolean; // Trim to first intersection found
    trimToAll?: boolean; // Trim to all intersections
  } = {}
): Line[] {
  const trimmedLines: Line[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let currentLine = lines[i];
    let _trimmed = false;
    
    // Check intersections with all other lines
    for (let j = 0; j < lines.length; j++) {
      if (i === j) continue;
      
      const result = trimLineToLine(currentLine, lines[j]);
      if (result.trimmed && result.newGeometry) {
        currentLine = result.newGeometry as Line;
        _trimmed = true;
        
        if (options.trimToFirst) {
          break;
        }
      }
    }
    
    trimmedLines.push(currentLine);
  }
  
  return trimmedLines;
}

/**
 * Find all intersection points in geometry
 */
export function findAllIntersections(geometry: Geometry2D): Point[] {
  const intersections: Point[] = [];
  const seen = new Set<string>();
  
  // Line-line intersections
  for (let i = 0; i < geometry.lines.length; i++) {
    for (let j = i + 1; j < geometry.lines.length; j++) {
      const intersection = lineLineIntersection(geometry.lines[i], geometry.lines[j]);
      if (intersection) {
        const key = `${intersection.x.toFixed(2)},${intersection.y.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          intersections.push(intersection);
        }
      }
    }
  }
  
  // Line-arc intersections
  for (const line of geometry.lines) {
    for (const arc of geometry.arcs) {
      const arcIntersections = lineArcIntersection(line, arc);
      for (const intersection of arcIntersections) {
        const key = `${intersection.x.toFixed(2)},${intersection.y.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          intersections.push(intersection);
        }
      }
    }
  }
  
  // Arc-arc intersections
  for (let i = 0; i < geometry.arcs.length; i++) {
    for (let j = i + 1; j < geometry.arcs.length; j++) {
      const arcIntersections = arcArcIntersection(geometry.arcs[i], geometry.arcs[j]);
      for (const intersection of arcIntersections) {
        const key = `${intersection.x.toFixed(2)},${intersection.y.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          intersections.push(intersection);
        }
      }
    }
  }
  
  return intersections;
}

