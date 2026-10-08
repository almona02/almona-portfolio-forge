import { describe, expect, it, vi } from 'vitest';
import type { Profile, SystemPack, WindowUnit } from '@/types/fabricator';
import { optimizeProjectEstimate } from './ProjectOptimizationEstimate';

vi.mock('@/lib/fabricator/optimization/physicalCutContract', () => ({
  physicalCutForOccurrence: (component: WindowUnit['components'][number], index: number) => ({ length: component.cuttingLengths[index] }),
}));

const profile = { id: 'frame', barLength: 6000, specifications: { sawKerf: 4.2, barEndTrim: 20 } } as unknown as Profile;
const pack = { meta: { id: 'pack' }, profiles: [profile] } as SystemPack;
function pose(id: string, cols = 1, rows = 1): WindowUnit {
  return { id, posNumber: id, systemPackId: 'pack', quantity: 1, overallWidth: 1200, overallHeight: 1400,
    grid: { rows, cols, cells: Array.from({ length: rows * cols }, (_, index) => ({ id: String(index), row: Math.floor(index / cols), col: index % cols, type: 'fixed' })) },
    components: [{ id: 'frame', type: 'frame', profile, cuttingLengths: [1200,1200,1400,1400, ...Array(cols + rows - 2).fill(1000)] }],
  } as WindowUnit;
}

describe('project cutting estimate', () => {
  it('optimizes ten layouts together, retains all pieces and remains estimate only', () => {
    const layouts = [[1,1],[2,1],[1,2],[2,2],[3,1],[1,3],[3,2],[2,3],[4,1],[4,2]];
    const positions = layouts.map(([cols, rows], index) => pose(String(index + 1), cols, rows));
    positions[0].quantity = 2;
    const estimate = optimizeProjectEstimate(positions, [pack]);
    const expected = positions.reduce((sum, position) => sum + position.components[0].cuttingLengths.length * (position.quantity ?? 1), 0);
    expect(estimate.positions).toBe(10);
    expect(estimate.pieces).toBe(expected);
    expect(estimate.groups).toHaveLength(1);
    expect(estimate.groups[0].result.stockUsed.flatMap(bar => bar.cuts)).toHaveLength(expected);
    expect(estimate.groups[0].kerfMm).toBe(4.2);
    expect(estimate.groups[0].trimMm).toBe(20);
    expect(estimate.manufacturingEligible).toBe(false);
    expect(estimate.classification).toBe('estimate_only');
  });
  it('does not pool distinct systems even when profile IDs match', () => {
    const other = pose('2'); other.systemPackId = 'other';
    const result = optimizeProjectEstimate([pose('1'), other], [pack, { ...pack, meta: { ...pack.meta, id: 'other' } }]);
    expect(result.groups).toHaveLength(2);
  });
  it('fails the entire estimate for missing divider cuts, profiles or system', () => {
    const missing = pose('2', 2, 1); missing.components[0].cuttingLengths.pop();
    expect(() => optimizeProjectEstimate([pose('1'), missing], [pack])).toThrow('Pose 2: incomplete');
    expect(() => optimizeProjectEstimate([pose('1')], [])).toThrow('unavailable');
    expect(() => optimizeProjectEstimate([pose('1')], [{ ...pack, profiles: [] }])).toThrow('profile is missing');
  });
  it('rejects a cut that fits raw stock but cannot fit after kerf and trim', () => {
    const tooLong = pose('1'); tooLong.components[0].cuttingLengths[0] = 5980;
    expect(() => optimizeProjectEstimate([tooLong], [pack])).toThrow('after kerf and trim');
  });

  it('optimizes saved sliding sash layouts through resolveEstimatePattern (not a separate pool)', () => {
    const slidingProfile = {
      id: 'PS-6601-FRAME',
      barLength: 6000,
      specifications: { sawKerf: 3, barEndTrim: 0 },
    } as unknown as Profile;
    const slidingPack = {
      meta: { id: 'caluminium-ps' },
      profiles: [slidingProfile],
    } as SystemPack;
    // 23 cuts matches countRequiredProfilePieces for 2-sash sliding (frame+sash+subsystem)
    const cuts = Array.from({ length: 23 }, (_, i) => 800 + (i % 5) * 10);
    const slidingPose = {
      id: 's1',
      posNumber: '1',
      systemPackId: 'caluminium-ps',
      quantity: 2,
      type: 'sliding_window_2sash',
      overallWidth: 1200,
      overallHeight: 1400,
      grid: {
        rows: 1,
        cols: 2,
        cells: [
          { id: '0', row: 0, col: 0, type: 'sash' },
          { id: '1', row: 0, col: 1, type: 'sash' },
        ],
      },
      components: [{ id: 'ledger', type: 'frame', profile: slidingProfile, cuttingLengths: cuts }],
    } as WindowUnit;
    const estimate = optimizeProjectEstimate([slidingPose], [slidingPack]);
    expect(estimate.positions).toBe(1);
    expect(estimate.pieces).toBe(46); // 23 × qty 2
    expect(estimate.groups[0].result.stockUsed.flatMap((bar) => bar.cuts)).toHaveLength(46);
    expect(estimate.manufacturingEligible).toBe(false);
  });
});
