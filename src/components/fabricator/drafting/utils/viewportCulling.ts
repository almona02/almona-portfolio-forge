// src/components/fabricator/drafting/utils/viewportCulling.ts

/**
 * Viewport Culling Utilities
 * 
 * Gold-tier viewport culling for canvas rendering optimization.
 * Filters geometry elements to only render those visible in the viewport,
 * dramatically improving performance for large drawings.
 * 
 * Precision: Uses 0.01mm precision for intersection calculations
 */

import type { Arc, Circle, Geometry2D, Line, Point, Polygon, Rectangle, Spline } from '../types/drafting';
import type { ViewportBounds } from './viewportUtils';
import { normalizeCoordinate } from './precisionUtils';

/**
 * Check if a rectangle intersects viewport bounds
 * Precision: Uses normalized coordinates for accurate intersection detection
 */
export function rectangleIntersectsViewport(
  rect: Rectangle,
  bounds: ViewportBounds
): boolean {
  const rectRight = normalizeCoordinate(rect.x + rect.width);
  const rectBottom = normalizeCoordinate(rect.y + rect.height);
  const rectLeft = normalizeCoordinate(rect.x);
  const rectTop = normalizeCoordinate(rect.y);

  // AABB (Axis-Aligned Bounding Box) intersection test
  return !(
    rectRight < bounds.minX ||
    rectLeft > bounds.maxX ||
    rectBottom < bounds.minY ||
    rectTop > bounds.maxY
  );
}

/**
 * Check if a circle intersects viewport bounds
 * Precision: Uses normalized coordinates
 */
export function circleIntersectsViewport(
  circle: Circle,
  bounds: ViewportBounds
): boolean {
  // Find closest point on viewport to circle center
  const closestX = Math.max(bounds.minX, Math.min(bounds.maxX, normalizeCoordinate(circle.cx)));
  const closestY = Math.max(bounds.minY, Math.min(bounds.maxY, normalizeCoordinate(circle.cy)));

  // Calculate distance from closest point to circle center
  const dx = normalizeCoordinate(circle.cx - closestX);
  const dy = normalizeCoordinate(circle.cy - closestY);
  const distanceSquared = dx * dx + dy * dy;
  const radiusSquared = normalizeCoordinate(circle.r) * normalizeCoordinate(circle.r);

  // Circle intersects if distance is less than radius
  return distanceSquared <= radiusSquared;
}

/**
 * Check if a line intersects viewport bounds
 * Precision: Uses normalized coordinates
 */
export function lineIntersectsViewport(
  line: Line,
  bounds: ViewportBounds
): boolean {
  // Fast rejection: if both endpoints are outside on the same side, line doesn't intersect
  const startX = normalizeCoordinate(line.start.x);
  const startY = normalizeCoordinate(line.start.y);
  const endX = normalizeCoordinate(line.end.x);
  const endY = normalizeCoordinate(line.end.y);

  // Check if line is completely outside viewport
  if (
    (startX < bounds.minX && endX < bounds.minX) ||
    (startX > bounds.maxX && endX > bounds.maxX) ||
    (startY < bounds.minY && endY < bounds.minY) ||
    (startY > bounds.maxY && endY > bounds.maxY)
  ) {
    return false;
  }

  // If either endpoint is inside, line intersects
  if (
    (startX >= bounds.minX && startX <= bounds.maxX && startY >= bounds.minY && startY <= bounds.maxY) ||
    (endX >= bounds.minX && endX <= bounds.maxX && endY >= bounds.minY && endY <= bounds.maxY)
  ) {
    return true;
  }

  // Use Liang-Barsky line clipping algorithm for precise intersection
  // Simplified: check if line intersects any viewport edge
  return lineSegmentIntersectsAABB(
    { x: startX, y: startY },
    { x: endX, y: endY },
    bounds
  );
}

/**
 * Check if a line segment intersects an axis-aligned bounding box
 * Precision: Uses normalized coordinates
 */
function lineSegmentIntersectsAABB(
  p1: Point,
  p2: Point,
  bounds: ViewportBounds
): boolean {
  // Cohen-Sutherland line clipping algorithm (simplified)
  const computeOutCode = (x: number, y: number): number => {
    let code = 0;
    if (x < bounds.minX) code |= 1; // Left
    if (x > bounds.maxX) code |= 2; // Right
    if (y < bounds.minY) code |= 4; // Bottom
    if (y > bounds.maxY) code |= 8; // Top
    return code;
  };

  const outcode0 = computeOutCode(p1.x, p1.y);
  const outcode1 = computeOutCode(p2.x, p2.y);

  // Trivially accept: both endpoints inside
  if (outcode0 === 0 && outcode1 === 0) return true;

  // Trivially reject: both endpoints on same side
  if ((outcode0 & outcode1) !== 0) return false;

  // Line may intersect - simplified check (for performance, accept if not trivially rejected)
  return true;
}

