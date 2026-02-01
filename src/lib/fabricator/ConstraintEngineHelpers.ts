/**
 * @file ConstraintEngineHelpers.ts
 * @description Helper functions for constraint validation
 * 
 * Extracted helper functions to support template matching and constraint validation.
 * Used by both validateDesign() and ValidationEnvelope integration.
 */

import type { WindowGrid } from '@/types/fabricator';
import type { EgyptianTemplate } from './ConstraintEngine';

/**
 * Find matching Egyptian template based on grid topology
 * 
 * Matches template by rows/cols and cell type patterns.
 * 
 * @param grid - Window grid structure
 * @param templates - Array of Egyptian templates
 * @returns Matching template or null
 */
export function findMatchingTemplate(
  grid: WindowGrid,
  templates: EgyptianTemplate[]
): EgyptianTemplate | null {
  const matchingTemplate = templates.find((t) => {
    if (t.topology.rows !== grid.rows || t.topology.cols !== grid.cols) {
      return false;
    }

    // Very simple pattern check: flatten first pattern and compare types
    const firstPattern = t.topology.patterns[0];
    if (!firstPattern) return true;

    // Map row/col to index in row-major order
    return firstPattern.every((expectedType, index) => {
      const row = Math.floor(index / grid.cols);
      const col = index % grid.cols;
      const cell = grid.cells.find((c) => c.row === row && c.col === col);
      return cell ? cell.type === (expectedType as any) : false;
    });
  });

  return matchingTemplate || null;
}


