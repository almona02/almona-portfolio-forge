/**
 * FP-028 / Phase 5 / P5.2 — system↔geometry compatibility (no silent overwrite).
 */
import { ROCK60_SYSTEM_PACK } from '@/data/systemPacks';
import type { WindowGrid } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import {
  assessSystemGeometryCompatibility,
  buildSuggestedLayoutGrid,
  createLayoutSuggestionAction,
  createSystemConversionAction,
  gridsStructurallyEqual,
} from '../systemGeometryCompatibility';

const F1_GRID: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'cell-slide-L', row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
    { id: 'cell-slide-R', row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
  ],
  colWidths: [605, 605],
  rowHeights: [1550],
};

describe('FP-028 / P5.2 — system geometry compatibility', () => {
  it('flags F1 sliding grid as incompatible with rock60 default sash/fixed', () => {
    const assessment = assessSystemGeometryCompatibility(
      F1_GRID,
      1210,
      1550,
      ROCK60_SYSTEM_PACK
    );
    expect(assessment.compatible).toBe(false);
    expect(assessment.proposedGrid?.cells.map((c) => c.type)).toEqual(['sash', 'fixed']);
    expect(assessment.reasons.some((r) => r.includes('differs from pack default'))).toBe(true);
  });

  it('creates an explicit conversion action without mutating caller grid', () => {
    const before = structuredClone(F1_GRID);
    const action = createSystemConversionAction(ROCK60_SYSTEM_PACK, F1_GRID, 1210, 1550);
    expect(action).not.toBeNull();
    expect(action!.canApply).toBe(true);
    expect(action!.kind).toBe('system_conversion');
    expect(F1_GRID).toEqual(before);
    expect(action!.proposedGrid.colWidths!.reduce((a, b) => a + b, 0)).toBe(1210);
    expect(action!.proposedGrid.rowHeights!.reduce((a, b) => a + b, 0)).toBe(1550);
  });

  it('layout suggestion requires confirmation when grid would change', () => {
    const action = createLayoutSuggestionAction(F1_GRID, 1210, 1550, 'rock60');
    expect(action).not.toBeNull();
    expect(action!.canApply).toBe(true);
    expect(action!.kind).toBe('layout_suggestion');
    expect(gridsStructurallyEqual(F1_GRID, action!.proposedGrid)).toBe(false);
  });

  it('layout suggestion is a no-op when already on suggested structure', () => {
    const suggested = buildSuggestedLayoutGrid(1210, 1550);
    expect(createLayoutSuggestionAction(suggested, 1210, 1550, 'rock60')).toBeNull();
  });

  it('reports dimensional constraint violations for undersized openings', () => {
    const assessment = assessSystemGeometryCompatibility(
      F1_GRID,
      400,
      400,
      ROCK60_SYSTEM_PACK
    );
    expect(assessment.compatible).toBe(false);
    expect(assessment.reasons.some((r) => r.includes('below pack minimum'))).toBe(true);
  });
});
