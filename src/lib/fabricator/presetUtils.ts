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
import { PATTERN_MATCHING_THRESHOLDS } from './presetMatchingConstants';

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
      openingDirection: cell.openingDirection,
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
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

  const confidence = totalChecks > 0 
    ? (matchScore / totalChecks) * PATTERN_MATCHING_THRESHOLDS.PERCENTAGE_MULTIPLIER 
    : 0;
  return {
    matches: confidence >= PATTERN_MATCHING_THRESHOLDS.MIN_MATCH_CONFIDENCE,
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

  return matches.length > 0 && matches[0].confidence >= PATTERN_MATCHING_THRESHOLDS.MIN_BEST_MATCH_CONFIDENCE
    ? matches[0]
    : null;
}

export interface PatternSuggestionContext {
  overallWidth?: number;
  overallHeight?: number;
  systemPackId?: string | null;
  preferredType?: EgyptianPattern['type'] | null;
  existingGrid?: WindowGrid | null;
}

export interface PatternSuggestionResult {
  pattern: EgyptianPattern;
  score: number;
  rationale: string[];
}

function scoreRangeFit(value: number, min: number, max: number, inRangeScore: number, nearRangeScore: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return inRangeScore;

  const nearest = value < min ? min : max;
  const deviation = Math.abs(value - nearest) / Math.max(nearest, 1);
  if (deviation <= 0.15) return nearRangeScore;
  if (deviation <= 0.30) return Math.floor(nearRangeScore / 2);
  return 0;
}

function getDominantGridType(grid: WindowGrid | null | undefined): string | null {
  if (!grid || !grid.cells || grid.cells.length === 0) return null;
  const counts = grid.cells.reduce<Record<string, number>>((acc, cell) => {
    acc[cell.type] = (acc[cell.type] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

export function inferPreferredPatternTypeFromGrid(grid?: WindowGrid | null): EgyptianPattern['type'] | null {
  const dominantType = getDominantGridType(grid);
  if (!dominantType) return null;
  if (dominantType === 'sliding') return 'sliding';
  if (dominantType === 'sash') return 'casement';
  if (dominantType === 'fixed' || dominantType === 'panel') return 'fixed';
  return null;
}

export function suggestBestPatternForContext(
  context: PatternSuggestionContext,
): PatternSuggestionResult | null {
  const preferredType = context.preferredType ?? inferPreferredPatternTypeFromGrid(context.existingGrid);
  const candidates = context.systemPackId
    ? getPatternsForSystem(context.systemPackId)
    : EGYPTIAN_PATTERNS;

  const fallbackCandidates = candidates.length > 0 ? candidates : EGYPTIAN_PATTERNS;
  if (fallbackCandidates.length === 0) return null;

  let best: PatternSuggestionResult | null = null;
  const targetAspect = (
    context.overallWidth && context.overallHeight && context.overallHeight > 0
      ? context.overallWidth / context.overallHeight
      : null
  );
  const dominantType = getDominantGridType(context.existingGrid);

  for (const pattern of fallbackCandidates) {
    let score = 0;
    const rationale: string[] = [];

    if (preferredType && (pattern.type === preferredType || pattern.type === 'mixed')) {
      score += pattern.type === preferredType ? 24 : 12;
      rationale.push('opening mechanism');
    }

    if (context.overallWidth) {
      score += scoreRangeFit(
        context.overallWidth,
        pattern.typicalWidthMm[0],
        pattern.typicalWidthMm[1],
        28,
        14,
      );
    }

    if (context.overallHeight) {
      score += scoreRangeFit(
        context.overallHeight,
        pattern.typicalHeightMm[0],
        pattern.typicalHeightMm[1],
        28,
        14,
      );
    }

    if (targetAspect) {
      const patternAspect = pattern.typicalWidthMm[1] / Math.max(pattern.typicalHeightMm[1], 1);
      const aspectDiff = Math.abs(patternAspect - targetAspect);
      if (aspectDiff <= 0.20) {
        score += 12;
        rationale.push('aspect ratio');
      } else if (aspectDiff <= 0.40) {
        score += 6;
      }
    }

    if (dominantType) {
      const patternTypeCount = pattern.gridSpec.cells.filter((cell) => cell.type === dominantType).length;
      if (patternTypeCount > 0) {
        score += 8;
      }
    }

    if (context.existingGrid) {
      if (context.existingGrid.rows === pattern.gridSpec.rows) score += 4;
      if (context.existingGrid.cols === pattern.gridSpec.cols) score += 4;
    }

    if (!best || score > best.score) {
      best = { pattern, score, rationale };
    }
  }

  return best;
}

