import { describe, expect, it } from 'vitest';

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack, WindowUnit } from '@/types/fabricator';

import { ProfileBOMCalculator } from './ProfileBOMCalculator';

const systemPack = {
  id: 'rock-60',
  profiles: [
    { id: 'frame-60', profileRole: 'frame', width: 60 },
    { id: 'sash-60', profileRole: 'sash', width: 60 },
  ],
} as unknown as SystemPack;

const project = {
  overallWidth: 1210,
  overallHeight: 1550,
  grid: {
    rows: 1,
    cols: 2,
    cells: [
      { id: 'left', row: 0, col: 0, type: 'sliding' },
      { id: 'right', row: 0, col: 1, type: 'sliding' },
    ],
  },
} as WindowUnit;

const pattern = {
  id: 'sliding-2',
  name: 'Two sash sliding',
  type: 'sliding',
  layout: 'Two sash sliding',
  typicalWidthMm: [600, 2400],
  typicalHeightMm: [600, 2400],
  compatibleSystems: ['rock-60'],
  gridSpec: {
    rows: 1,
    cols: 2,
    cells: [
      { row: 0, col: 0, type: 'sliding' },
      { row: 0, col: 1, type: 'sliding' },
    ],
  },
} satisfies EgyptianPattern;

describe('ProfileBOMCalculator physical piece ledger', () => {
  it('emits two horizontal and two vertical cuts per sash', async () => {
    const profiles = await new ProfileBOMCalculator().calculateProfileBOM(
      project,
      pattern,
      systemPack,
    );
    const sash = profiles.find(profile => profile.role === 'sash');

    expect(sash?.quantity).toBe(2);
    expect(sash?.cuttingLengths).toHaveLength(8);
    expect(sash?.angles).toHaveLength(8);
    expect(sash?.cuttingLengths.every(Number.isFinite)).toBe(true);
    expect(sash?.length).toBeCloseTo(
      sash?.cuttingLengths.reduce((sum, value) => sum + value, 0) ?? 0,
      8,
    );
    expect(sash?.cuttingLengths.filter(length => length < 1000)).toHaveLength(4);
    expect(sash?.cuttingLengths.filter(length => length > 1000)).toHaveLength(4);
  });
});
