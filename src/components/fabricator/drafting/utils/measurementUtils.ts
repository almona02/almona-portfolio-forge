// src/components/fabricator/drafting/utils/measurementUtils.ts

/**
 * Enhanced Measurement Utilities
 * Provides smart dimension calculations with auto-labeling
 */

import type { Circle, Geometry2D, Point, Polygon, Rectangle } from '../types/drafting';

export type MeasurementMode = 'distance' | 'angle' | 'area' | 'perimeter' | 'radius';

export interface MeasurementResult {
  value: number;
  label: string;
  unit: string;
  precision: number;
  formatted: string;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(start: Point, end: Point): number {
  return Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );
}

/**
 * Calculate angle between two points (in degrees)
 */
export function calculateAngle(start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;
  return angleDeg < 0 ? angleDeg + 360 : angleDeg;
}

/**
 * Calculate area of a rectangle
 */
export function calculateRectangleArea(rect: Rectangle): number {
  return rect.width * rect.height;
}

/**
 * Calculate area of a circle
 */
export function calculateCircleArea(circle: Circle): number {
  return Math.PI * circle.r * circle.r;
}

/**
 * Calculate area of a polygon using shoelace formula
 */
export function calculatePolygonArea(polygon: Polygon): number {
  if (polygon.points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < polygon.points.length; i++) {
    const j = (i + 1) % polygon.points.length;
    area += polygon.points[i].x * polygon.points[j].y;
    area -= polygon.points[j].x * polygon.points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calculate perimeter of a rectangle
 */
export function calculateRectanglePerimeter(rect: Rectangle): number {
  return 2 * (rect.width + rect.height);
}

/**
 * Calculate perimeter of a circle
 */
export function calculateCirclePerimeter(circle: Circle): number {
  return 2 * Math.PI * circle.r;
}

/**
 * Calculate perimeter of a polygon
 */
export function calculatePolygonPerimeter(polygon: Polygon): number {
  if (polygon.points.length < 2) return 0;
  
  let perimeter = 0;
  for (let i = 0; i < polygon.points.length; i++) {
    const j = (i + 1) % polygon.points.length;
    perimeter += calculateDistance(polygon.points[i], polygon.points[j]);
  }
  return perimeter;
}

/**
 * Auto-format measurement value with appropriate precision and units
 */
export function formatMeasurement(
  value: number,
  mode: MeasurementMode,
  unit: 'mm' | 'cm' | 'm' | '°' | 'm²' = 'mm'
): MeasurementResult {
  let precision = 0;
  let displayValue = value;
  let displayUnit = unit;
  let label = '';

  // Convert to appropriate unit for display
  if (unit === 'mm') {
    if (value >= 1000) {
      displayValue = value / 1000;
      displayUnit = 'm';
      precision = value >= 10000 ? 1 : 2;
    } else if (value >= 100) {
      displayValue = value / 10;
      displayUnit = 'cm';
      precision = 1;
    } else {
      precision = value >= 10 ? 0 : 1;
    }
  } else if (unit === 'cm') {
    if (value >= 100) {
      displayValue = value / 100;
      displayUnit = 'm';
      precision = 2;
    } else {
      precision = value >= 10 ? 0 : 1;
    }
  } else {
    precision = 2;
  }

  // Generate label based on mode
  switch (mode) {
    case 'distance':
      label = 'Distance';
      break;
    case 'angle':
      label = 'Angle';
      displayUnit = '°';
      precision = 1;
      break;
    case 'area':
      label = 'Area';
      if (displayUnit === 'mm') {
        displayValue = value / 1_000_000; // Convert to m²
        displayUnit = 'm²';
        precision = 2;
      } else if (displayUnit === 'cm') {
        displayValue = value / 10_000; // Convert to m²
        displayUnit = 'm²';
        precision = 2;
      } else {
        displayUnit = 'm²';
        precision = 2;
      }
      break;
    case 'perimeter':
      label = 'Perimeter';
      break;
    case 'radius':
      label = 'Radius';
      break;
  }

  const formatted = `${displayValue.toFixed(precision)} ${displayUnit}`;

  return {
    value,
    label,
    unit: displayUnit,
    precision,
    formatted
  };
}

/**
 * Smart measurement calculation based on mode
 */
export function calculateMeasurement(
  start: Point,
  end: Point,
  mode: MeasurementMode,
  geometry?: Geometry2D
): MeasurementResult {
  switch (mode) {
    case 'distance':
      const distance = calculateDistance(start, end);
      return formatMeasurement(distance, 'distance');

    case 'angle':
      const angle = calculateAngle(start, end);
      return formatMeasurement(angle, 'angle');

    case 'area':
      // Calculate area of selected geometry or bounding box
      if (geometry) {
        let totalArea = 0;
        
        geometry.rectangles.forEach(rect => {
          totalArea += calculateRectangleArea(rect);
        });
        
        geometry.circles.forEach(circle => {
          totalArea += calculateCircleArea(circle);
        });
        
        geometry.polygons.forEach(polygon => {
          totalArea += calculatePolygonArea(polygon);
        });
        
        if (totalArea > 0) {
          return formatMeasurement(totalArea, 'area');
        }
      }
      
      // Fallback to bounding box area
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      const area = width * height;
      return formatMeasurement(area, 'area');

    case 'perimeter':
      if (geometry) {
        let totalPerimeter = 0;
        
        geometry.rectangles.forEach(rect => {
          totalPerimeter += calculateRectanglePerimeter(rect);
        });
        
        geometry.circles.forEach(circle => {
          totalPerimeter += calculateCirclePerimeter(circle);
        });
        
        geometry.polygons.forEach(polygon => {
          totalPerimeter += calculatePolygonPerimeter(polygon);
        });
        
        if (totalPerimeter > 0) {
          return formatMeasurement(totalPerimeter, 'perimeter');
        }
      }
      
      // Fallback to bounding box perimeter
      const perimWidth = Math.abs(end.x - start.x);
      const perimHeight = Math.abs(end.y - start.y);
      const perimeter = 2 * (perimWidth + perimHeight);
      return formatMeasurement(perimeter, 'perimeter');

    case 'radius':
      const radius = calculateDistance(start, end);
      return formatMeasurement(radius, 'radius');

    default:
      const dist = calculateDistance(start, end);
      return formatMeasurement(dist, 'distance');
  }
}

/**
 * Get measurement label with smart formatting
 */
export function getMeasurementLabel(
  start: Point,
  end: Point,
  mode: MeasurementMode,
  geometry?: Geometry2D
): string {
  const result = calculateMeasurement(start, end, mode, geometry);
  return `${result.label}: ${result.formatted}`;
}

/**
 * Auto-detect measurement mode based on geometry
 */
export function detectMeasurementMode(
  start: Point,
  end: Point,
  geometry: Geometry2D
): MeasurementMode {
  // If clicking on a circle, suggest radius mode
  const clickedCircle = geometry.circles.find(circle => {
    const dist = calculateDistance(start, { x: circle.cx, y: circle.cy });
    return dist < circle.r + 10;
  });
  
  if (clickedCircle) {
    return 'radius';
  }
  
  // If clicking on a polygon, suggest area mode
  const clickedPolygon = geometry.polygons.find(polygon => {
    // Simple point-in-polygon check (ray casting)
    let inside = false;
    for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
      const xi = polygon.points[i].x;
      const yi = polygon.points[i].y;
      const xj = polygon.points[j].x;
      const yj = polygon.points[j].y;
      
      const intersect = ((yi > start.y) !== (yj > start.y)) &&
        (start.x < (xj - xi) * (start.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  });
  
  if (clickedPolygon) {
    return 'area';
  }
  
  // Default to distance
  return 'distance';
}

