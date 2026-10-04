/**
 * FP-028 / Phase 0 / D2
 *
 * Selecting a system pack must preserve authoritative grid geometry.
 * It must not replace saved cells, proportions, or opening semantics
 * with pack.defaultGrid or a 1×2 fallback.
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

/** F1-shaped authoritative grid: 1210×1550, 1×2 sliding, exact column sum */
const AUTHORITATIVE_F1_GRID: WindowGrid = {
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
    id: 'fp028-d2-position',
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

describe('FP-028 / D2 — system selection preserves authoritative geometry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves F1 sliding grid when selecting rock60 (does not apply defaultGrid)', () => {
    const project = makeProject(AUTHORITATIVE_F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    expect(result.current.currentGrid).toEqual(AUTHORITATIVE_F1_GRID);

    act(() => {
      result.current.actions.selectSystem('rock60');
    });

    expect(result.current.activeSystemPackId).toBe('rock60');
    expect(result.current.currentGrid).toEqual(AUTHORITATIVE_F1_GRID);
    expect(result.current.currentGrid.cells.map((c) => c.id)).toEqual([
      'cell-slide-L',
      'cell-slide-R',
    ]);
    expect(result.current.currentGrid.cells.map((c) => c.type)).toEqual([
      'sliding',
      'sliding',
    ]);
    expect(result.current.currentGrid.colWidths).toEqual([605, 605]);
    expect(result.current.currentGrid.rowHeights).toEqual([1550]);
    // rock60.defaultGrid uses sash+fixed — must not appear
    expect(result.current.currentGrid.cells.some((c) => c.type === 'fixed')).toBe(false);
    expect(result.current.currentGrid.cells.some((c) => c.type === 'sash')).toBe(false);
  });

  it('preserves unequal F2 geometry when selecting a pack without matching defaultGrid', () => {
    const f2Grid: WindowGrid = {
      rows: 1,
      cols: 2,
      cells: [
        { id: 'casement-0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { id: 'fixed-1', row: 0, col: 1, type: 'fixed' },
      ],
      colWidths: [900, 600],
      rowHeights: [1400],
    };
    const project = makeProject({
      ...f2Grid,
    });
    project.overallWidth = 1500;
    project.overallHeight = 1400;

    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.selectSystem('jumbo100');
    });

    expect(result.current.activeSystemPackId).toBe('jumbo100');
    expect(result.current.currentGrid).toEqual(f2Grid);
    expect(result.current.currentGrid.colWidths?.reduce((a, b) => a + b, 0)).toBe(1500);
  });

  it('still allows explicit applyGrid / updateGrid to change geometry', () => {
    const project = makeProject(AUTHORITATIVE_F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    const next: WindowGrid = {
      rows: 2,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
        { id: '1-0', row: 1, col: 0, type: 'sliding' },
        { id: '1-1', row: 1, col: 1, type: 'empty' },
      ],
      colWidths: [900, 900],
      rowHeights: [1050, 1050],
    };

    act(() => {
      result.current.actions.applyGrid(next);
    });

    expect(result.current.currentGrid).toEqual(next);
  });

  it('binds an applied template ID to the live position and clears it for manual grids', () => {
    const project = makeProject(AUTHORITATIVE_F1_GRID);
    const { result } = renderHook(() =>
      useEngineeringEngine({ project, profiles: [], onDesignComplete: vi.fn() })
    );

    act(() => result.current.actions.applyGrid(AUTHORITATIVE_F1_GRID, 'sliding-2s'));
    expect(result.current.activeTemplateId).toBe('sliding-2s');
    expect(result.current.liveProject?.presetId).toBe('sliding-2s');

    act(() => result.current.actions.applyGrid(AUTHORITATIVE_F1_GRID));
    expect(result.current.activeTemplateId).toBeNull();
    expect(result.current.liveProject?.presetId).toBeUndefined();
  });
});
