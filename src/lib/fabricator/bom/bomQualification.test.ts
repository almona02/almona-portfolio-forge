import { describe, expect, it } from 'vitest';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { FabricationData, WindowUnit } from '@/types/fabricator';
import { assessBOMQualification } from './bomQualification';

const project = {
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
  it('blocks an aggregate ledger and missing approved versions', () => {
    const result = assessBOMQualification(project, pattern, profiles(6), { identity });

    expect(result.status).toBe('estimate');
    expect(result.requiredPieceCount).toBe(12);
    expect(result.generatedPieceCount).toBe(6);
    expect(result.unplacedPieceCount).toBe(6);
    expect(result.reasons).toContain('Approved catalogue version is missing');
  });

  it('qualifies only a fully reconciled, version-bound ledger', () => {
    const result = assessBOMQualification(project, pattern, profiles(12), {
      identity,
      catalogueVersion: 'catalogue-1',
      ruleVersion: 'rules-1',
    });

    expect(result).toMatchObject({ status: 'qualified', unplacedPieceCount: 0, reasons: [] });
  });
});
