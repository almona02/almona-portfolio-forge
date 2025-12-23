/**
 * Preset Pattern Utilities
 * ---------------------------------------------------------------------------
 * Helper functions for working with Egyptian window patterns:
 * - Pattern lookup and filtering
 * - Pattern-to-grid conversion
 * - Pattern matching and validation
 */

import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowGrid } from '@/types/fabricator';

// Re-export for convenience
export type { EgyptianPattern };

/**
 * Get pattern by ID
 */
export function getPatternById(patternId: string): EgyptianPattern | null {
  return EGYPTIAN_PATTERNS.find(p => p.id === patternId) || null;
}

/**
 * Get patterns compatible with system pack
 */
export function getPatternsForSystem(systemPackId: string | null): EgyptianPattern[] {
  if (!systemPackId) return EGYPTIAN_PATTERNS;
  return EGYPTIAN_PATTERNS.filter(p => 
    p.compatibleSystems.includes(systemPackId)
  );
}

/**
 * Convert EgyptianPattern.gridSpec to WindowGrid
 * This is the core function that applies a pattern to the canvas
 */
export function patternToWindowGrid(pattern: EgyptianPattern): WindowGrid {
  return {
    rows: pattern.gridSpec.rows,
    cols: pattern.gridSpec.cols,
    cells: pattern.gridSpec.cells.map(cell => ({
      id: `${cell.row}-${cell.col}`,
      row: cell.row,
      col: cell.col,
      type: cell.type,
      openingDirection: cell.openingDirection
    })),
    colWidths: pattern.gridSpec.colWidths,
    rowHeights: pattern.gridSpec.rowHeights
  };
}

/**
 * Check if current grid matches a pattern
 * Returns match confidence and differences for validation
 */
export function gridMatchesPattern(
  grid: WindowGrid,
  pattern: EgyptianPattern
): { matches: boolean; confidence: number; differences: string[] } {
  const differences: string[] = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Check dimensions
  totalChecks += 2;
  if (grid.rows === pattern.gridSpec.rows) {
    matchScore += 1;
  } else {
    differences.push(`Rows: ${grid.rows} vs ${pattern.gridSpec.rows}`);
  }
  if (grid.cols === pattern.gridSpec.cols) {
    matchScore += 1;
  } else {
    differences.push(`Cols: ${grid.cols} vs ${pattern.gridSpec.cols}`);
  }

  // Check cell types
  pattern.gridSpec.cells.forEach(patternCell => {
    totalChecks += 1;
    const userCell = grid.cells.find(
      c => c.row === patternCell.row && c.col === patternCell.col
    );
    if (userCell?.type === patternCell.type) {
      matchScore += 1;
    } else {
      differences.push(
        `Cell [${patternCell.row},${patternCell.col}]: ${userCell?.type || 'missing'} vs ${patternCell.type}`
      );
    }
  });

  // Check proportions (if specified in pattern)
  if (pattern.gridSpec.colWidths && grid.colWidths) {
    totalChecks += 1;
    const patternProportions = pattern.gridSpec.colWidths.join(',');
    const gridProportions = grid.colWidths.join(',');
    if (patternProportions === gridProportions) {
      matchScore += 1;
    } else {
      differences.push(
        `Column proportions: [${gridProportions}] vs [${patternProportions}]`
      );
    }
  }

  const confidence = totalChecks > 0 ? (matchScore / totalChecks) * 100 : 0;
  return {
    matches: confidence >= 85,
    confidence,
    differences
  };
}

/**
 * Find best matching pattern for a given grid
 * Useful for auto-detection when user manually creates a grid
 */
export function findBestMatchingPattern(
  grid: WindowGrid,
  systemPackId?: string | null
): { pattern: EgyptianPattern; confidence: number } | null {
  const candidates = systemPackId 
    ? getPatternsForSystem(systemPackId)
    : EGYPTIAN_PATTERNS;

  const matches = candidates.map(pattern => {
    const result = gridMatchesPattern(grid, pattern);
    return {
      pattern,
      confidence: result.confidence
    };
  }).sort((a, b) => b.confidence - a.confidence);

  return matches.length > 0 && matches[0].confidence >= 70
    ? matches[0]
    : null;
}

