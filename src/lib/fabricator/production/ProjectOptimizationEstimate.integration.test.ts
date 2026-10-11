import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import type { WindowUnit } from '@/types/fabricator';
import { optimizeProjectEstimateWithDesignParity, patternForLedgerCount } from './ProjectOptimizationEstimate';

async function legacyPose() {
  const unit = { id: 'legacy', posNumber: '1', quantity: 2, revision: 7,
    overallWidth: 1200, overallHeight: 1400, type: 'sliding_window_2sash',
    systemPackId: 'caluminium-ps', components: [], grid: { rows: 1, cols: 2,
      cells: [{ id: 'a', row: 0, col: 0, type: 'sash' }, { id: 'b', row: 0, col: 1, type: 'sash' }],
      colWidths: [1, 1], rowHeights: [1] } } as unknown as WindowUnit;
  const complete = await new ProfileBOMCalculator().resolveCanonicalDesignLedger(unit, patternForLedgerCount(unit), CALUMINIUM_PS_PACK);
  unit.components = complete.filter(c => (c.profile as any).bomRole !== 'track' && c.type !== 'track');
  expect(unit.components.reduce((n, c) => n + c.cuttingLengths.length, 0)).toBe(21);
  return unit;
}

describe('strict project estimate with legacy sliding completion', () => {
  it('completes missing tracks before exact parity without modifying saved cuts', async () => {
    const unit = await legacyPose();
    const saved = JSON.stringify(unit);
    const result = await optimizeProjectEstimateWithDesignParity([unit], [CALUMINIUM_PS_PACK]);
    expect(result.pieces).toBe(46);
    expect(JSON.stringify(unit)).toBe(saved);
    expect(result.manufacturingEligible).toBe(false);
  });
  it('still rejects a tampered cut in an otherwise completable ledger', async () => {
    const unit = await legacyPose();
    unit.components[0].cuttingLengths[0] += 5;
    await expect(optimizeProjectEstimateWithDesignParity([unit], [CALUMINIUM_PS_PACK])).rejects.toThrow();
  });
});