/**
 * Check if an arc intersects viewport bounds
 * Precision: Uses normalized coordinates
 */
export function arcIntersectsViewport(
  arc: Arc,
  bounds: ViewportBounds
): boolean {
  // Use bounding box of arc for culling (more conservative but faster)
  // Full arc intersection would require more complex calculations
  const arcLeft = normalizeCoordinate(arc.cx - arc.r);
  const arcRight = normalizeCoordinate(arc.cx + arc.r);
  const arcBottom = normalizeCoordinate(arc.cy - arc.r);
  const arcTop = normalizeCoordinate(arc.cy + arc.r);

  return !(
    arcRight < bounds.minX ||
    arcLeft > bounds.maxX ||
    arcBottom < bounds.minY ||
    arcTop > bounds.maxY
  );
}

/**
 * Check if a polygon intersects viewport bounds
 * Precision: Uses normalized coordinates
 */
export function polygonIntersectsViewport(
  polygon: Polygon,
  bounds: ViewportBounds
): boolean {
  if (!polygon.points || polygon.points.length === 0) return false;

  // Fast rejection: check if polygon bounding box intersects viewport
  const xs = polygon.points.map(p => normalizeCoordinate(p.x));
  const ys = polygon.points.map(p => normalizeCoordinate(p.y));
  const polyMinX = Math.min(...xs);
  const polyMaxX = Math.max(...xs);
  const polyMinY = Math.min(...ys);
  const polyMaxY = Math.max(...ys);

  if (
    polyMaxX < bounds.minX ||
    polyMinX > bounds.maxX ||
    polyMaxY < bounds.minY ||
    polyMinY > bounds.maxY
  ) {
    return false;
  }

  // If any point is inside viewport, polygon intersects
  for (const point of polygon.points) {
    const x = normalizeCoordinate(point.x);
    const y = normalizeCoordinate(point.y);
    if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
      return true;
    }
  }

  // Check if any polygon edge intersects viewport
  for (let i = 0; i < polygon.points.length; i++) {
    const p1 = polygon.points[i];
    const p2 = polygon.points[(i + 1) % polygon.points.length];
    if (lineSegmentIntersectsAABB(
      { x: normalizeCoordinate(p1.x), y: normalizeCoordinate(p1.y) },
      { x: normalizeCoordinate(p2.x), y: normalizeCoordinate(p2.y) },
      bounds
    )) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a spline intersects viewport bounds
 * Precision: Uses normalized coordinates
 */
export function splineIntersectsViewport(
  spline: Spline,
  bounds: ViewportBounds
): boolean {
  if (!spline.controlPoints || spline.controlPoints.length === 0) return false;

  // Fast rejection: check bounding box of control points
  const xs = spline.controlPoints.map(p => normalizeCoordinate(p.x));
  const ys = spline.controlPoints.map(p => normalizeCoordinate(p.y));
  const splineMinX = Math.min(...xs);
  const splineMaxX = Math.max(...xs);
  const splineMinY = Math.min(...ys);
  const splineMaxY = Math.max(...ys);

  // Add some padding for spline curves (approximate)
  const padding = 50; // mm
  return !(
    splineMaxX + padding < bounds.minX ||
    splineMinX - padding > bounds.maxX ||
    splineMaxY + padding < bounds.minY ||
    splineMinY - padding > bounds.maxY
  );
}

/**
 * Cull geometry to only include elements visible in viewport
 * Precision: Uses normalized coordinates for all intersection tests
 */
export function cullGeometryToViewport(
  geometry: Geometry2D,
  bounds: ViewportBounds
): Geometry2D {
  return {
    rectangles: geometry.rectangles.filter(rect => rectangleIntersectsViewport(rect, bounds)),
    lines: geometry.lines.filter(line => lineIntersectsViewport(line, bounds)),
    circles: geometry.circles.filter(circle => circleIntersectsViewport(circle, bounds)),
    arcs: geometry.arcs.filter(arc => arcIntersectsViewport(arc, bounds)),
    polygons: geometry.polygons.filter(polygon => polygonIntersectsViewport(polygon, bounds)),
    splines: geometry.splines.filter(spline => splineIntersectsViewport(spline, bounds)),
    points: geometry.points.filter(point => {
      const x = normalizeCoordinate(point.x);
      const y = normalizeCoordinate(point.y);
      return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    })
  };
}
