import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';
import { reconcilePoseCutLedger, savedLedgerNeedsMaterialize } from './ledgerParity';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';

const pattern = {
  id: 'sliding-2s',
  name: 'Sliding 2',
  type: 'sliding',
  openingMechanism: { type: 'sliding' },
  gridSpec: {
    rows: 1,
    cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'sash' },
      { id: '0-1', row: 0, col: 1, type: 'sash' },
    ],
    colWidths: [1, 1],
    rowHeights: [1],
  },
} as unknown as EgyptianPattern;

describe('ledgerParity reconcile', () => {
  it('accepts a saved ledger that matches the design generator multiset', async () => {
    const unit = {
      id: 'pose-1',
      posNumber: '1',
      revision: 7,
      overallWidth: 1200,
      overallHeight: 1400,
      type: 'sliding_window_2sash',
      systemPackId: 'caluminium-ps',
      grid: pattern.gridSpec,
      components: [],
    } as unknown as WindowUnit;
    const expected = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
      unit,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    const withLedger = { ...unit, components: expected };
    await expect(
      reconcilePoseCutLedger({
        position: withLedger,
        pattern,
        pack: CALUMINIUM_PS_PACK,
        revision: 7,
      }),
    ).resolves.toHaveLength(expected.length);
    expect(savedLedgerNeedsMaterialize(expected, expected)).toBe(false);
  });

  it('rejects same-count dimension drift against the design generator', async () => {
    const unit = {
      id: 'pose-2',
      posNumber: '2',
      revision: 4,
      overallWidth: 1200,
      overallHeight: 1400,
      type: 'sliding_window_2sash',
      systemPackId: 'caluminium-ps',
      grid: pattern.gridSpec,
      components: [],
    } as unknown as WindowUnit;
    const at1200 = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
      unit,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    const drifted = {
      ...unit,
      overallWidth: 1800,
      components: at1200,
    } as WindowUnit;
    await expect(
      reconcilePoseCutLedger({
        position: drifted,
        pattern,
        pack: CALUMINIUM_PS_PACK,
        revision: 4,
      }),
    ).rejects.toThrow(/Pose 2 revision 4: cut ledger multiset mismatch/);
    expect(savedLedgerNeedsMaterialize(
      at1200,
      await new ProfileBOMCalculator().resolveCanonicalDesignLedger(
        { ...drifted, components: [] },
        pattern,
        CALUMINIUM_PS_PACK,
      ),
    )).toBe(true);
  });
});
