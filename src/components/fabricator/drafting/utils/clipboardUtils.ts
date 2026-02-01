/**
 * Clipboard Utilities for Drafting Workbench
 * 
 * Provides copy, cut, and paste operations for drafting geometry.
 * 
 * Constitutional: Deterministic clipboard operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

import type { Geometry2D, Rectangle, Circle, Line, Arc, Polygon } from '../types/drafting';

export interface ClipboardData {
  rectangles: Rectangle[];
  circles: Circle[];
  lines: Line[];
  arcs: Arc[];
  polygons: Polygon[];
  timestamp: number;
}

const CLIPBOARD_KEY = 'almona:drafting:clipboard';
const CLIPBOARD_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Copy selected geometry to clipboard
 */
export function copyToClipboard(geometry: Geometry2D, selectedIndices: number[]): ClipboardData | null {
  try {
    // Extract selected elements
    const selectedRectangles = selectedIndices
      .filter(idx => idx < geometry.rectangles.length)
      .map(idx => geometry.rectangles[idx]);
    
    const circleOffset = geometry.rectangles.length;
    const selectedCircles = selectedIndices
      .filter(idx => idx >= circleOffset && idx < circleOffset + geometry.circles.length)
      .map(idx => geometry.circles[idx - circleOffset]);
    
    const lineOffset = circleOffset + geometry.circles.length;
    const selectedLines = selectedIndices
      .filter(idx => idx >= lineOffset && idx < lineOffset + geometry.lines.length)
      .map(idx => geometry.lines[idx - lineOffset]);
    
    const arcOffset = lineOffset + geometry.lines.length;
    const selectedArcs = selectedIndices
      .filter(idx => idx >= arcOffset && idx < arcOffset + geometry.arcs.length)
      .map(idx => geometry.arcs[idx - arcOffset]);
    
    const polygonOffset = arcOffset + geometry.arcs.length;
    const selectedPolygons = selectedIndices
      .filter(idx => idx >= polygonOffset && idx < polygonOffset + geometry.polygons.length)
      .map(idx => geometry.polygons[idx - polygonOffset]);

    const clipboardData: ClipboardData = {
      rectangles: selectedRectangles,
      circles: selectedCircles,
      lines: selectedLines,
      arcs: selectedArcs,
      polygons: selectedPolygons,
      timestamp: Date.now(),
    };

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboardData));
    }

    return clipboardData;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return null;
  }
}

/**
 * Get clipboard data
 */
export function getClipboardData(): ClipboardData | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const data = localStorage.getItem(CLIPBOARD_KEY);
    if (!data) return null;

    const clipboardData: ClipboardData = JSON.parse(data);
    
    // Check if clipboard data is expired
    if (Date.now() - clipboardData.timestamp > CLIPBOARD_MAX_AGE) {
      localStorage.removeItem(CLIPBOARD_KEY);
      return null;
    }

    return clipboardData;
  } catch (error) {
    console.error('Error getting clipboard data:', error);
    return null;
  }
}

/**
 * Clear clipboard
 */
export function clearClipboard(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CLIPBOARD_KEY);
  }
}

/**
 * Check if clipboard has data
 */
export function hasClipboardData(): boolean {
  return getClipboardData() !== null;
}

/**
 * Generate new IDs for pasted elements
 */
function generateNewIds<T extends { id: string }>(elements: T[]): T[] {
  return elements.map((el, idx) => ({
    ...el,
    id: `${el.id}_copy_${Date.now()}_${idx}`,
  }));
}

/**
 * Offset pasted elements by a small amount
 */
function offsetElements<T extends { x?: number; y?: number; cx?: number; cy?: number }>(
  elements: T[],
  offsetX: number = 20,
  offsetY: number = 20
): T[] {
  return elements.map(el => {
    if ('x' in el && 'y' in el) {
      return { ...el, x: (el.x || 0) + offsetX, y: (el.y || 0) + offsetY };
    }
    if ('cx' in el && 'cy' in el) {
      return { ...el, cx: (el.cx || 0) + offsetX, cy: (el.cy || 0) + offsetY };
    }
    return el;
  });
}

/**
 * Prepare geometry for pasting (generate new IDs and offset)
 */
export function preparePasteGeometry(clipboardData: ClipboardData, offsetX: number = 20, offsetY: number = 20): Partial<Geometry2D> {
  return {
    rectangles: offsetElements(generateNewIds(clipboardData.rectangles), offsetX, offsetY),
    circles: offsetElements(generateNewIds(clipboardData.circles), offsetX, offsetY),
    lines: generateNewIds(clipboardData.lines), // Lines need special offset handling
    arcs: offsetElements(generateNewIds(clipboardData.arcs), offsetX, offsetY),
    polygons: generateNewIds(clipboardData.polygons), // Polygons need special offset handling
  };
}

