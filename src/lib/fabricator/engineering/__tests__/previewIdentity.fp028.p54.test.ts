/**
 * FP-028 / Phase 5 / P5.4 — preview identity + estimate surface labels.
 */
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import {
  assessPreviewSurfaceAuthority,
  buildPreviewRequestKey,
  isPreviewCommitCurrent,
} from '../previewIdentity';

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

const unitA: Pick<
  WindowUnit,
  'id' | 'revision' | 'overallWidth' | 'overallHeight' | 'quantity' | 'presetId' | 'systemPackId'
> = {
  id: 'pos-A',
  revision: 1,
  overallWidth: 1210,
  overallHeight: 1550,
  quantity: 1,
  presetId: 'prestige-sliding-2',
  systemPackId: 'rock60',
};

describe('FP-028 / P5.4 — preview identity', () => {
  it('changes key when system, revision, grid, or preset changes', () => {
    const base = buildPreviewRequestKey(unitA, F1_GRID);
    expect(buildPreviewRequestKey({ ...unitA, systemPackId: 'jumbo100' }, F1_GRID)).not.toBe(base);
    expect(buildPreviewRequestKey({ ...unitA, revision: 2 }, F1_GRID)).not.toBe(base);
    expect(buildPreviewRequestKey({ ...unitA, presetId: 'other' }, F1_GRID)).not.toBe(base);
    expect(
      buildPreviewRequestKey(unitA, { ...F1_GRID, colWidths: [700, 510] })
    ).not.toBe(base);
    expect(buildPreviewRequestKey(unitA, F1_GRID)).toBe(base);
  });

  it('rejects late commit when current identity no longer matches request', () => {
    const keyA = buildPreviewRequestKey(unitA, F1_GRID);
    const keyB = buildPreviewRequestKey({ ...unitA, id: 'pos-B' }, F1_GRID);
    expect(isPreviewCommitCurrent(keyA, keyA)).toBe(true);
    expect(isPreviewCommitCurrent(keyB, keyA)).toBe(false);
    expect(isPreviewCommitCurrent(null, keyA)).toBe(false);
  });

  it('fails closed to ESTIMATE for design-studio preview/BOM surfaces', () => {
    const assessment = assessPreviewSurfaceAuthority({
      hasApprovedManufacturingContract: false,
    });
    expect(assessment.status).toBe('estimate_only');
    expect(assessment.badgeLabel).toBe('ESTIMATE');
    expect(assessment.description).toMatch(/estimate only/i);
    expect(assessment.description).toMatch(/not manufacturing-ready/i);
  });

  it('still fails closed even if a contract flag is passed (Design Studio)', () => {
    const assessment = assessPreviewSurfaceAuthority({
      hasApprovedManufacturingContract: true,
    });
    expect(assessment.badgeLabel).toBe('ESTIMATE');
    expect(assessment.status).toBe('estimate_only');
  });
});
