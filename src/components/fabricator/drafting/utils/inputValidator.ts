// src/components/fabricator/drafting/utils/inputValidator.ts

/**
 * Input Validation & Sanitization
 * Hardens the Design Flow against invalid inputs, malicious data, and edge cases
 */

import type { Arc, Circle, Geometry2D, Line, Point, Polygon, Rectangle, Spline } from '../types/drafting';
import { normalizeCoordinate, roundToPrecision } from './precisionUtils';

// Safety limits
export const SAFETY_LIMITS = {
  MAX_COORDINATE: 1_000_000, // mm (1km)
  MIN_COORDINATE: -1_000_000, // mm
  MAX_DIMENSION: 100_000, // mm (100m)
  MIN_DIMENSION: 0.01, // mm (0.01mm minimum - competitive with fenestration software)
  MAX_RADIUS: 50_000, // mm (50m)
  MIN_RADIUS: 0.01, // mm (0.01mm minimum - competitive with fenestration software)
  MAX_ELEMENTS: 10_000, // Maximum geometry elements
  MAX_AREA: 1_000_000_000, // mm² (1km²)
  MAX_POINTS_PER_POLYGON: 1000,
  MAX_ANGLE: 2 * Math.PI, // Full circle
  MIN_ANGLE: -2 * Math.PI,
  MAX_ROTATION: 360, // degrees
  MIN_ROTATION: 0, // degrees
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate and sanitize a Point
 */
export function validatePoint(point: unknown): Point {
  if (!point || typeof point !== 'object') {
    throw new ValidationError('Point must be an object', 'INVALID_POINT');
  }

  const p = point as any;
  
  if (typeof p.x !== 'number' || !isFinite(p.x)) {
    throw new ValidationError('Point.x must be a finite number', 'INVALID_POINT_X', 'x');
  }
  
  if (typeof p.y !== 'number' || !isFinite(p.y)) {
    throw new ValidationError('Point.y must be a finite number', 'INVALID_POINT_Y', 'y');
  }

  // Bounds checking
  if (p.x > SAFETY_LIMITS.MAX_COORDINATE || p.x < SAFETY_LIMITS.MIN_COORDINATE) {
    throw new ValidationError(
      `Point.x (${p.x}) exceeds safety limits (${SAFETY_LIMITS.MIN_COORDINATE} to ${SAFETY_LIMITS.MAX_COORDINATE})`,
      'COORDINATE_OUT_OF_BOUNDS',
      'x'
    );
  }

  if (p.y > SAFETY_LIMITS.MAX_COORDINATE || p.y < SAFETY_LIMITS.MIN_COORDINATE) {
    throw new ValidationError(
      `Point.y (${p.y}) exceeds safety limits (${SAFETY_LIMITS.MIN_COORDINATE} to ${SAFETY_LIMITS.MAX_COORDINATE})`,
      'COORDINATE_OUT_OF_BOUNDS',
      'y'
    );
  }

  // Sanitize: clamp to safe bounds and normalize to precision
  return {
    x: normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, p.x))),
    y: normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, p.y)))
  };
}

/**
 * Validate and sanitize a Rectangle
 */
