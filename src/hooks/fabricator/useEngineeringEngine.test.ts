import { act, renderHook } from '@testing-library/react';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEngineeringEngine } from './useEngineeringEngine';
import type { SystemPack } from '@/data/systemPacks';

const calculateBOM = vi.fn();

vi.mock('@/hooks/useBOMCalculation', () => ({
  useBOMCalculation: () => ({
    calculateBOM,
    isCalculating: false,
  }),
}));

const savedGrid: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'left', row: 0, col: 0, type: 'sliding' },
    { id: 'right', row: 0, col: 1, type: 'sliding' },
  ],
  colWidths: [605, 605],
  rowHeights: [1550],
};

const project = {
  id: 'position-1',
  projectId: 'project-1',
  orderNumber: 'ORDER-1',
  posNumber: '1',
  type: 'sliding',
  overallWidth: 1210,
  overallHeight: 1550,
  color: 'white',
  quantity: 1,
  components: [],
  hardware: [],
  status: 'design',
  optimization: null,
  createdAt: new Date('2026-10-04T00:00:00Z'),
  updatedAt: new Date('2026-10-04T00:00:00Z'),
  systemPackId: 'rock60',
  grid: savedGrid,
} satisfies WindowUnit;

describe('useEngineeringEngine system selection', () => {
  beforeEach(() => calculateBOM.mockReset());

  it('retains dividers and rejects stale external profile selections', () => {
    const frame = { id: 'owned-frame', name: 'Frame', material: 'aluminum', width: 60, height: 60, thickness: 1.8, profileRole: 'frame', cuttingAllowance: 3 };
    const divider = { ...frame, id: 'owned-divider', name: 'Divider', profileRole: 'mullion' };
    const custom = { meta: { id: 'custom' }, profiles: [frame, divider] } as unknown as SystemPack;
    const fixed = { ...project, type: 'fixed', systemPackId: 'custom', presetId: undefined,
      systemProfileSelections: { frameProfileCode: 'external' },
      grid: { rows: 1, cols: 2, cells: [{ id: 'left', row: 0, col: 0, type: 'fixed' }, { id: 'right', row: 0, col: 1, type: 'fixed' }] } } as WindowUnit;
    const { result } = renderHook(() => useEngineeringEngine({ project: fixed, profiles: [{ ...frame, id: 'external' } as any], systemPacks: [custom], onDesignComplete: vi.fn() }));
    const components = result.current.liveProject!.components;
    expect(components.reduce((sum, component) => sum + component.cuttingLengths.length, 0)).toBe(5);
    expect(components.some(component => component.profile.id === 'owned-divider')).toBe(true);
    expect(components.some(component => component.profile.id === 'external')).toBe(false);
  });

  it('resolves a persisted custom pack after it loads without replacing saved geometry', () => {
    const custom = {
      meta: { id: 'custom-e2e', name: 'E2E', brands: ['Custom'], regions: ['egypt'] },
      profiles: [
        { id: 'frame-owned', name: 'Frame', material: 'aluminum', width: 60, height: 60, thickness: 1.8, profileRole: 'frame', stockQuantity: 12, costPerMeter: 0, cuttingAllowance: 3 },
        { id: 'sash-owned', name: 'Sash', material: 'aluminum', width: 72, height: 72, thickness: 1.8, profileRole: 'sash', stockQuantity: 18, costPerMeter: 0, cuttingAllowance: 3 },
      ],
    } as unknown as SystemPack;
    const { result, rerender } = renderHook(({ packs }) => useEngineeringEngine({
      project: { ...project, systemPackId: custom.meta.id, presetId: undefined },
      profiles: [],
      systemPacks: packs,
      onDesignComplete: vi.fn(),
    }), { initialProps: { packs: [] as SystemPack[] } });
    rerender({ packs: [custom] });
    expect(result.current.currentGrid).toEqual(savedGrid);
    expect(result.current.liveProject?.components.length).toBeGreaterThan(0);
    expect(result.current.liveProject?.components.some(component => component.profile.id === 'frame-owned')).toBe(true);
    expect(result.current.liveProject?.components.some(component => component.profile.id === 'sash-owned')).toBe(true);
  });

  it('preserves authoritative geometry when the system pack changes', () => {
    const { result } = renderHook(() => useEngineeringEngine({
      project,
      profiles: [],
      onDesignComplete: vi.fn(),
    }));

    act(() => result.current.actions.selectSystem('panda-50'));

    expect(result.current.activeSystemPackId).toBe('panda-50');
    expect(result.current.currentGrid).toEqual(savedGrid);
  });
});
