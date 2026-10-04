import { act, renderHook } from '@testing-library/react';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEngineeringEngine } from './useEngineeringEngine';

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
