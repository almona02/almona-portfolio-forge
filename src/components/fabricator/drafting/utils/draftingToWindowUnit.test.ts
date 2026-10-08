import { describe, expect, it } from 'vitest';
import { draftingToWindowUnit } from './draftingToWindowUnit';
import type { DraftingStateSnapshot } from './draftingToWindowUnit';

describe('draftingToWindowUnit opening-type round-trip', () => {
  it('infers sliding from a 2-sash grid instead of hardcoding casement', () => {
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
            { id: '0-0', row: 0, col: 0, type: 'sash' },
            { id: '0-1', row: 0, col: 1, type: 'sash' },
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
