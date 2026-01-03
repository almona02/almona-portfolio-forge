// src/components/fabricator/drafting/utils/egyptianTemplateMatcher.ts
import type { Geometry2D, EgyptianTemplate, Rectangle } from '../types/drafting';

/**
 * Deterministic Egyptian template matching (NO ML)
 * Constitutional: Rule-based pattern matching only
 */
export interface TemplateMatchResult {
  found: boolean;
  template?: EgyptianTemplate;
  closest?: EgyptianTemplate;
  // NOTE: confidence removed - deterministic matching only
  // All matching is rule-based, no probabilistic scores
  matchRationale?: string; // Deterministic explanation of match
}

/**
 * Validate geometry against Egyptian templates
 */
export function validateAgainstEgyptianTemplates(
  geometry: Geometry2D,
  templates: EgyptianTemplate[]
): TemplateMatchResult {
  const rects = geometry.rectangles;
  
  // No rectangles → no match
  if (rects.length === 0) {
    return { found: false };
  }
  
  // Calculate grid dimensions
  const rows = calculateRows(rects);
  const cols = calculateColumns(rects);
  
  // Rule 1: Exact dimension match
  for (const template of templates) {
    if (template.rows === rows && template.cols === cols) {
      // Check if cell arrangement matches
      const cellTypes = extractCellTypes(rects, rows, cols);
      if (matchesTemplatePattern(cellTypes, template.cellTypes)) {
        return {
          found: true,
          template,
          matchRationale: `Exact match: ${template.rows}x${template.cols} grid with matching cell types`
        };
      }
    }
  }
  
  // Rule 2: Find closest template
  const closest = findClosestTemplate(rects, templates);
  
  return {
    found: false,
    closest,
    matchRationale: closest 
      ? `No exact match found. Closest template: ${closest.name} (${closest.rows}x${closest.cols})`
      : 'No matching templates found'
  };
}

/**
 * Calculate number of rows from rectangles
 */
function calculateRows(rects: Rectangle[]): number {
  const uniqueYs = [...new Set(rects.map(r => Math.round(r.y / 10) * 10))];
  return uniqueYs.length;
}

/**
 * Calculate number of columns from rectangles
 */
function calculateColumns(rects: Rectangle[]): number {
  const uniqueXs = [...new Set(rects.map(r => Math.round(r.x / 10) * 10))];
  return uniqueXs.length;
}

/**
 * Extract cell types from rectangles in grid order
 */
function extractCellTypes(rects: Rectangle[], rows: number, cols: number): string[][] {
  const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill('fixed'));
  
  // Sort rectangles by position (top-to-bottom, left-to-right)
  const sortedRects = [...rects].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 10) {
      return a.x - b.x; // Same row, sort by x
    }
    return a.y - b.y; // Sort by y
  });
  
  // Map rectangles to grid positions
  sortedRects.forEach((rect, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    if (row < rows && col < cols) {
      grid[row][col] = rect.type || 'fixed';
    }
  });
  
  return grid;
}

/**
 * Check if cell types match template pattern
 */
function matchesTemplatePattern(cellTypes: string[][], templatePattern: string[][]): boolean {
  if (cellTypes.length !== templatePattern.length) return false;
  if (cellTypes[0]?.length !== templatePattern[0]?.length) return false;
  
  for (let i = 0; i < cellTypes.length; i++) {
    for (let j = 0; j < cellTypes[i].length; j++) {
      // '*' in template means "any type"
      if (templatePattern[i][j] !== '*' && cellTypes[i][j] !== templatePattern[i][j]) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Find closest template by dimensions
 */
function findClosestTemplate(rects: Rectangle[], templates: EgyptianTemplate[]): EgyptianTemplate | undefined {
  const rows = calculateRows(rects);
  const cols = calculateColumns(rects);
  
  // Find templates with matching row/col count
  const matchingSize = templates.filter(t => t.rows === rows && t.cols === cols);
  
  if (matchingSize.length > 0) {
    // Return first match (deterministic)
    return matchingSize[0];
  }
  
  // Find closest by size difference
  let closest: EgyptianTemplate | undefined;
  let minDiff = Infinity;
  
  for (const template of templates) {
    const diff = Math.abs(template.rows - rows) + Math.abs(template.cols - cols);
    if (diff < minDiff) {
      minDiff = diff;
      closest = template;
    }
  }
  
  return closest;
}

// NOTE: Removed calculateSimilarityScore - we use deterministic matching only
// No probabilistic scores, no "confidence" - only exact matches or closest template

