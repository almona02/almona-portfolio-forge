import type { WindowUnit } from '@/types/fabricator';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { authoritativeGridToDraftingState } from '../utils/authoritativeDraftingHydration';
import { convertDraftingToWindowGrid, DraftingGridConversionError } from '../utils/draftingToWindowGrid';
import { useDraftingEngine } from './useDraftingEngine';
import type { EgyptianTemplate } from '../types/drafting';

const project = {
  id: 'position-fp028',
  overallWidth: 1210,
  overallHeight: 1550,
  grid: {
    rows: 1,
    cols: 2,
    colWidths: [605, 605],
    rowHeights: [1550],
    cells: [
      { id: 'left', row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
      { id: 'right', row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
    ],
  },
} as WindowUnit;

describe('FP-028 / Phase 3 drafting edit metadata', () => {
  it('preserves source identity through update, undo and redo', () => {
    const initialState = authoritativeGridToDraftingState(project);
    const { result } = renderHook(() => useDraftingEngine({ initialState }));

    act(() => result.current.updateRectangle(0, {
      id: 'left',
      x: 0,
      y: 0,
      width: 600,
      height: 1550,
      type: 'sliding',
    }));
    expect(result.current.state.geometry.rectangles[0]).toMatchObject({
      sourceCellId: 'left',
      sourceCellType: 'sliding',
      sourceOpeningDirection: 'right',
      sourceRow: 0,
      sourceCol: 0,
    });

    act(() => result.current.undo());
    expect(result.current.state.geometry.rectangles[0]).toMatchObject({ sourceCellId: 'left', width: 605 });
    act(() => result.current.redo());
    expect(result.current.state.geometry.rectangles[0]).toMatchObject({ sourceCellId: 'left', width: 1200 });
  });

  it('preserves metadata when converting a rectangle to material-aware', () => {
    const initialState = authoritativeGridToDraftingState(project);
    const { result } = renderHook(() => useDraftingEngine({ initialState }));
    act(() => result.current.convertRectangleToMaterialAware(0, 'rock60'));
    expect(result.current.state.geometry.rectangles.find((rect) => rect.id === 'left')).toMatchObject({
      sourceCellId: 'left',
      sourceCellType: 'sliding',
      sourceOpeningDirection: 'right',
    });
  });

  it('strips source identity from duplicated free geometry', () => {
    const initialState = authoritativeGridToDraftingState(project);
    const { result } = renderHook(() => useDraftingEngine({ initialState }));
    act(() => result.current.duplicateRectangle(0));
    const duplicate = result.current.state.geometry.rectangles[2];
    expect(duplicate).toBeDefined();
    expect(duplicate).not.toHaveProperty('sourceCellId');
    expect(result.current.state.geometry.rectangles[0]).toMatchObject({ sourceCellId: 'left' });
  });

  it('retains metadata when a recovered state replaces the engine state', () => {
    const recovered = JSON.parse(JSON.stringify(authoritativeGridToDraftingState(project))) as ReturnType<typeof authoritativeGridToDraftingState>;
    const { result } = renderHook(() => useDraftingEngine());
    act(() => result.current.replaceState(recovered));
    expect(result.current.state.geometry.rectangles.map((rect) => rect.sourceCellId)).toEqual(['left', 'right']);
  });

  it('blocks a partial cell resize until shared boundaries reconcile', () => {
    const initialState = authoritativeGridToDraftingState(project);
    const { result } = renderHook(() => useDraftingEngine({ initialState }));
    act(() => result.current.updateRectangle(0, {
      ...initialState.geometry.rectangles[0],
      width: 1200,
    }));
    const template: EgyptianTemplate = {
      id: 'sliding-1x2',
      name: 'Sliding 1x2',
      rows: 1,
      cols: 2,
      cellTypes: [['sliding', 'sliding']],
      colWidthRatios: [1, 1],
      rowHeightRatios: [1],
      constraints: { minWidth: 1, maxWidth: 10000, minHeight: 1, maxHeight: 10000 },
    };
    expect(() => convertDraftingToWindowGrid(result.current.state.geometry, template)).toThrow(
      DraftingGridConversionError
    );
  });
});
