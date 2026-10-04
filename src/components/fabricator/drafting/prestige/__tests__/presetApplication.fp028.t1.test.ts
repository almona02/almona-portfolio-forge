/**
 * FP-028 / Phase 0 / T1
 *
 * Prestige templates reduce intent to row×column counts.
 * Cell types, opening directions, spans, and unequal ratios from the
 * free-text pattern are not authoritative after apply.
 */
import { describe, expect, it } from 'vitest';
import type { ArchitecturalPreset } from '../ArchitecturalPresetSelector';
import { applyPresetIntelligence } from '../presetApplication';

function makePreset(gridPattern: string): ArchitecturalPreset {
  return {
    id: 'fp028-t1-fixture',
    title: 'FP-028 T1 Fixture',
    description: 'Characterization fixture',
    icon: 'test',
    complexity: 'Basic',
    intelligence: {
      gridPattern,
      systemRecommendation: 'rock60',
      materialRecommendation: 'aluminum',
    },
    applications: ['test'],
    pricingTier: 'Standard',
    templateSchema: {
      version: 1,
      status: 'selectable',
      evidenceStatus: 'illustrative',
      compatibleSystemPackIds: ['rock60'],
      grid: {
        rows: 1,
        cols: 2,
        cells: [
          { id: 'slide-left', row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
          { id: 'slide-right', row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
        ],
        colWidths: [1, 1],
        rowHeights: [1],
      },
    },
  };
}

describe('FP-028 / T1 — explicit template geometry', () => {
  it('preserves sliding cell type, identity, direction and dimensions', () => {
    const result = applyPresetIntelligence(makePreset('1x2 sliding'), 1210, 1550);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.windowGrid.rows).toBe(1);
    expect(result.windowGrid.cols).toBe(2);
    expect(result.windowGrid.cells).toHaveLength(2);

    const types = result.windowGrid.cells.map((c) => c.type);
    expect(types).toEqual(['sliding', 'sliding']);
    expect(result.windowGrid.cells.map((c) => c.openingDirection)).toEqual(['right', 'left']);
    expect(result.windowGrid.cells.map((c) => c.id)).toEqual(['slide-left', 'slide-right']);
    expect(result.windowGrid.colWidths).toEqual([605, 605]);
  });

  it('documents defect: F2 unequal casement/fixed intent collapses to equal sash/fixed heuristic', () => {
    const preset = makePreset('1x2 casement fixed');
    if (!preset.templateSchema?.grid) throw new Error('Fixture grid missing');
    preset.templateSchema.grid.cells = [
      { id: 'casement', row: 0, col: 0, type: 'sash', openingDirection: 'right' },
      { id: 'fixed', row: 0, col: 1, type: 'fixed' },
    ];
    preset.templateSchema.grid.colWidths = [3, 2];
    const result = applyPresetIntelligence(preset, 1500, 1400);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.windowGrid.colWidths).toEqual([900, 600]);
    expect(result.windowGrid.cells.map((c) => c.type)).toEqual(['sash', 'fixed']);
  });

  /**
   * Phase 2 acceptance lock. Remove `.fails` when templates carry explicit
   * cell schemas (types, directions, ratios) and apply is lossless for F1.
   */
  it('T1 acceptance: F1 sliding pattern applies authoritative cell semantics', () => {
    const result = applyPresetIntelligence(makePreset('1x2 sliding'), 1210, 1550);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.windowGrid.cells.map((c) => c.type)).toEqual(['sliding', 'sliding']);
    expect(result.windowGrid.cells.every((c) => c.openingDirection != null)).toBe(true);
    expect(
      (result.windowGrid.colWidths?.[0] ?? 0) + (result.windowGrid.colWidths?.[1] ?? 0)
    ).toBe(1210);
  });
});
