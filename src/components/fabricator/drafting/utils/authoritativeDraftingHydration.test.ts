import { describe, expect, it } from 'vitest';
import type { WorkflowIdentity } from '@/store/workflowStore';
import type { WindowUnit } from '@/types/fabricator';
import {
  authoritativeGridToDraftingState,
  draftingIdentityKey,
} from './authoritativeDraftingHydration';

const project = {
  id: 'position-a',
  overallWidth: 1210,
  overallHeight: 1550,
  grid: {
    rows: 1,
    cols: 2,
    colWidths: [1, 1],
    rowHeights: [1],
    cells: [
      { id: 'left', row: 0, col: 0, type: 'sliding' },
      { id: 'right', row: 0, col: 1, type: 'sliding' },
    ],
  },
} as WindowUnit;

describe('authoritative drafting hydration', () => {
  it('maps the saved two-cell sliding layout deterministically', () => {
    const state = authoritativeGridToDraftingState(project);

    expect(state.geometry.rectangles).toEqual([
      expect.objectContaining({ id: 'left', x: 0, y: 0, width: 605, height: 1550, type: 'sliding', sourceCellType: 'sliding' }),
      expect.objectContaining({ id: 'right', x: 605, y: 0, width: 605, height: 1550, type: 'sliding', sourceCellType: 'sliding' }),
    ]);
    expect(state.activeTemplate?.id).toBe('egyptian_sliding_1x2');
    expect(state.materialWindowGrids?.['position-a']).toEqual(project.grid);
  });

  it('preserves proportions and spans without profile dimensions', () => {
    const state = authoritativeGridToDraftingState({
      ...project,
      grid: {
        rows: 2,
        cols: 2,
        colWidths: [2, 1],
        rowHeights: [1, 3],
        cells: [{ id: 'span', row: 0, col: 0, colSpan: 2, type: 'fixed' }],
      },
    });

    expect(state.geometry.rectangles[0]).toEqual(expect.objectContaining({
      id: 'span',
      x: 0,
      y: 0,
      width: 1210,
      height: 387.5,
      sourceColSpan: 2,
    }));
    expect(state.materialAwareWindows).toEqual([]);
  });

  it('scopes state by owner, project, position, source and revision', () => {
    const identity: WorkflowIdentity = {
      ownerUserId: 'owner-a',
      projectId: 'project-a',
      positionId: 'position-a',
      source: 'v2',
      revision: 3,
    };
    expect(draftingIdentityKey(identity)).not.toBe(draftingIdentityKey({ ...identity, ownerUserId: 'owner-b' }));
    expect(draftingIdentityKey(identity)).not.toBe(draftingIdentityKey({ ...identity, positionId: 'position-b' }));
    expect(draftingIdentityKey(identity)).not.toBe(draftingIdentityKey({ ...identity, revision: 4 }));
  });
});
