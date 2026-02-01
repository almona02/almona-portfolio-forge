// src/components/fabricator/drafting/utils/transformUtils.ts

/**
 * Transform Utilities
 * Provides geometric transformation functions for drafting elements
 * All transformations are deterministic and auditable
 */

import type { Point, Rectangle, Circle, Arc, Polygon, Line, Geometry2D } from '../types/drafting';

/**
 * Calculate center point of geometry
 */
export function getGeometryCenter(geometry: Geometry2D): Point {
  if (geometry.rectangles.length === 0 && 
      geometry.circles.length === 0 && 
      geometry.arcs.length === 0 && 
      geometry.polygons.length === 0 &&
      geometry.lines.length === 0) {
    return { x: 0, y: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  // Rectangles
  geometry.rectangles.forEach(rect => {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  });

  // Circles
  geometry.circles.forEach(circle => {
    minX = Math.min(minX, circle.cx - circle.r);
    minY = Math.min(minY, circle.cy - circle.r);
    maxX = Math.max(maxX, circle.cx + circle.r);
    maxY = Math.max(maxY, circle.cy + circle.r);
  });

  // Arcs
  geometry.arcs.forEach(arc => {
    minX = Math.min(minX, arc.cx - arc.r);
    minY = Math.min(minY, arc.cy - arc.r);
    maxX = Math.max(maxX, arc.cx + arc.r);
    maxY = Math.max(maxY, arc.cy + arc.r);
  });

  // Polygons
  geometry.polygons.forEach(polygon => {
    polygon.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  // Lines
  geometry.lines.forEach(line => {
    minX = Math.min(minX, line.start.x, line.end.x);
    minY = Math.min(minY, line.start.y, line.end.y);
    maxX = Math.max(maxX, line.start.x, line.end.x);
    maxY = Math.max(maxY, line.start.y, line.end.y);
  });

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };
}

/**
 * Mirror a point across an axis
 */
function mirrorPoint(point: Point, center: Point, axis: 'horizontal' | 'vertical'): Point {
  if (axis === 'horizontal') {
    return {
      x: 2 * center.x - point.x,
      y: point.y
    };
  } else {
    return {
      x: point.x,
      y: 2 * center.y - point.y
    };
  }
}

/**
 * Rotate a point around a center
 */
function rotatePoint(point: Point, center: Point, angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

/**
 * Scale a point from a center
 */
function scalePoint(point: Point, center: Point, scaleX: number, scaleY: number): Point {
  return {
    x: center.x + (point.x - center.x) * scaleX,
    y: center.y + (point.y - center.y) * scaleY
  };
}

/**
 * Mirror a rectangle
 */
export function mirrorRectangle(rect: Rectangle, center: Point, axis: 'horizontal' | 'vertical'): Rectangle {
  const topLeft = mirrorPoint({ x: rect.x, y: rect.y }, center, axis);
  const bottomRight = mirrorPoint({ x: rect.x + rect.width, y: rect.y + rect.height }, center, axis);
  
  return {
    ...rect,
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y)
  };
}

/**
 * Rotate a rectangle
 */
export function rotateRectangle(rect: Rectangle, center: Point, angle: number): Rectangle {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
  
  const rotatedCorners = corners.map(corner => rotatePoint(corner, center, angle));
  
  const minX = Math.min(...rotatedCorners.map(p => p.x));
  const minY = Math.min(...rotatedCorners.map(p => p.y));
  const maxX = Math.max(...rotatedCorners.map(p => p.x));
  const maxY = Math.max(...rotatedCorners.map(p => p.y));
  
  return {
    ...rect,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Scale a rectangle
 */
export function scaleRectangle(rect: Rectangle, center: Point, scaleX: number, scaleY: number): Rectangle {
  const topLeft = scalePoint({ x: rect.x, y: rect.y }, center, scaleX, scaleY);
  const bottomRight = scalePoint({ x: rect.x + rect.width, y: rect.y + rect.height }, center, scaleX, scaleY);
  
  return {
    ...rect,
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y)
  };
}

/**
 * Mirror a circle
 */
export function mirrorCircle(circle: Circle, center: Point, axis: 'horizontal' | 'vertical'): Circle {
  const mirroredCenter = mirrorPoint({ x: circle.cx, y: circle.cy }, center, axis);
  return {
    ...circle,
    cx: mirroredCenter.x,
    cy: mirroredCenter.y
  };
}

/**
 * Rotate a circle (center rotates, radius stays same)
 */
export function rotateCircle(circle: Circle, center: Point, angle: number): Circle {
  const rotatedCenter = rotatePoint({ x: circle.cx, y: circle.cy }, center, angle);
  return {
    ...circle,
    cx: rotatedCenter.x,
    cy: rotatedCenter.y
  };
}

/**
 * Scale a circle
 */
export function scaleCircle(circle: Circle, center: Point, scaleX: number, scaleY: number): Circle {
  const scaledCenter = scalePoint({ x: circle.cx, y: circle.cy }, center, scaleX, scaleY);
  // For circles, use average of scaleX and scaleY for radius
  const scale = (scaleX + scaleY) / 2;
  return {
    ...circle,
    cx: scaledCenter.x,
    cy: scaledCenter.y,
    r: circle.r * scale
  };
}

/**
 * Mirror a line
 */
export function mirrorLine(line: Line, center: Point, axis: 'horizontal' | 'vertical'): Line {
  return {
    ...line,
    start: mirrorPoint(line.start, center, axis),
    end: mirrorPoint(line.end, center, axis)
  };
}

/**
 * Rotate a line
 */
export function rotateLine(line: Line, center: Point, angle: number): Line {
  return {
    ...line,
    start: rotatePoint(line.start, center, angle),
    end: rotatePoint(line.end, center, angle)
  };
}

/**
 * Scale a line
 */
export function scaleLine(line: Line, center: Point, scaleX: number, scaleY: number): Line {
  return {
    ...line,
    start: scalePoint(line.start, center, scaleX, scaleY),
    end: scalePoint(line.end, center, scaleX, scaleY)
  };
}

/**
 * Mirror an arc
 */
export function mirrorArc(arc: Arc, center: Point, axis: 'horizontal' | 'vertical'): Arc {
  const mirroredCenter = mirrorPoint({ x: arc.cx, y: arc.cy }, center, axis);
  
  // Mirror angles
  let startAngle = arc.startAngle;
  let endAngle = arc.endAngle;
  
  if (axis === 'horizontal') {
    startAngle = Math.PI - startAngle;
    endAngle = Math.PI - endAngle;
  } else {
    startAngle = -startAngle;
    endAngle = -endAngle;
  }
  
  return {
    ...arc,
    cx: mirroredCenter.x,
    cy: mirroredCenter.y,
    startAngle,
    endAngle
  };
}

/**
 * Rotate an arc
 */
export function rotateArc(arc: Arc, center: Point, angle: number): Arc {
  const rotatedCenter = rotatePoint({ x: arc.cx, y: arc.cy }, center, angle);
  const radians = (angle * Math.PI) / 180;
  
  return {
    ...arc,
    cx: rotatedCenter.x,
    cy: rotatedCenter.y,
    startAngle: arc.startAngle + radians,
    endAngle: arc.endAngle + radians
  };
}

/**
 * Scale an arc
 */
export function scaleArc(arc: Arc, center: Point, scaleX: number, scaleY: number): Arc {
  const scaledCenter = scalePoint({ x: arc.cx, y: arc.cy }, center, scaleX, scaleY);
  const scale = (scaleX + scaleY) / 2;
  
  return {
    ...arc,
    cx: scaledCenter.x,
    cy: scaledCenter.y,
    r: arc.r * scale
  };
}

/**
 * Mirror a polygon
 */
export function mirrorPolygon(polygon: Polygon, center: Point, axis: 'horizontal' | 'vertical'): Polygon {
  return {
    ...polygon,
    points: polygon.points.map(point => mirrorPoint(point, center, axis))
  };
}

/**
 * Rotate a polygon
 */
export function rotatePolygon(polygon: Polygon, center: Point, angle: number): Polygon {
  return {
    ...polygon,
    points: polygon.points.map(point => rotatePoint(point, center, angle))
  };
}

/**
 * Scale a polygon
 */
export function scalePolygon(polygon: Polygon, center: Point, scaleX: number, scaleY: number): Polygon {
  return {
    ...polygon,
    points: polygon.points.map(point => scalePoint(point, center, scaleX, scaleY))
  };
}

/**
 * Transform entire geometry
 */
export function transformGeometry(
  geometry: Geometry2D,
  transform: 'mirror' | 'rotate' | 'scale',
  center: Point,
  params: {
    axis?: 'horizontal' | 'vertical';
    angle?: number;
    scaleX?: number;
    scaleY?: number;
  }
): Geometry2D {
  // Defensive checks
  if (!geometry || typeof geometry !== 'object') {
    throw new Error('Geometry is required');
  }

  if (!center || typeof center !== 'object' || typeof center.x !== 'number' || typeof center.y !== 'number') {
    throw new Error('Valid center point is required');
  }

  if (!isFinite(center.x) || !isFinite(center.y)) {
    throw new Error('Center point coordinates must be finite numbers');
  }

  // Validate transform parameters
  if (transform === 'scale') {
    const scaleX = params.scaleX ?? 1;
    const scaleY = params.scaleY ?? scaleX;
    if (!isFinite(scaleX) || !isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
      throw new Error('Scale factors must be positive finite numbers');
    }
    if (scaleX > 100 || scaleY > 100) {
      throw new Error('Scale factors cannot exceed 100x');
    }
  }

  if (transform === 'rotate') {
    const angle = params.angle ?? 0;
    if (!isFinite(angle)) {
      throw new Error('Rotation angle must be a finite number');
    }
  }

  const result: Geometry2D = {
    rectangles: [],
    points: [],
    lines: [],
    circles: [],
    arcs: [],
    polygons: []
  };

  // Transform rectangles
  result.rectangles = geometry.rectangles.map(rect => {
    switch (transform) {
      case 'mirror':
        return mirrorRectangle(rect, center, params.axis || 'horizontal');
      case 'rotate':
        return rotateRectangle(rect, center, params.angle || 0);
      case 'scale':
        return scaleRectangle(rect, center, params.scaleX || 1, params.scaleY || 1);
      default:
        return rect;
    }
  });

  // Transform circles
  result.circles = geometry.circles.map(circle => {
    switch (transform) {
      case 'mirror':
        return mirrorCircle(circle, center, params.axis || 'horizontal');
      case 'rotate':
        return rotateCircle(circle, center, params.angle || 0);
      case 'scale':
        return scaleCircle(circle, center, params.scaleX || 1, params.scaleY || 1);
      default:
        return circle;
    }
  });

  // Transform lines
  result.lines = geometry.lines.map(line => {
    switch (transform) {
      case 'mirror':
        return mirrorLine(line, center, params.axis || 'horizontal');
      case 'rotate':
        return rotateLine(line, center, params.angle || 0);
      case 'scale':
        return scaleLine(line, center, params.scaleX || 1, params.scaleY || 1);
      default:
        return line;
    }
  });

  // Transform arcs
  result.arcs = geometry.arcs.map(arc => {
    switch (transform) {
      case 'mirror':
        return mirrorArc(arc, center, params.axis || 'horizontal');
      case 'rotate':
        return rotateArc(arc, center, params.angle || 0);
      case 'scale':
        return scaleArc(arc, center, params.scaleX || 1, params.scaleY || 1);
      default:
        return arc;
    }
  });

  // Transform polygons
  result.polygons = geometry.polygons.map(polygon => {
    switch (transform) {
      case 'mirror':
        return mirrorPolygon(polygon, center, params.axis || 'horizontal');
      case 'rotate':
        return rotatePolygon(polygon, center, params.angle || 0);
      case 'scale':
        return scalePolygon(polygon, center, params.scaleX || 1, params.scaleY || 1);
      default:
        return polygon;
    }
  });

  return result;
}

