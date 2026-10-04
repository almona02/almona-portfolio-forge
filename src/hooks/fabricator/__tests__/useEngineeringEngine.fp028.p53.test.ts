/**
 * FP-028 / Phase 5 / P5.3 — persist template/grid/system identity on save.
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
  generateComponentsFromGrid: () => ({
    components: [
      {
        id: 'comp-frame',
        type: 'frame',
        width: 1210,
        height: 1550,
        length: 1210,
        quantity: 1,
        profile: { id: 'p1', name: 'frame', profileRole: 'frame' },
      },
    ],
    hardware: [],
  }),
}));

vi.mock('@/lib/fabricator/hardwareConnector', () => ({
  connectHardwareForWindowType: () => [],
}));

vi.mock('@/components/fabricator/bom/utils/transformBOMResult', () => ({
  transformWorkerResultToBOMData: () => null,
}));

vi.mock('@/lib/fabricator/ConstraintEngine', () => ({
  validateDesign: () => ({ isValid: true, errors: [], warnings: [] }),
}));

import { applyDesignCompletion } from '@/lib/fabricator/engineering/designCompletion';
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

const EDITED_GRID: WindowGrid = {
  ...F1_GRID,
  colWidths: [700, 510],
};

function makeProject(overrides: Partial<WindowUnit> = {}): WindowUnit {
  return {
    id: 'fp028-p53-position',
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
    systemPackId: 'rock60',
    presetId: 'prestige-sliding-2',
    revision: 1,
    quantity: 1,
    grid: F1_GRID,
    ...overrides,
  };
}

describe('FP-028 / P5.3 — save persists grid/system/template identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validate() emits components + grid + systemPackId + presetId', () => {
    const onDesignComplete = vi.fn();
    const project = makeProject();
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete,
      })
    );

    let ok = false;
    act(() => {
      ok = result.current.actions.validate();
    });

    expect(ok).toBe(true);
    expect(onDesignComplete).toHaveBeenCalledTimes(1);
    expect(onDesignComplete).toHaveBeenCalledWith({
      components: expect.arrayContaining([
        expect.objectContaining({ id: 'comp-frame' }),
      ]),
      grid: F1_GRID,
      systemPackId: 'rock60',
      presetId: 'prestige-sliding-2',
    });
  });

  it('applyGrid binds template id; updateGrid clears template on manual edit', () => {
    const project = makeProject({ presetId: undefined });
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: [],
        onDesignComplete: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.applyGrid(F1_GRID, 'tpl-casement-unequal');
    });
    expect(result.current.activeTemplateId).toBe('tpl-casement-unequal');

    act(() => {
      result.current.actions.updateGrid(EDITED_GRID);
    });
    expect(result.current.currentGrid).toEqual(EDITED_GRID);
    expect(result.current.activeTemplateId).toBeNull();
  });

  it('applyDesignCompletion writes identity fields onto the unit', () => {
    const unit = makeProject({
      systemPackId: undefined,
      presetId: undefined,
      grid: undefined,
      components: [],
    });
    const next = applyDesignCompletion(unit, {
      components: [
        {
          id: 'c1',
          type: 'frame',
          width: 1210,
          height: 1550,
          length: 1210,
          quantity: 1,
        } as WindowUnit['components'][number],
      ],
      grid: F1_GRID,
      systemPackId: 'rock60',
      presetId: 'prestige-sliding-2',
    });

    expect(next.grid).toEqual(F1_GRID);
    expect(next.systemPackId).toBe('rock60');
    expect(next.presetId).toBe('prestige-sliding-2');
    expect(next.components).toHaveLength(1);
  });
});
