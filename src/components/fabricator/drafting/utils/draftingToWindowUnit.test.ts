import { describe, expect, it } from 'vitest';
import type { WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { authoritativeGridToDraftingState } from './authoritativeDraftingHydration';
import { draftingToWindowUnit, gridLedgerSignature } from './draftingToWindowUnit';
import type { DraftingStateSnapshot } from './draftingToWindowUnit';

/** Saved CALUMINIUM PS 2-sash sliding pose (FP-Y0RIPV pos 1, R9) as hydrated from positions_v2. */
const R9_GRID: WindowGrid = {
  rows: 1, cols: 2, colWidths: [1, 1], rowHeights: [1],
  cells: [
    { id: '0-0', row: 0, col: 0, type: 'sash' },
    { id: '0-1', row: 0, col: 1, type: 'sash' },
  ],
};
function savedR9(): WindowUnit {
  const component = (id: string, type: string, profileId: string, raw: number[]): WindowComponent => ({
    id, type, profile: { id: profileId, material: 'aluminum' } as WindowComponent['profile'], quantity: 1,
    cuttingLengths: raw, angles: [45, 45], machiningOperations: [], glazingType: 'none', hardware: [], width: 0, height: 0,
  });
  return {
    id: '3ecb65c7-8897-4cce-8392-23c78441ff08', projectId: 'proj-1', orderNumber: 'FP-Y0RIPV', posNumber: '1',
    type: 'sliding_window_2sash', overallWidth: 1500, overallHeight: 1800, systemPackId: 'caluminium-ps',
    revision: 9, color: 'bronze', grid: R9_GRID, glazing: {}, hardware: {} as never, status: 'design',
    optimization: null, createdAt: new Date(0), updatedAt: new Date(0),
    components: [
      component('frame_top_1793549220583', 'frame', 'PS-6601-FRAME', [1500]),
      component('sash_0-0_top', 'sash', 'PS-6601-SASH', [652.85]),
    ],
  };
}
function snapshotOf(state: ReturnType<typeof authoritativeGridToDraftingState>): DraftingStateSnapshot {
  return {
    getGeometry: () => state.geometry,
    getMaterialAwareWindows: () => state.materialAwareWindows,
    getMaterialWindowGrids: () => state.materialWindowGrids ?? {},
    getMaterialWindowGlazing: () => state.materialWindowGlazing as never,
  };
}

describe('draftingToWindowUnit with a saved position (reload path)', () => {
  it('reproduces the blank-preview case: hydrated saved pose has no material-aware frame', () => {
    const state = authoritativeGridToDraftingState(savedR9());
    expect(state.materialAwareWindows).toHaveLength(0);
    expect(state.geometry.rectangles).toHaveLength(2);
    // Before Batch 3 this returned null and the 3D tab fell back to bare rectangles.
    expect(draftingToWindowUnit(snapshotOf(state))).toBeNull();
  });

  it('carries system, finish, dimensions, revision and the saved part ledger into the preview', () => {
    const saved = savedR9();
    const unit = draftingToWindowUnit(snapshotOf(authoritativeGridToDraftingState(saved)), saved);
    expect(unit).not.toBeNull();
    expect(unit).toMatchObject({
      id: saved.id, projectId: 'proj-1', orderNumber: 'FP-Y0RIPV', revision: 9,
      systemPackId: 'caluminium-ps', color: 'bronze', overallWidth: 1500, overallHeight: 1800,
      type: 'sliding', previewLedgerBinding: 'bound',
    });
    expect(unit!.grid?.cells.map((c) => c.id)).toEqual(['0-0', '0-1']);
    expect(unit!.components.map((c) => c.id)).toEqual(['frame_top_1793549220583', 'sash_0-0_top']);
    expect(unit!.hardware).toEqual([]);
    // Reload: the same saved row yields the same preview identity.
    const reloaded = JSON.parse(JSON.stringify(saved)) as WindowUnit;
    const again = draftingToWindowUnit(snapshotOf(authoritativeGridToDraftingState(reloaded)), reloaded);
    expect(again!.components.map((c) => c.id)).toEqual(unit!.components.map((c) => c.id));
    expect(again!.color).toBe('bronze');
  });

  it('withholds saved part codes when the drafted frame no longer matches the saved revision', () => {
    const saved = savedR9();
    const edited: DraftingStateSnapshot = {
      getGeometry: () => ({ rectangles: [{}] }),
      getMaterialAwareWindows: () => [{ id: 'frame-x', width: 1500, height: 1800, systemPackId: 'caluminium-ps' } as never],
      getMaterialWindowGrids: () => ({
        'frame-x': { rows: 1, cols: 3, cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'fixed' }, { id: '0-2', row: 0, col: 2, type: 'sash' },
        ] },
      }),
    };
    const unit = draftingToWindowUnit(edited, saved);
    expect(unit!.previewLedgerBinding).toBe('design_edited');
    expect(unit!.components).toEqual([]);
    expect(unit!.color).toBe('bronze');
    expect(unit!.systemPackId).toBe('caluminium-ps');
  });

  it('binds the ledger when the operator re-defined the same grid as a frame', () => {
    const saved = savedR9();
    const defined: DraftingStateSnapshot = {
      getGeometry: () => ({ rectangles: [{}] }),
      getMaterialAwareWindows: () => [{ id: 'frame-y', width: 1500, height: 1800, systemPackId: 'caluminium-ps' } as never],
      getMaterialWindowGrids: () => ({ 'frame-y': R9_GRID }),
    };
    const unit = draftingToWindowUnit(defined, saved);
    expect(unit!.previewLedgerBinding).toBe('bound');
    expect(unit!.components).toHaveLength(2);
    expect(unit!.id).toBe(saved.id);
  });

  it('is explicit when the saved revision has no component ledger', () => {
    const saved = { ...savedR9(), components: [] };
    const unit = draftingToWindowUnit(snapshotOf(authoritativeGridToDraftingState(saved)), saved);
    expect(unit!.previewLedgerBinding).toBe('no_saved_ledger');
  });

  it('signature ignores cell order but not cell type, span or size', () => {
    const a = gridLedgerSignature(R9_GRID, 1500, 1800);
    const b = gridLedgerSignature({ ...R9_GRID, cells: [...R9_GRID.cells].reverse() }, 1500, 1800);
    expect(a).toBe(b);
    expect(gridLedgerSignature({ ...R9_GRID, cells: [R9_GRID.cells[0], { ...R9_GRID.cells[1], type: 'fixed' }] }, 1500, 1800)).not.toBe(a);
    expect(gridLedgerSignature(R9_GRID, 1500, 1810)).not.toBe(a);
  });
});