export function validateRectangle(rect: unknown): Rectangle {
  if (!rect || typeof rect !== 'object') {
    throw new ValidationError('Rectangle must be an object', 'INVALID_RECTANGLE');
  }

  const r = rect as any;
  
  const x = typeof r.x === 'number' && isFinite(r.x) ? r.x : 0;
  const y = typeof r.y === 'number' && isFinite(r.y) ? r.y : 0;
  const width = typeof r.width === 'number' && isFinite(r.width) ? r.width : 0;
  const height = typeof r.height === 'number' && isFinite(r.height) ? r.height : 0;

  // Validate dimensions
  if (width < SAFETY_LIMITS.MIN_DIMENSION) {
    throw new ValidationError(
      `Rectangle width (${width}mm) is below minimum (${SAFETY_LIMITS.MIN_DIMENSION}mm)`,
      'DIMENSION_TOO_SMALL',
      'width'
    );
  }

  if (height < SAFETY_LIMITS.MIN_DIMENSION) {
    throw new ValidationError(
      `Rectangle height (${height}mm) is below minimum (${SAFETY_LIMITS.MIN_DIMENSION}mm)`,
      'DIMENSION_TOO_SMALL',
      'height'
    );
  }

  if (width > SAFETY_LIMITS.MAX_DIMENSION) {
    throw new ValidationError(
      `Rectangle width (${width}mm) exceeds maximum (${SAFETY_LIMITS.MAX_DIMENSION}mm)`,
      'DIMENSION_TOO_LARGE',
      'width'
    );
  }

  if (height > SAFETY_LIMITS.MAX_DIMENSION) {
    throw new ValidationError(
      `Rectangle height (${height}mm) exceeds maximum (${SAFETY_LIMITS.MAX_DIMENSION}mm)`,
      'DIMENSION_TOO_LARGE',
      'height'
    );
  }

  // Check area
  const area = width * height;
  if (area > SAFETY_LIMITS.MAX_AREA) {
    throw new ValidationError(
      `Rectangle area (${area}mm²) exceeds maximum (${SAFETY_LIMITS.MAX_AREA}mm²)`,
      'AREA_TOO_LARGE'
    );
  }

  // Validate rotation (if provided)
  let rotation = 0;
  if (typeof r.rotation === 'number' && isFinite(r.rotation)) {
    // Normalize rotation to 0-360 range
    rotation = ((r.rotation % 360) + 360) % 360;
  }

  // Sanitize coordinates and normalize to precision
  const sanitizedX = normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, x)));
  const sanitizedY = normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, y)));

  return {
    x: sanitizedX,
    y: sanitizedY,
    width: roundToPrecision(Math.max(SAFETY_LIMITS.MIN_DIMENSION, Math.min(SAFETY_LIMITS.MAX_DIMENSION, width))),
    height: roundToPrecision(Math.max(SAFETY_LIMITS.MIN_DIMENSION, Math.min(SAFETY_LIMITS.MAX_DIMENSION, height))),
    rotation: rotation > 0 ? roundToPrecision(rotation, 0.1) : undefined, // Only include if non-zero, round to 0.1° for display
    type: r.type,
    id: typeof r.id === 'string' ? r.id : undefined,
    layerId: typeof r.layerId === 'string' ? r.layerId : undefined
  };
}

/**
 * Validate and sanitize a Circle
 */
export function validateCircle(circle: unknown): Circle {
  if (!circle || typeof circle !== 'object') {
    throw new ValidationError('Circle must be an object', 'INVALID_CIRCLE');
  }

  const c = circle as any;
  
  const cx = typeof c.cx === 'number' && isFinite(c.cx) ? c.cx : 0;
  const cy = typeof c.cy === 'number' && isFinite(c.cy) ? c.cy : 0;
  const r = typeof c.r === 'number' && isFinite(c.r) ? c.r : 0;

  // Validate radius
  if (r < SAFETY_LIMITS.MIN_RADIUS) {
    throw new ValidationError(
      `Circle radius (${r}mm) is below minimum (${SAFETY_LIMITS.MIN_RADIUS}mm)`,
      'RADIUS_TOO_SMALL',
      'r'
    );
  }

  if (r > SAFETY_LIMITS.MAX_RADIUS) {
    throw new ValidationError(
      `Circle radius (${r}mm) exceeds maximum (${SAFETY_LIMITS.MAX_RADIUS}mm)`,
      'RADIUS_TOO_LARGE',
      'r'
    );
  }

  // Check area
  const area = Math.PI * r * r;
  if (area > SAFETY_LIMITS.MAX_AREA) {
    throw new ValidationError(
      `Circle area (${area}mm²) exceeds maximum (${SAFETY_LIMITS.MAX_AREA}mm²)`,
      'AREA_TOO_LARGE'
    );
  }

  // Sanitize center and normalize to precision
  const sanitizedCx = normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, cx)));
  const sanitizedCy = normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, cy)));

  return {
    cx: sanitizedCx,
    cy: sanitizedCy,
    r: roundToPrecision(Math.max(SAFETY_LIMITS.MIN_RADIUS, Math.min(SAFETY_LIMITS.MAX_RADIUS, r))),
    id: typeof c.id === 'string' ? c.id : undefined
  };
}

/**
 * Validate and sanitize an Arc
 */
