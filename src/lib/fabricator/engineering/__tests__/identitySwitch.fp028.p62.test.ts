/**
 * FP-028 / P6.2 — A→B identity isolation for preview + BOM request keys.
 *
 * Covers the automated portion of live gate G3 without inventing manufacturing data.
 */
import { buildBomRequestKey } from '@/hooks/fabricator/useEngineeringEngine';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import {
  buildPreviewRequestKey,
  isPreviewCommitCurrent,
} from '../previewIdentity';

const GRID_A: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'cell-slide-L', row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
    { id: 'cell-slide-R', row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
  ],
  colWidths: [605, 605],
  rowHeights: [1550],
};

const GRID_B: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'cell-case', row: 0, col: 0, type: 'casement', openingDirection: 'left' },
    { id: 'cell-fixed', row: 0, col: 1, type: 'fixed' },
  ],
  colWidths: [900, 600],
  rowHeights: [1400],
};

function unit(
  id: string,
  grid: WindowGrid,
  overrides: Partial<WindowUnit> = {}
): Pick<
  WindowUnit,
  | 'id'
  | 'revision'
  | 'overallWidth'
  | 'overallHeight'
  | 'quantity'
  | 'presetId'
  | 'systemPackId'
> {
  return {
    id,
    revision: 1,
    overallWidth: grid === GRID_A ? 1210 : 1500,
    overallHeight: grid === GRID_A ? 1550 : 1400,
    quantity: 1,
    presetId: id === 'pos-A' ? 'prestige-sliding-2' : 'prestige-casement',
    systemPackId: id === 'pos-A' ? 'rock60' : 'jumbo100',
    ...overrides,
  };
}

describe('FP-028 / P6.2 — A→B identity switch isolation', () => {
  it('preview and BOM keys diverge across A→B identity', () => {
    const a = unit('pos-A', GRID_A);
    const b = unit('pos-B', GRID_B);

    const previewA = buildPreviewRequestKey(a, GRID_A);
    const previewB = buildPreviewRequestKey(b, GRID_B);
    const bomA = buildBomRequestKey(a, a.systemPackId ?? null, GRID_A);
    const bomB = buildBomRequestKey(b, b.systemPackId ?? null, GRID_B);

    expect(previewA).not.toBe(previewB);
    expect(bomA).not.toBe(bomB);
    expect(isPreviewCommitCurrent(previewB, previewA)).toBe(false);
    expect(isPreviewCommitCurrent(previewA, previewA)).toBe(true);
  });

  it('rejects stale A preview commit after switch to B', () => {
    const a = unit('pos-A', GRID_A);
    const b = unit('pos-B', GRID_B);
    const requestA = buildPreviewRequestKey(a, GRID_A);
    const currentB = buildPreviewRequestKey(b, GRID_B);
    expect(isPreviewCommitCurrent(currentB, requestA)).toBe(false);
  });

  it('BOM key changes when only system or revision changes under same grid', () => {
    const base = unit('pos-A', GRID_A);
    const key = buildBomRequestKey(base, 'rock60', GRID_A);
    expect(buildBomRequestKey(base, 'jumbo100', GRID_A)).not.toBe(key);
    expect(buildBomRequestKey({ ...base, revision: 2 }, 'rock60', GRID_A)).not.toBe(key);
  });
});
