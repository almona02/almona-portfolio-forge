/**
 * Viewport Utilities
 * 
 * Gold-tier viewport management for zoom, pan, and viewport controls.
 * Provides precise viewport calculations with validation.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

import type { Geometry2D, Point, Rectangle, Viewport } from '../types/drafting';
import { SAFETY_LIMITS, validatePoint } from './inputValidator';

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Default viewport settings
 */
export const DEFAULT_VIEWPORT: Viewport = {
  centerX: 5000,
  centerY: 5000,
  zoom: 0.1,
  width: 10000,
  height: 10000
};

/**
 * Validate and sanitize viewport (Phase 3: Code Hardening)
 * Ensures all viewport values are finite and within safe bounds
 */
export function validateViewport(viewport: Viewport): Viewport {
  // Validate and clamp center coordinates
  const centerX = isFinite(viewport.centerX)
    ? Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, viewport.centerX))
    : DEFAULT_VIEWPORT.centerX;
  
  const centerY = isFinite(viewport.centerY)
    ? Math.max(SAFETY_LIMITS.MIN_COORDINATE, Math.min(SAFETY_LIMITS.MAX_COORDINATE, viewport.centerY))
    : DEFAULT_VIEWPORT.centerY;
  
  // Validate and clamp zoom
  const zoom = isFinite(viewport.zoom) && viewport.zoom > 0
    ? Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, viewport.zoom))
    : DEFAULT_VIEWPORT.zoom;
  
  // Validate and clamp dimensions
  const width = isFinite(viewport.width) && viewport.width > 0
    ? Math.max(100, Math.min(SAFETY_LIMITS.MAX_DIMENSION, viewport.width))
    : DEFAULT_VIEWPORT.width;
  
  const height = isFinite(viewport.height) && viewport.height > 0
    ? Math.max(100, Math.min(SAFETY_LIMITS.MAX_DIMENSION, viewport.height))
    : DEFAULT_VIEWPORT.height;
  
  return {
    centerX,
    centerY,
    zoom,
    width,
    height
  };
}

/**
 * Zoom limits (gold-tier accuracy)
 */
export const ZOOM_LIMITS = {
  MIN: 0.01,  // 1% - can zoom out very far
  MAX: 100,   // 10000% - can zoom in very close
  STEP: 0.1,  // 10% zoom steps
  WHEEL_STEP: 0.1 // 10% per wheel tick
};

/**
 * Calculate viewport bounds from viewport
 */
export function getViewportBounds(viewport: Viewport): ViewportBounds {
  const halfWidth = viewport.width / (2 * viewport.zoom);
  const halfHeight = viewport.height / (2 * viewport.zoom);
  
  return {
    minX: viewport.centerX - halfWidth,
    minY: viewport.centerY - halfHeight,
    maxX: viewport.centerX + halfWidth,
    maxY: viewport.centerY + halfHeight
  };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
): Point {
  const bounds = getViewportBounds(viewport);
  
  const worldX = bounds.minX + (screenX / canvasWidth) * (bounds.maxX - bounds.minX);
  const worldY = bounds.minY + (screenY / canvasHeight) * (bounds.maxY - bounds.minY);
  
  return validatePoint({ x: worldX, y: worldY });
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
): Point {
  const bounds = getViewportBounds(viewport);
  
  const screenX = ((worldX - bounds.minX) / (bounds.maxX - bounds.minX)) * canvasWidth;
  const screenY = ((worldY - bounds.minY) / (bounds.maxY - bounds.minY)) * canvasHeight;
  
  return { x: screenX, y: screenY };
}

/**
 * Zoom viewport at a specific point
 */
export function zoomAtPoint(
  viewport: Viewport,
  screenPoint: Point,
  zoomDelta: number,
  canvasWidth: number,
  canvasHeight: number
): Viewport {
  // Calculate world point before zoom
  const worldPoint = screenToWorld(screenPoint.x, screenPoint.y, viewport, canvasWidth, canvasHeight);
  
  // Calculate new zoom (clamped to limits)
  const newZoom = Math.max(
    ZOOM_LIMITS.MIN,
    Math.min(ZOOM_LIMITS.MAX, viewport.zoom * (1 + zoomDelta))
  );
  
  // If zoom didn't change, return original viewport
  if (Math.abs(newZoom - viewport.zoom) < 0.001) {
    return viewport;
  }
  
  // Calculate new center to keep world point at same screen position
  const zoomRatio = newZoom / viewport.zoom;
  const newCenterX = worldPoint.x - (worldPoint.x - viewport.centerX) * zoomRatio;
  const newCenterY = worldPoint.y - (worldPoint.y - viewport.centerY) * zoomRatio;
  
  return {
    ...viewport,
    zoom: newZoom,
    centerX: newCenterX,
    centerY: newCenterY
  };
}

/**
 * Pan viewport by screen delta
 */