export function validateArc(arc: unknown): Arc {
  if (!arc || typeof arc !== 'object') {
    throw new ValidationError('Arc must be an object', 'INVALID_ARC');
  }

  const a = arc as any;
  
  const cx = typeof a.cx === 'number' && isFinite(a.cx) ? a.cx : 0;
  const cy = typeof a.cy === 'number' && isFinite(a.cy) ? a.cy : 0;
  const r = typeof a.r === 'number' && isFinite(a.r) ? a.r : 0;
  const startAngle = typeof a.startAngle === 'number' && isFinite(a.startAngle) ? a.startAngle : 0;
  const endAngle = typeof a.endAngle === 'number' && isFinite(a.endAngle) ? a.endAngle : 0;

  // Validate radius
  if (r < SAFETY_LIMITS.MIN_RADIUS || r > SAFETY_LIMITS.MAX_RADIUS) {
    throw new ValidationError(
      `Arc radius (${r}mm) is out of bounds (${SAFETY_LIMITS.MIN_RADIUS} to ${SAFETY_LIMITS.MAX_RADIUS}mm)`,
      'RADIUS_OUT_OF_BOUNDS',
      'r'
    );
  }

  // Validate angles
  if (startAngle < SAFETY_LIMITS.MIN_ANGLE || startAngle > SAFETY_LIMITS.MAX_ANGLE) {
    throw new ValidationError(
      `Arc startAngle (${startAngle}) is out of bounds`,
      'ANGLE_OUT_OF_BOUNDS',
      'startAngle'
    );
  }

  if (endAngle < SAFETY_LIMITS.MIN_ANGLE || endAngle > SAFETY_LIMITS.MAX_ANGLE) {
    throw new ValidationError(
      `Arc endAngle (${endAngle}) is out of bounds`,
      'ANGLE_OUT_OF_BOUNDS',
      'endAngle'
    );
  }

  // Sanitize center and normalize to precision
  const sanitizedCx = normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, cx)));
  const sanitizedCy = normalizeCoordinate(Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, cy)));

  // Normalize angles to [0, 2π) - maintain full radian precision for calculations
  const normalizedStart = ((startAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  const normalizedEnd = ((endAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

  return {
    cx: sanitizedCx,
    cy: sanitizedCy,
    r: roundToPrecision(Math.max(SAFETY_LIMITS.MIN_RADIUS, Math.min(SAFETY_LIMITS.MAX_RADIUS, r))),
    startAngle: normalizedStart,
    endAngle: normalizedEnd,
    id: typeof a.id === 'string' ? a.id : undefined
  };
}

/**
 * Validate and sanitize a Line
 */
export function validateLine(line: unknown): Line {
  if (!line || typeof line !== 'object') {
    throw new ValidationError('Line must be an object', 'INVALID_LINE');
  }

  const l = line as any;
  
  const start = validatePoint(l.start);
  const end = validatePoint(l.end);

  // Check line length
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length > SAFETY_LIMITS.MAX_DIMENSION) {
    throw new ValidationError(
      `Line length (${length}mm) exceeds maximum (${SAFETY_LIMITS.MAX_DIMENSION}mm)`,
      'LINE_TOO_LONG'
    );
  }

  return {
    start,
    end,
    type: typeof l.type === 'string' ? l.type : 'solid',
    id: typeof l.id === 'string' ? l.id : undefined,
    layerId: typeof l.layerId === 'string' ? l.layerId : undefined
  };
}

/**
 * Validate and sanitize a Polygon
 */
export function validatePolygon(polygon: unknown): Polygon {
  if (!polygon || typeof polygon !== 'object') {
    throw new ValidationError('Polygon must be an object', 'INVALID_POLYGON');
  }

  const p = polygon as any;
  
  if (!Array.isArray(p.points)) {
    throw new ValidationError('Polygon.points must be an array', 'INVALID_POLYGON_POINTS');
  }

  if (p.points.length < 2) {
    throw new ValidationError('Polygon must have at least 2 points', 'POLYGON_TOO_FEW_POINTS');
  }

  if (p.points.length > SAFETY_LIMITS.MAX_POINTS_PER_POLYGON) {
    throw new ValidationError(
      `Polygon has too many points (${p.points.length}, max: ${SAFETY_LIMITS.MAX_POINTS_PER_POLYGON})`,
      'POLYGON_TOO_MANY_POINTS'
    );
  }

  // Validate and sanitize all points
  const sanitizedPoints = p.points.map((point: unknown, index: number) => {
    try {
      return validatePoint(point);
    } catch (error) {
      throw new ValidationError(
        `Polygon point ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INVALID_POLYGON_POINT',
        `points[${index}]`
      );
    }
  });

  // Validate rotation (if provided)
  let rotation = 0;
  if (typeof p.rotation === 'number' && isFinite(p.rotation)) {
    // Normalize rotation to 0-360 range
    rotation = ((p.rotation % 360) + 360) % 360;
  }

  return {
    points: sanitizedPoints,
    closed: typeof p.closed === 'boolean' ? p.closed : false,
    rotation: rotation > 0 ? rotation : undefined, // Only include if non-zero
    id: typeof p.id === 'string' ? p.id : undefined,
    layerId: typeof p.layerId === 'string' ? p.layerId : undefined
  };
}

/**
 * Validate and sanitize a Spline
 */
export function validateSpline(spline: unknown): Spline {
  if (!spline || typeof spline !== 'object') {
    throw new ValidationError('Spline must be an object', 'INVALID_SPLINE');
  }

  const s = spline as any;

  if (!Array.isArray(s.controlPoints)) {
    throw new ValidationError('Spline.controlPoints must be an array', 'INVALID_SPLINE_CONTROL_POINTS');
  }

  if (s.controlPoints.length < 2) {
    throw new ValidationError('Spline must have at least 2 control points', 'SPLINE_TOO_FEW_POINTS');
  }

  if (s.controlPoints.length > SAFETY_LIMITS.MAX_POINTS_PER_POLYGON) {
    throw new ValidationError(
      `Spline has too many control points (${s.controlPoints.length}, max: ${SAFETY_LIMITS.MAX_POINTS_PER_POLYGON})`,
      'SPLINE_TOO_MANY_POINTS'
    );
  }

  // Validate and sanitize all control points
  const sanitizedControlPoints = s.controlPoints.map((point: unknown, index: number) => {
    try {
      return validatePoint(point);
    } catch (error) {
      throw new ValidationError(
        `Spline control point ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INVALID_SPLINE_CONTROL_POINT',
        `controlPoints[${index}]`
      );
    }
  });

  return {
    controlPoints: sanitizedControlPoints,
    closed: typeof s.closed === 'boolean' ? s.closed : false,
    id: typeof s.id === 'string' ? s.id : undefined,
    layerId: typeof s.layerId === 'string' ? s.layerId : undefined
  };
}

/**
 * Validate and sanitize Geometry2D
 */
export function validateGeometry(geometry: unknown): Geometry2D {
  if (!geometry || typeof geometry !== 'object') {
    throw new ValidationError('Geometry must be an object', 'INVALID_GEOMETRY');
  }

  const g = geometry as any;
  
  const result: Geometry2D = {
    rectangles: [],
    points: [],
    lines: [],
    circles: [],
    arcs: [],
    polygons: []
  };

  // Validate rectangles
  if (Array.isArray(g.rectangles)) {
    if (g.rectangles.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many rectangles (${g.rectangles.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'rectangles'
      );
    }
    
    result.rectangles = g.rectangles.map((rect: unknown, index: number) => {
      try {
        return validateRectangle(rect);
      } catch (error) {
        throw new ValidationError(
          `Rectangle ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_RECTANGLE',
          `rectangles[${index}]`
        );
      }
    });
  }

  // Validate circles
  if (Array.isArray(g.circles)) {
    if (g.circles.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many circles (${g.circles.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'circles'
      );
    }
    
    result.circles = g.circles.map((circle: unknown, index: number) => {
      try {
        return validateCircle(circle);
      } catch (error) {
        throw new ValidationError(
          `Circle ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_CIRCLE',
          `circles[${index}]`
        );
      }
    });
  }

  // Validate lines
  if (Array.isArray(g.lines)) {
    if (g.lines.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many lines (${g.lines.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'lines'
      );
    }
    
    result.lines = g.lines.map((line: unknown, index: number) => {
      try {
        return validateLine(line);
      } catch (error) {
        throw new ValidationError(
          `Line ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_LINE',
          `lines[${index}]`
        );
      }
    });
  }

  // Validate arcs
  if (Array.isArray(g.arcs)) {
    if (g.arcs.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many arcs (${g.arcs.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'arcs'
      );
    }
    
    result.arcs = g.arcs.map((arc: unknown, index: number) => {
      try {
        return validateArc(arc);
      } catch (error) {
        throw new ValidationError(
          `Arc ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_ARC',
          `arcs[${index}]`
        );
      }
    });
  }

  // Validate polygons
  if (Array.isArray(g.polygons)) {
    if (g.polygons.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many polygons (${g.polygons.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'polygons'
      );
    }
    
    result.polygons = g.polygons.map((polygon: unknown, index: number) => {
      try {
        return validatePolygon(polygon);
      } catch (error) {
        throw new ValidationError(
          `Polygon ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_POLYGON',
          `polygons[${index}]`
        );
      }
    });
  }

  // Validate splines
  if (Array.isArray(g.splines)) {
    if (g.splines.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many splines (${g.splines.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'splines'
      );
    }

    result.splines = g.splines.map((spline: unknown, index: number) => {
      try {
        return validateSpline(spline);
      } catch (error) {
        throw new ValidationError(
          `Spline ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_SPLINE',
          `splines[${index}]`
        );
      }
    });
  }

  // Validate points
  if (Array.isArray(g.points)) {
    if (g.points.length > SAFETY_LIMITS.MAX_ELEMENTS) {
      throw new ValidationError(
        `Too many points (${g.points.length}, max: ${SAFETY_LIMITS.MAX_ELEMENTS})`,
        'TOO_MANY_ELEMENTS',
        'points'
      );
    }
    
    result.points = g.points.map((point: unknown, index: number) => {
      try {
        return validatePoint(point);
      } catch (error) {
        throw new ValidationError(
          `Point ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_POINT',
          `points[${index}]`
        );
      }
    });
  }

  // Check total element count
  const totalElements = 
    result.rectangles.length +
    result.circles.length +
    result.lines.length +
    result.arcs.length +
    result.polygons.length +
    result.splines.length +
    result.points.length;

  if (totalElements > SAFETY_LIMITS.MAX_ELEMENTS) {
    throw new ValidationError(
      `Total geometry elements (${totalElements}) exceeds maximum (${SAFETY_LIMITS.MAX_ELEMENTS})`,
      'TOO_MANY_TOTAL_ELEMENTS'
    );
  }

  return result;
}

/**
 * Validate a dimension value (width, height, radius, etc.)
 */
export function validateDimension(value: unknown): number {
  if (typeof value === 'number' && isFinite(value)) {
    if (value < SAFETY_LIMITS.MIN_DIMENSION) {
      throw new ValidationError(
        `Dimension (${value}mm) is below minimum (${SAFETY_LIMITS.MIN_DIMENSION}mm)`,
        'DIMENSION_TOO_SMALL'
      );
    }
    if (value > SAFETY_LIMITS.MAX_DIMENSION) {
      throw new ValidationError(
        `Dimension (${value}mm) exceeds maximum (${SAFETY_LIMITS.MAX_DIMENSION}mm)`,
        'DIMENSION_TOO_LARGE'
      );
    }
    // Normalize to standard precision
    return roundToPrecision(value);
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isFinite(parsed)) {
      throw new ValidationError('Dimension must be a valid number', 'INVALID_DIMENSION');
    }
    return validateDimension(parsed);
  }
  
  throw new ValidationError('Dimension must be a number', 'INVALID_DIMENSION');
}

/**
 * Validate a rotation angle in degrees (0-360)
 */
export function validateRotation(value: unknown): number {
  if (typeof value === 'number' && isFinite(value)) {
    // Normalize to 0-360 range
    const normalized = ((value % 360) + 360) % 360;
    return normalized;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isFinite(parsed)) {
      throw new ValidationError('Rotation must be a valid number', 'INVALID_ROTATION');
    }
    return validateRotation(parsed);
  }
  
  throw new ValidationError('Rotation must be a number', 'INVALID_ROTATION');
}

/**
 * Safe number parsing with bounds checking
 */
export function safeParseNumber(value: unknown, defaultValue: number, min?: number, max?: number): number {
  if (typeof value === 'number' && isFinite(value)) {
    let result = value;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isFinite(parsed)) {
      let result = parsed;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      return result;
    }
  }
  
  return defaultValue;
}

/**
 * Safe integer parsing with bounds checking
 */
export function safeParseInt(value: unknown, defaultValue: number, min?: number, max?: number): number {
  if (typeof value === 'number' && isFinite(value)) {
    let result = Math.round(value);
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isFinite(parsed)) {
      let result = parsed;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      return result;
    }
  }
  
  return defaultValue;
}

/**
 * Validate file import (JSON structure)
 */
export function validateDraftingFile(file: unknown): {
  valid: boolean;
  errors: string[];
  data?: any;
} {
  const errors: string[] = [];

  if (!file || typeof file !== 'object') {
    return { valid: false, errors: ['File must be a valid JSON object'] };
  }

  const f = file as any;

  // Check required fields
  if (!f.geometry) {
    errors.push('Missing required field: geometry');
  } else {
    try {
      validateGeometry(f.geometry);
    } catch (error) {
      errors.push(`Invalid geometry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate optional fields
  if (f.dimensions && !Array.isArray(f.dimensions)) {
    errors.push('dimensions must be an array');
  }

  if (f.annotations && !Array.isArray(f.annotations)) {
    errors.push('annotations must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? f : undefined
  };
}