describe('draftingToWindowUnit opening-type round-trip', () => {
  it('infers sliding from explicit sliding cells (bare sash stays casement)', () => {
    const drafting: DraftingStateSnapshot = {
      getGeometry: () => ({ rectangles: [] }),
      getMaterialAwareWindows: () => [
        {
          id: 'frame-1',
          width: 1400,
          height: 1500,
          systemPackId: 'caluminium-ps',
        } as never,
      ],
      getMaterialWindowGrids: () => ({
        'frame-1': {
          rows: 1,
          cols: 2,
          cells: [
            // normalizeOpeningType: two bare "sash" cells ≠ sliding proof.
            { id: '0-0', row: 0, col: 0, type: 'sliding' },
            { id: '0-1', row: 0, col: 1, type: 'sliding' },
          ],
        },
      }),
    };

    const unit = draftingToWindowUnit(drafting);
    expect(unit).not.toBeNull();
    expect(unit!.type).toBe('sliding');
    expect(unit!.grid?.cols).toBe(2);
    expect(unit!.systemPackId).toBe('caluminium-ps');
  });

  it('keeps casement for multi-cell bare sash grids without sliding markers', () => {
    const drafting: DraftingStateSnapshot = {
      getGeometry: () => ({ rectangles: [] }),
      getMaterialAwareWindows: () => [
        {
          id: 'frame-1b',
          width: 1400,
          height: 1500,
          systemPackId: 'caluminium-ps',
        } as never,
      ],
      getMaterialWindowGrids: () => ({
        'frame-1b': {
          rows: 1,
          cols: 2,
          cells: [
            { id: '0-0', row: 0, col: 0, type: 'sash' },
            { id: '0-1', row: 0, col: 1, type: 'sash' },
          ],
        },
      }),
    };

    const unit = draftingToWindowUnit(drafting);
    expect(unit).not.toBeNull();
    expect(unit!.type).toBe('casement');
  });

  it('keeps casement when type string says casement', () => {
    const drafting: DraftingStateSnapshot = {
      getGeometry: () => ({ rectangles: [] }),
      getMaterialAwareWindows: () => [
        {
          id: 'frame-2',
          width: 900,
          height: 1200,
          openingType: 'casement',
        } as never,
      ],
      getMaterialWindowGrids: () => ({
        'frame-2': {
          rows: 1,
          cols: 1,
          cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }],
        },
      }),
    };
    expect(draftingToWindowUnit(drafting)?.type).toBe('casement');
  });
});