export function panViewport(
  viewport: Viewport,
  screenDeltaX: number,
  screenDeltaY: number,
  canvasWidth: number,
  canvasHeight: number
): Viewport {
  const bounds = getViewportBounds(viewport);
  const worldDeltaX = (screenDeltaX / canvasWidth) * (bounds.maxX - bounds.minX);
  const worldDeltaY = (screenDeltaY / canvasHeight) * (bounds.maxY - bounds.minY);
  
  return {
    ...viewport,
    centerX: viewport.centerX - worldDeltaX,
    centerY: viewport.centerY - worldDeltaY
  };
}

/**
 * Zoom to fit geometry
 */
export function zoomToFit(
  geometry: Geometry2D,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 50
): Viewport {
  // Calculate bounding box of all geometry
  const bounds = getGeometryBounds(geometry);
  
  if (!bounds) {
    // No geometry, return default viewport
    return DEFAULT_VIEWPORT;
  }
  
  // Add padding
  const paddedMinX = bounds.minX - padding;
  const paddedMinY = bounds.minY - padding;
  const paddedMaxX = bounds.maxX + padding;
  const paddedMaxY = bounds.maxY + padding;
  
  const geometryWidth = paddedMaxX - paddedMinX;
  const geometryHeight = paddedMaxY - paddedMinY;
  
  // Calculate zoom to fit
  const zoomX = canvasWidth / geometryWidth;
  const zoomY = canvasHeight / geometryHeight;
  const zoom = Math.min(zoomX, zoomY) * 0.95; // 95% to add some margin
  
  // Clamp zoom to limits
  const clampedZoom = Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, zoom));
  
  // Calculate center
  const centerX = (paddedMinX + paddedMaxX) / 2;
  const centerY = (paddedMinY + paddedMaxY) / 2;
  
  return {
    centerX,
    centerY,
    zoom: clampedZoom,
    width: canvasWidth,
    height: canvasHeight
  };
}

/**
 * Zoom to selection (rectangle bounds)
 */
export function zoomToSelection(
  selection: Rectangle,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 50
): Viewport {
  const paddedMinX = selection.x - padding;
  const paddedMinY = selection.y - padding;
  const paddedMaxX = selection.x + selection.width + padding;
  const paddedMaxY = selection.y + selection.height + padding;
  
  const selectionWidth = paddedMaxX - paddedMinX;
  const selectionHeight = paddedMaxY - paddedMinY;
  
  // Calculate zoom to fit
  const zoomX = canvasWidth / selectionWidth;
  const zoomY = canvasHeight / selectionHeight;
  const zoom = Math.min(zoomX, zoomY) * 0.95; // 95% to add some margin
  
  // Clamp zoom to limits
  const clampedZoom = Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, zoom));
  
  // Calculate center
  const centerX = (paddedMinX + paddedMaxX) / 2;
  const centerY = (paddedMinY + paddedMaxY) / 2;
  
  return {
    centerX,
    centerY,
    zoom: clampedZoom,
    width: canvasWidth,
    height: canvasHeight
  };
}

/**
 * Get bounding box of all geometry
 */
export function getGeometryBounds(geometry: Geometry2D): ViewportBounds | null {
  const allPoints: Point[] = [];
  
  // Collect all points from rectangles
  geometry.rectangles.forEach(rect => {
    allPoints.push({ x: rect.x, y: rect.y });
    allPoints.push({ x: rect.x + rect.width, y: rect.y });
    allPoints.push({ x: rect.x, y: rect.y + rect.height });
    allPoints.push({ x: rect.x + rect.width, y: rect.y + rect.height });
  });
  
  // Collect all points from circles
  geometry.circles.forEach(circle => {
    allPoints.push({ x: circle.cx - circle.r, y: circle.cy - circle.r });
    allPoints.push({ x: circle.cx + circle.r, y: circle.cy + circle.r });
  });
  
  // Collect all points from lines
  geometry.lines.forEach(line => {
    allPoints.push(line.start);
    allPoints.push(line.end);
  });
  
  // Collect all points from arcs
  geometry.arcs.forEach(arc => {
    // Approximate arc bounds (simplified - could be more precise)
    allPoints.push({ x: arc.cx - arc.r, y: arc.cy - arc.r });
    allPoints.push({ x: arc.cx + arc.r, y: arc.cy + arc.r });
  });
  
  // Collect all points from polygons
  geometry.polygons.forEach(polygon => {
    allPoints.push(...polygon.points);
  });
  
  if (allPoints.length === 0) {
    return null;
  }
  
  const minX = Math.min(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  return { minX, minY, maxX, maxY };
}

/**
 * Reset viewport to default
 */
export function resetViewport(canvasWidth: number, canvasHeight: number): Viewport {
  return {
    ...DEFAULT_VIEWPORT,
    width: canvasWidth,
    height: canvasHeight
  };
}

/**
 * Zoom in by step
 */
export function zoomIn(viewport: Viewport): Viewport {
  const newZoom = Math.min(ZOOM_LIMITS.MAX, viewport.zoom * (1 + ZOOM_LIMITS.STEP));
  return {
    ...viewport,
    zoom: newZoom
  };
}

/**
 * Zoom out by step
 */
export function zoomOut(viewport: Viewport): Viewport {
  const newZoom = Math.max(ZOOM_LIMITS.MIN, viewport.zoom / (1 + ZOOM_LIMITS.STEP));
  return {
    ...viewport,
    zoom: newZoom
  };
}

/**
 * Set zoom level (clamped to limits)
 */
export function setZoom(viewport: Viewport, zoom: number): Viewport {
  const clampedZoom = Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, zoom));
  return {
    ...viewport,
    zoom: clampedZoom
  };
}

