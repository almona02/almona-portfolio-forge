// src/components/fabricator/drafting/utils/performanceUtils.ts

/**
 * Performance Utilities for Drafting Workbench
 * Optimizes rendering and calculations for large geometry sets
 */

import type { Arc, Circle, Geometry2D, Line, Polygon, Rectangle } from '../types/drafting';

/**
 * Viewport culling - only render elements visible in viewport
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if rectangle is visible in viewport
 */
export function isRectangleVisible(rect: Rectangle, viewport: Viewport): boolean {
  return !(
    rect.x + rect.width < viewport.x ||
    rect.x > viewport.x + viewport.width ||
    rect.y + rect.height < viewport.y ||
    rect.y > viewport.y + viewport.height
  );
}

/**
 * Check if circle is visible in viewport
 */
export function isCircleVisible(circle: Circle, viewport: Viewport): boolean {
  const left = circle.cx - circle.r;
  const right = circle.cx + circle.r;
  const top = circle.cy - circle.r;
  const bottom = circle.cy + circle.r;
  
  return !(
    right < viewport.x ||
    left > viewport.x + viewport.width ||
    bottom < viewport.y ||
    top > viewport.y + viewport.height
  );
}

/**
 * Check if line is visible in viewport
 */
export function isLineVisible(line: Line, viewport: Viewport): boolean {
  // Simple bounding box check
  const minX = Math.min(line.start.x, line.end.x);
  const maxX = Math.max(line.start.x, line.end.x);
  const minY = Math.min(line.start.y, line.end.y);
  const maxY = Math.max(line.start.y, line.end.y);
  
  return !(
    maxX < viewport.x ||
    minX > viewport.x + viewport.width ||
    maxY < viewport.y ||
    minY > viewport.y + viewport.height
  );
}

/**
 * Check if arc is visible in viewport
 */
export function isArcVisible(arc: Arc, viewport: Viewport): boolean {
  // Use circle bounding box for simplicity
  return isCircleVisible(
    { cx: arc.cx, cy: arc.cy, r: arc.r },
    viewport
  );
}

/**
 * Check if polygon is visible in viewport
 */
export function isPolygonVisible(polygon: Polygon, viewport: Viewport): boolean {
  if (polygon.points.length === 0) return false;
  
  // Bounding box check
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  polygon.points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  
  return !(
    maxX < viewport.x ||
    minX > viewport.x + viewport.width ||
    maxY < viewport.y ||
    minY > viewport.y + viewport.height
  );
}

/**
 * Filter geometry to only visible elements
 */
export function cullGeometry(geometry: Geometry2D, viewport: Viewport): Geometry2D {
  return {
    rectangles: geometry.rectangles.filter(rect => isRectangleVisible(rect, viewport)),
    circles: geometry.circles.filter(circle => isCircleVisible(circle, viewport)),
    lines: geometry.lines.filter(line => isLineVisible(line, viewport)),
    arcs: geometry.arcs.filter(arc => isArcVisible(arc, viewport)),
    polygons: geometry.polygons.filter(polygon => isPolygonVisible(polygon, viewport)),
    points: geometry.points.filter(point => 
      point.x >= viewport.x &&
      point.x <= viewport.x + viewport.width &&
      point.y >= viewport.y &&
      point.y <= viewport.y + viewport.height
    )
  };
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Calculate viewport from SVG element
 */
export function getSVGViewport(svg: SVGSVGElement): Viewport {
  const _viewBox = svg.viewBox.baseVal;
  const ctm = svg.getScreenCTM();
  
  if (!ctm) {
    return { x: 0, y: 0, width: 10000, height: 10000 };
  }
  
  // Get visible area in SVG coordinates
  const rect = svg.getBoundingClientRect();
  const topLeft = svg.createSVGPoint();
  topLeft.x = 0;
  topLeft.y = 0;
  const topLeftSVG = topLeft.matrixTransform(ctm.inverse());
  
  const bottomRight = svg.createSVGPoint();
  bottomRight.x = rect.width;
  bottomRight.y = rect.height;
  const bottomRightSVG = bottomRight.matrixTransform(ctm.inverse());
  
  return {
    x: Math.min(topLeftSVG.x, bottomRightSVG.x),
    y: Math.min(topLeftSVG.y, bottomRightSVG.y),
    width: Math.abs(bottomRightSVG.x - topLeftSVG.x),
    height: Math.abs(bottomRightSVG.y - topLeftSVG.y)
  };
}

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  ENABLE_CULLING: 100, // Enable viewport culling when element count exceeds this
  DEBOUNCE_MOUSE_MOVE: 16, // ~60fps
  THROTTLE_RENDER: 16, // ~60fps
  MAX_ELEMENTS_FOR_INSTANT: 500, // Below this, render instantly
};

