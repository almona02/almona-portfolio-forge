import { describe, expect, it } from 'vitest';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { FabricationData, WindowUnit } from '@/types/fabricator';
import {
  assessBOMQualification,
  countRequiredProfilePieces,
  isQualifiedBOM,
} from './bomQualification';

const slidingProject = {
  type: 'sliding_window_2sash',
  grid: {
    rows: 1,
    cols: 2,
    cells: [
      { id: 'left', row: 0, col: 0, type: 'sliding' },
      { id: 'right', row: 0, col: 1, type: 'sliding' },
    ],
  },
} as WindowUnit;

const pattern = { mullions: [], transoms: [] } as unknown as EgyptianPattern;
const identity = {
  ownerUserId: 'owner',
  projectId: 'project',
  positionId: 'position',
  source: 'v2',
  revision: 3,
} as const;

function profiles(pieceCount: number): FabricationData['profiles'] {
  return [{ cuttingLengths: Array.from({ length: pieceCount }, () => 1000) }] as FabricationData['profiles'];
}

describe('BOM manufacturing qualification', () => {
  it('counts sliding subsystem cuts in the required ledger (not frame+sash only)', () => {
    // 4 frame + 8 sash + 1 interlock + 2 track + 8 bead = 23
    expect(countRequiredProfilePieces(slidingProject, pattern)).toBe(23);
  });

  it('keeps casement/fixed ledgers without sliding extras', () => {
    const casement = {
      type: 'casement',
      grid: {
        rows: 1,
        cols: 1,
        cells: [{ id: 'a', row: 0, col: 0, type: 'sash' }],
      },
    } as WindowUnit;
    // 4 frame + 4 sash + 4 glazing bead (design generator always emits beads per sash)
    expect(countRequiredProfilePieces(casement, pattern)).toBe(12);

    const fixed = {
      type: 'fixed_window',
      grid: {
        rows: 1,
        cols: 1,
        cells: [{ id: 'a', row: 0, col: 0, type: 'fixed' }],
      },
    } as WindowUnit;
    expect(countRequiredProfilePieces(fixed, pattern)).toBe(4);
  });

  it('rejects a bare qualified status without identity, versions and reconciled counts', () => {
    expect(isQualifiedBOM({ qualification: { status: 'qualified', unplacedPieceCount: 0 } as never })).toBe(false);
  });

  it('blocks an aggregate ledger and missing approved versions', () => {
    const result = assessBOMQualification(slidingProject, pattern, profiles(6), { identity });

    expect(result.status).toBe('estimate');
    expect(result.requiredPieceCount).toBe(23);
    expect(result.generatedPieceCount).toBe(6);
    expect(result.unplacedPieceCount).toBe(17);
    expect(result.reasons).toContain('Approved catalogue version is missing');
  });

  it('qualifies only a fully reconciled, version-bound ledger', () => {
    const result = assessBOMQualification(slidingProject, pattern, profiles(23), {
      identity,
      catalogueVersion: 'catalogue-1',
      ruleVersion: 'rules-1',
    });
    expect(result).toMatchObject({ status: 'qualified', unplacedPieceCount: 0, reasons: [] });
  });
});
