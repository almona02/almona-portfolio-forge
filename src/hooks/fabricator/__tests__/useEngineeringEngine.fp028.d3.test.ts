/**
 * FP-028 / Phase 0 / D3
 *
 * Late BOM responses must not commit after identity/system/grid changes.
 * A → B switch while A's BOM is in flight must discard A's result.
 */
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stableT = vi.hoisted(() => (key: string, defaultVal?: string) => defaultVal || key);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
  }),
}));

const bomTestState = vi.hoisted(() => {
  type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
  };

  function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  const bomCalls: Array<{ systemPackId: string }> = [];
  let rock60Deferred: Deferred<{ tag: string }> | null = null;

  const calculateBOMMock = vi.fn(
    (_unit: WindowUnit, _pattern: unknown, systemPack: { meta: { id: string } }) => {
      const systemPackId = systemPack?.meta?.id;
      bomCalls.push({ systemPackId });
      if (systemPackId === 'rock60') {
        rock60Deferred = deferred<{ tag: string }>();
        return rock60Deferred.promise;
      }
      return Promise.resolve({ tag: `bom-${systemPackId}` });
    }
  );

  return {
    bomCalls,
    calculateBOMMock,
    getRock60Deferred: () => rock60Deferred,
    resetRock60Deferred: () => {
      rock60Deferred = null;
    },
  };
});

vi.mock('@/hooks/useBOMCalculation', () => ({
  useBOMCalculation: () => ({
    calculateBOM: bomTestState.calculateBOMMock,
    isCalculating: false,
  }),
}));

vi.mock('@/algorithms/smartDraw', () => ({
  generateComponentsFromGrid: () => ({
    components: [{ id: 'comp-1', type: 'frame' }],
    hardware: [],
  }),
}));

vi.mock('@/lib/fabricator/hardwareConnector', () => ({
  connectHardwareForWindowType: () => [],
}));

const transformMock = vi.hoisted(() =>
  vi.fn((result: { tag: string }) => result)
);

vi.mock('@/components/fabricator/bom/utils/transformBOMResult', () => ({
  transformWorkerResultToBOMData: (result: { tag: string }) => transformMock(result),
}));

vi.mock('@/components/fabricator/utils/hardwareMergingUtils', () => ({
  mergeHardwareArrays: (a: unknown[], b: unknown[]) => [...(a || []), ...(b || [])],
}));

import { buildBomRequestKey, useEngineeringEngine } from '../useEngineeringEngine';

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
    { id: 'casement-0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
    { id: 'fixed-1', row: 0, col: 1, type: 'fixed' },
  ],
  colWidths: [900, 600],
  rowHeights: [1400],
};

function makeProject(grid: WindowGrid, overrides: Partial<WindowUnit> = {}): WindowUnit {
  return {
    id: 'fp028-d3-position',
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
    revision: 1,
    quantity: 1,
    grid,
    ...overrides,
  };
}

/** Stable across hook re-renders — inline `[]` / `vi.fn()` would retrigger liveProject → wipe BOM. */
const STABLE_PROFILES: never[] = [];
const onDesignComplete = vi.fn();

describe('FP-028 / D3 — late BOM must not commit after identity change', () => {
  beforeEach(() => {
    bomTestState.bomCalls.length = 0;
    bomTestState.resetRock60Deferred();
    bomTestState.calculateBOMMock.mockClear();
    transformMock.mockClear();
    onDesignComplete.mockClear();
  });

  it('buildBomRequestKey changes when system, revision, or grid changes', () => {
    const unit = makeProject(GRID_A);
    const base = buildBomRequestKey(unit, 'rock60', GRID_A);
    expect(buildBomRequestKey(unit, 'jumbo100', GRID_A)).not.toBe(base);
    expect(buildBomRequestKey({ ...unit, revision: 2 }, 'rock60', GRID_A)).not.toBe(base);
    expect(buildBomRequestKey(unit, 'rock60', GRID_B)).not.toBe(base);
    expect(buildBomRequestKey(unit, 'rock60', GRID_A)).toBe(base);
  });

  it('discards rock60 BOM that resolves after switch to jumbo100', async () => {
    const project = makeProject(GRID_A);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: STABLE_PROFILES,
        onDesignComplete,
      })
    );

    await waitFor(() => {
      expect(bomTestState.bomCalls.some((c) => c.systemPackId === 'rock60')).toBe(true);
    });

    const stale = bomTestState.getRock60Deferred();
    expect(stale).not.toBeNull();

    act(() => {
      result.current.actions.selectSystem('jumbo100');
    });

    await act(async () => {
      stale!.resolve({ tag: 'bom-rock60-STALE' });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.activeSystemPackId).toBe('jumbo100');
      expect(result.current.bomData).not.toEqual({ tag: 'bom-rock60-STALE' });
    });

    await waitFor(() => {
      expect(bomTestState.bomCalls.some((c) => c.systemPackId === 'jumbo100')).toBe(true);
    });

    await waitFor(() => {
      expect(transformMock).toHaveBeenCalledWith({ tag: 'bom-jumbo100' });
      expect(result.current.bomData).toEqual({ tag: 'bom-jumbo100' });
    });
  });

  it('discards stale BOM after grid change under the same system', async () => {
    const project = makeProject(GRID_A);
    const { result } = renderHook(() =>
      useEngineeringEngine({
        project,
        profiles: STABLE_PROFILES,
        onDesignComplete,
      })
    );

    await waitFor(() => {
      expect(bomTestState.getRock60Deferred()).not.toBeNull();
    });

    const firstDeferred = bomTestState.getRock60Deferred()!;

    act(() => {
      result.current.actions.applyGrid(GRID_B);
    });

    await waitFor(() => {
      expect(bomTestState.getRock60Deferred()).not.toBe(firstDeferred);
    });

    await act(async () => {
      firstDeferred.resolve({ tag: 'bom-grid-A-STALE' });
      await Promise.resolve();
    });

    expect(result.current.bomData).not.toEqual({ tag: 'bom-grid-A-STALE' });

    await act(async () => {
      bomTestState.getRock60Deferred()!.resolve({ tag: 'bom-grid-B-CURRENT' });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.bomData).toEqual({ tag: 'bom-grid-B-CURRENT' });
    });
  });
});
