/**
 * FP-028 / Phase 5 / P5.2 — engine: explicit conversion; no silent layout overwrite.
 */
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

vi.mock('@/hooks/useBOMCalculation', () => ({
  useBOMCalculation: () => ({
    calculateBOM: vi.fn(() => Promise.resolve({ profiles: [], glazing: [], hardware: [], cost: {} })),
    isCalculating: false,
  }),
}));

vi.mock('@/algorithms/smartDraw', () => ({
  generateComponentsFromGrid: () => ({ components: [], hardware: [] }),
}));

vi.mock('@/lib/fabricator/hardwareConnector', () => ({
  connectHardwareForWindowType: () => [],
}));

vi.mock('@/components/fabricator/bom/utils/transformBOMResult', () => ({
  transformWorkerResultToBOMData: () => null,
}));

import { useEngineeringEngine } from '../useEngineeringEngine';

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

function makeProject(grid: WindowGrid): WindowUnit {
  return {
    id: 'fp028-p5-position',
    orderNumber: 'ORD-FP028',
    posNumber: 'L01',
    type: 'window',
    components: [],
    overallWidth: 1210,
    overallHeight: 1550,
    color: 'white',
    glazing: {},
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date('2026-10-04T00:00:00.000Z'),
    updatedAt: new Date('2026-10-04T00:00:00.000Z'),
    systemPackId: undefined,
    revision: 1,
    quantity: 1,
    grid,
  };
}

describe('FP-028 / P5.2 — pending geometry actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selectSystem preserves F1 grid and queues conversion instead of applying defaultGrid', () => {
    const project = makeProject(F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.selectSystem('rock60');
    });

    expect(result.current.activeSystemPackId).toBe('rock60');
    expect(result.current.currentGrid).toEqual(F1_GRID);
    expect(result.current.pendingGeometryAction).not.toBeNull();
    expect(result.current.pendingGeometryAction?.kind).toBe('system_conversion');
    expect(result.current.pendingGeometryAction?.canApply).toBe(true);
    expect(result.current.error).toMatch(/explicit geometry conversion/i);
  });

  it('applyPendingGeometryAction converts only after confirmation', () => {
    const project = makeProject(F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.selectSystem('rock60');
    });
    act(() => {
      result.current.actions.applyPendingGeometryAction();
    });

    expect(result.current.currentGrid.cells.map((c) => c.type)).toEqual(['sash', 'fixed']);
    expect(result.current.pendingGeometryAction).toBeNull();
    expect(result.current.currentGrid.colWidths!.reduce((a, b) => a + b, 0)).toBe(1210);
  });

  it('dismissPendingGeometryAction keeps saved geometry', () => {
    const project = makeProject(F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.selectSystem('rock60');
    });
    act(() => {
      result.current.actions.dismissPendingGeometryAction();
    });

    expect(result.current.currentGrid).toEqual(F1_GRID);
    expect(result.current.pendingGeometryAction).toBeNull();
    expect(result.current.activeSystemPackId).toBe('rock60');
  });

  it('requestLayoutSuggestion does not overwrite until apply', () => {
    const project = makeProject(F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.requestLayoutSuggestion();
    });

    expect(result.current.currentGrid).toEqual(F1_GRID);
    expect(result.current.pendingGeometryAction?.kind).toBe('layout_suggestion');

    act(() => {
      result.current.actions.applyPendingGeometryAction();
    });

    expect(result.current.currentGrid.rows).toBe(2);
    expect(result.current.currentGrid.cols).toBe(2);
    expect(result.current.currentGrid.cells.map((c) => c.type)).toEqual([
      'fixed',
      'fixed',
      'sash',
      'sash',
    ]);
  });
});