/**
 * Get zoom percentage for display
 */
export function getZoomPercentage(viewport: Viewport): number {
  return Math.round(viewport.zoom * 100);
}

/**
 * Format zoom level for display
 */
export function formatZoomLevel(viewport: Viewport): string {
  const percentage = getZoomPercentage(viewport);
  return `${percentage}%`;
}

/**
 * Viewport presets
 */
export function getViewportPreset(
  preset: 'fit' | '1:1' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  geometry: Geometry2D,
  canvasWidth: number,
  canvasHeight: number,
  currentViewport?: Viewport
): Viewport {
  switch (preset) {
    case 'fit':
      return zoomToFit(geometry, canvasWidth, canvasHeight);
      
    case '1:1':
      // 1:1 scale (100% zoom) at center
      return {
        centerX: currentViewport?.centerX || 5000,
        centerY: currentViewport?.centerY || 5000,
        zoom: 1.0,
        width: canvasWidth,
        height: canvasHeight
      };
      
    case 'center':
      // Center viewport at origin or geometry center
      const bounds = getGeometryBounds(geometry);
      if (bounds) {
        return {
          centerX: (bounds.minX + bounds.maxX) / 2,
          centerY: (bounds.minY + bounds.maxY) / 2,
          zoom: currentViewport?.zoom || 1.0,
          width: canvasWidth,
          height: canvasHeight
        };
      }
      return {
        centerX: 5000,
        centerY: 5000,
        zoom: currentViewport?.zoom || 1.0,
        width: canvasWidth,
        height: canvasHeight
      };
      
    case 'top-left':
      // Top-left corner
      const topLeftBounds = getGeometryBounds(geometry);
      if (topLeftBounds) {
        return {
          centerX: topLeftBounds.minX + (canvasWidth / (2 * (currentViewport?.zoom || 1.0))),
          centerY: topLeftBounds.minY + (canvasHeight / (2 * (currentViewport?.zoom || 1.0))),
          zoom: currentViewport?.zoom || 1.0,
          width: canvasWidth,
          height: canvasHeight
        };
      }
      return currentViewport || DEFAULT_VIEWPORT;
      
    case 'top-right':
      // Top-right corner
      const topRightBounds = getGeometryBounds(geometry);
      if (topRightBounds) {
        return {
          centerX: topRightBounds.maxX - (canvasWidth / (2 * (currentViewport?.zoom || 1.0))),
          centerY: topRightBounds.minY + (canvasHeight / (2 * (currentViewport?.zoom || 1.0))),
          zoom: currentViewport?.zoom || 1.0,
          width: canvasWidth,
          height: canvasHeight
        };
      }
      return currentViewport || DEFAULT_VIEWPORT;
      
    case 'bottom-left':
      // Bottom-left corner
      const bottomLeftBounds = getGeometryBounds(geometry);
      if (bottomLeftBounds) {
        return {
          centerX: bottomLeftBounds.minX + (canvasWidth / (2 * (currentViewport?.zoom || 1.0))),
          centerY: bottomLeftBounds.maxY - (canvasHeight / (2 * (currentViewport?.zoom || 1.0))),
          zoom: currentViewport?.zoom || 1.0,
          width: canvasWidth,
          height: canvasHeight
        };
      }
      return currentViewport || DEFAULT_VIEWPORT;
      
    case 'bottom-right':
      // Bottom-right corner
      const bottomRightBounds = getGeometryBounds(geometry);
      if (bottomRightBounds) {
        return {
          centerX: bottomRightBounds.maxX - (canvasWidth / (2 * (currentViewport?.zoom || 1.0))),
          centerY: bottomRightBounds.maxY - (canvasHeight / (2 * (currentViewport?.zoom || 1.0))),
          zoom: currentViewport?.zoom || 1.0,
          width: canvasWidth,
          height: canvasHeight
        };
      }
      return currentViewport || DEFAULT_VIEWPORT;
      
    default:
      return currentViewport || DEFAULT_VIEWPORT;
  }
}

