// src/components/fabricator/drafting/utils/snapUtils.ts
import type { Rectangle, Point } from '../types/drafting';

/**
 * Snap a rectangle to the grid
 * Constitutional: Deterministic, no ML
 */
export function snapToGrid(rect: Rectangle, gridSpacing: number = 5): Rectangle {
  return {
    ...rect,
    x: Math.round(rect.x / gridSpacing) * gridSpacing,
    y: Math.round(rect.y / gridSpacing) * gridSpacing,
    width: Math.round(rect.width / gridSpacing) * gridSpacing,
    height: Math.round(rect.height / gridSpacing) * gridSpacing,
  };
}

/**
 * Snap a point to the grid
 */
export function snapPointToGrid(point: Point, gridSpacing: number = 5): Point {
  return {
    x: Math.round(point.x / gridSpacing) * gridSpacing,
    y: Math.round(point.y / gridSpacing) * gridSpacing,
  };
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

