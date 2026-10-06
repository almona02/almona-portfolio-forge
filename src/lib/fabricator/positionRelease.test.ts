import { describe, expect, it } from 'vitest';
import {
  buildExpectedProductQr,
  fingerprintBom,
  fingerprintOptimization,
  fingerprintStock,
} from './positionRelease';

describe('positionRelease fingerprints', () => {
  it('builds deterministic product QR for position revision', () => {
    expect(buildExpectedProductQr('pose-1', 3)).toBe('ALMONA_pose-1_R3');
  });

  it('fingerprints BOM profiles and hardware stably', () => {
    const bom = {
      profiles: [
        { id: 'b', profileCode: 'B', length: 100, quantity: 1 },
        { id: 'a', profileCode: 'A', length: 200, quantity: 2 },
      ],
      hardware: [{ id: 'h1', supplierCode: 'H', quantity: 4 }],
    } as never;
    const once = fingerprintBom(bom);
    const twice = fingerprintBom(bom);
    expect(once).toBe(twice);
    expect(once).toContain('bom:');
    expect(once).toContain('a:200:2');
  });

  it('fingerprints stock reservation', () => {
    const fp = fingerprintStock({
      identity: {
        ownerUserId: 'o',
        projectId: 'p',
        positionId: 'pose',
        source: 'v2',
        revision: 1,
      },
      profileIds: ['z', 'a'],
      metersByProfile: { z: 1, a: 2 },
      reservedAt: '2026-01-01T00:00:00.000Z',
      availabilityOk: true,
      bomFingerprint: 'bom:test',
      stockVersionByProfile: { a: 1, z: 2 },
    });
    expect(fp).toContain('stock:a,z;m:a:2|z:1;ok:1');
    expect(fp).toContain('"ownerUserId":"o"');
  });

  it('fingerprints optimization cutting plan', () => {
    const fp = fingerprintOptimization({
      materialUsage: 80,
      wastePercentage: 12,
      estimatedProductionTime: 1,
      nestingEfficiency: 0.8,
      costBreakdown: {
        materialCost: 1,
        laborCost: 1,
        hardwareCost: 1,
        glazingCost: 1,
        totalCost: 4,
      },
      cuttingPlan: [
        {
          profile: {} as never,
          stockLength: 6000,
          totalWaste: 100,
          utilization: 0.9,
          cuts: [{ length: 1200, angle: 45, componentId: 'c1', waste: 0, cutId: 'c1:0' }],
        },
      ],
    });
    expect(fp).toContain('c1:0:1200:6000');
    expect(fp).toContain('waste:12');
  });

  it('changes the BOM fingerprint when physical lengths change without changing totals', () => {
    const bom = { profiles: [{ id: 'frame', length: 2000, quantity: 2, cuttingLengths: [1000, 1000], angles: [45, 45] }], hardware: [] } as never;
    const changed = structuredClone(bom) as any;
    changed.profiles[0].cuttingLengths = [900, 1100];
    expect(fingerprintBom(changed)).not.toBe(fingerprintBom(bom));
  });
});
