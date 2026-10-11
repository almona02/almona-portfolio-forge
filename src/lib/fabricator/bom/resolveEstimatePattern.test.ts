import { describe, expect, it } from 'vitest';
import type { WindowUnit } from '@/types/fabricator';
import { resolveEstimatePattern } from './resolveEstimatePattern';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';

function position(cols: number, rows: number): WindowUnit {
  return {
    id: 'test', overallWidth: 1200, overallHeight: 1400,
    grid: { rows, cols, cells: Array.from({ length: rows * cols }, (_, i) => ({
      id: String(i), row: Math.floor(i / cols), col: i % cols, type: 'fixed',
    })) },
  } as WindowUnit;
}

describe('saved manual design estimate resolution', () => {
  it.each([[1,1],[2,1],[1,2],[2,2],[3,1],[1,3],[3,2],[2,3],[4,1],[4,2]])(
    'retains every fixed cell and divider in %i columns × %i rows', (cols, rows) => {
      const result = resolveEstimatePattern(position(cols, rows));
      expect(result.gridSpec.cells).toHaveLength(cols * rows);
      expect(result.mullions).toHaveLength(cols - 1);
      expect(result.transoms).toHaveLength(rows - 1);
      expect(result.compatibleSystems).toEqual([]);
      expect(result.name).toContain('estimate');
    });
  it('rejects missing and duplicate cells rather than substituting a preset', () => {
    const missing = position(2, 2);
    missing.grid!.cells.pop();
    expect(() => resolveEstimatePattern(missing)).toThrow('complete rectangular grid');
    const duplicate = position(2, 2);
    duplicate.grid!.cells[1] = duplicate.grid!.cells[0];
    expect(() => resolveEstimatePattern(duplicate)).toThrow('duplicate');
  });

  it('resolves manual sliding sash grids without inventing mullion/transom rows', () => {
    const sliding = position(2, 1);
    sliding.type = 'sliding_window_2sash';
    sliding.grid!.cells.forEach((cell) => {
      cell.type = 'sash';
    });
    const result = resolveEstimatePattern(sliding);
    expect(result.type).toBe('sliding');
    expect(result.openingMechanism?.type).toBe('sliding');
    expect(result.mullions).toHaveLength(0);
    expect(result.transoms).toHaveLength(0);
    expect(result.gridSpec.cells).toHaveLength(2);
  });

  it('does not map all-sash casement grids to sliding', () => {
    const casement = position(2, 1);
    casement.type = 'casement';
    casement.grid!.cells.forEach((cell, i) => {
      cell.type = 'sash';
      cell.openingDirection = i === 0 ? 'left' : 'right';
    });
    const result = resolveEstimatePattern(casement);
    expect(result.type).toBe('casement');
    expect(result.openingMechanism?.type).toBe('casement');
    expect(result.mullions).toHaveLength(1);
    expect(result.id).toContain('manual-casement');
  });

  it('resolves mixed fixed/side-hung manual grids with structural mullions', () => {
    const mixed = position(2, 1);
    mixed.type = 'casement';
    mixed.grid!.cells[0].type = 'fixed';
    mixed.grid!.cells[1].type = 'sash';
    mixed.grid!.cells[1].openingDirection = 'right';
    const result = resolveEstimatePattern(mixed);
    expect(result.type).toBe('casement');
    expect(result.openingMechanism?.type).toBe('casement');
    expect(result.mullions).toHaveLength(1);
    expect(result.gridSpec.cells[0].type).toBe('fixed');
    expect(result.gridSpec.cells[1].type).toBe('sash');
  });
  it('rejects unknown explicit presets and invalid proportions', () => {
    const unknown = position(1, 1);
    unknown.presetId = 'missing';
    expect(() => resolveEstimatePattern(unknown)).toThrow('Unknown saved preset');
    const invalid = position(2, 1);
    invalid.grid!.colWidths = [0, 1];
    expect(() => resolveEstimatePattern(invalid)).toThrow('proportions');
  });
  it('rejects a preset whose geometry differs from the saved grid', () => {
    const changed = position(4, 2);
    changed.presetId = EGYPTIAN_PATTERNS[0].id;
    expect(() => resolveEstimatePattern(changed)).toThrow('does not match');
  });
});
