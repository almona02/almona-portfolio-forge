/**
 * L5 — ledger fixtures across opening layouts.
 * Assert ProfileBOMCalculator cut occurrences === countRequiredProfilePieces.
 */
import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';
import { assessBOMQualification, countRequiredProfilePieces } from './bomQualification';

const identity = {
  ownerUserId: 'owner',
  projectId: 'project',
  positionId: 'pose',
  source: 'v2' as const,
  revision: 1,
};

function grid(cols: number, rows: number, cellType: string, colWidths?: number[]): WindowGrid {
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({ id: `${r}-${c}`, row: r, col: c, type: cellType });
    }
  }
  return {
    rows,
    cols,
    cells,
    colWidths: colWidths ?? Array.from({ length: cols }, () => 1),
    rowHeights: Array.from({ length: rows }, () => 1),
  } as WindowGrid;
}

function unit(type: string, g: WindowGrid, w = 1200, h = 1400): WindowUnit {
  return {
    id: `wu-${type}-${g.cols}x${g.rows}`,
    type,
    overallWidth: w,
    overallHeight: h,
    systemPackId: 'caluminium-ps',
    grid: g,
  } as WindowUnit;
}

function patternFor(type: string, g: WindowGrid): EgyptianPattern {
  return {
    id: `pat-${type}`,
    name: type,
    type: type.includes('sliding') ? 'sliding' : type.includes('tilt') ? 'tilt_turn' : type,
    openingMechanism: type.includes('sliding') ? { type: 'sliding' } : undefined,
    gridSpec: g,
    mullions: [],
    transoms: [],
  } as unknown as EgyptianPattern;
}

describe('physical ledger layout fixtures (L5)', () => {
  const calculator = new ProfileBOMCalculator();

  const cases: Array<{ name: string; type: string; g: WindowGrid; w?: number; h?: number }> = [
    { name: 'fixed 1×1', type: 'fixed_window', g: grid(1, 1, 'fixed') },
    { name: 'casement 1 sash', type: 'casement', g: grid(1, 1, 'sash') },
    { name: 'sliding 2-panel', type: 'sliding_window_2sash', g: grid(2, 1, 'sash') },
    { name: 'sliding 4-panel', type: 'sliding_window_4sash', g: grid(4, 1, 'sash'), w: 2800 },
    { name: 'tilt-turn 1 sash', type: 'tilt_turn', g: grid(1, 1, 'sash') },
    {
      name: 'asymmetric 2-panel sliding',
      type: 'sliding_window_2sash',
      g: grid(2, 1, 'sash', [1, 2]),
      w: 1500,
      h: 1600,
    },
    {
      name: 'mixed fixed+sash row (casement)',
      type: 'casement',
      g: {
        rows: 1,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'fixed' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
        ],
        colWidths: [1, 1],
        rowHeights: [1],
      } as WindowGrid,
    },
  ];

  it.each(cases)('$name: generated cuts reconcile with required ledger', async ({ type, g, w, h }) => {
    const wu = unit(type, g, w, h);
    const pattern = patternFor(type, g);
    const profiles = await calculator.calculateProfileBOM(wu, pattern, CALUMINIUM_PS_PACK);
    const generated = profiles.reduce((n, p) => n + p.cuttingLengths.length, 0);
    const required = countRequiredProfilePieces(wu, pattern);

    expect(generated).toBe(required);

    const qualification = assessBOMQualification(wu, pattern, profiles, {
      identity,
      catalogueVersion: 'fixture-catalogue',
      ruleVersion: 'fixture-rules',
    });
    expect(qualification.status).toBe('qualified');
    expect(qualification.unplacedPieceCount).toBe(0);
    expect(qualification.reasons).toEqual([]);
  });
});
