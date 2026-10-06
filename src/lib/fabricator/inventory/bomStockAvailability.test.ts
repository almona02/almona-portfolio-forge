import { describe, expect, it } from 'vitest';
import type { FabricationData, Profile } from '@/types/fabricator';
import {
  buildBomDemandReport,
  isStockAcknowledgementStale,
  resolveOwnedProfileForBomLine,
} from './bomStockAvailability';

const ownedId = 'a1000000-0000-4000-8000-0000000000a1';

const owned = {
  id: ownedId,
  name: 'Frame 60',
  material: 'aluminum',
  width: 60,
  color: '#C0C0C0',
  costPerMeter: 10,
  cuttingAllowance: 3,
  stockQuantity: 40,
  stockVersion: 3,
  minStockLevel: 5,
  supplier: 'Test',
  specifications: {
    supplierCode: 'F60',
    systemPackId: 'rock60',
    finish: '#C0C0C0',
    stockLengthMm: 6000,
  },
} as Profile;

const ledger = (cuts: number[], overrides: Partial<FabricationData['profiles'][number]> = {}) =>
  ({
    id: 'bom-row-1',
    profileCode: ownedId,
    systemPack: 'rock60',
    role: 'frame',
    length: 1200,
    quantity: cuts.length,
    cuttingLengths: cuts,
    angles: cuts.map(() => 45),
    rawStockLength: 6000,
    wasteLength: 0,
    machiningZones: [],
    weight: 1,
    cost: 1,
    ...overrides,
  }) as FabricationData['profiles'][number];

describe('bomStockAvailability', () => {
  it('reports shortage separately from mapping', () => {
    const shortOwned = { ...owned, stockQuantity: 5 };
    const report = buildBomDemandReport([ledger([1200, 1200, 1400, 1400, 8000])], [shortOwned]);
    expect(report.allMapped).toBe(true);
    expect(report.rows[0].requiredMetres).toBeCloseTo(13.2);
    expect(report.rows[0].availableMetres).toBe(5);
    expect(report.rows[0].shortageMetres).toBeCloseTo(8.2);
    expect(report.shortageCount).toBe(1);
    expect(report.availabilityOk).toBe(false);
  });

  it('flags missing mapping when owned UUID is absent', () => {
    const report = buildBomDemandReport([ledger([1000])], []);
    expect(report.missingMappingCount).toBe(1);
    expect(report.rows[0].mappingStatus).toBe('missing_mapping');
    expect(report.availabilityOk).toBe(false);
  });

  it('resolves catalogue code with pack without merging by display name', () => {
    const catalogLine = ledger([2000], {
      id: 'row',
      profileCode: 'F60',
      systemPack: 'rock60',
    });
    const match = resolveOwnedProfileForBomLine(catalogLine, [
      owned,
      { ...owned, id: 'b1000000-0000-4000-8000-0000000000b1', name: 'Frame 60', specifications: { supplierCode: 'OTHER' } },
    ]);
    expect(match?.id).toBe(ownedId);
  });

  it('detects stale acknowledgement when stock version drifts', () => {
    expect(
      isStockAcknowledgementStale({
        reservationBomFingerprint: 'bom:a',
        currentBomFingerprint: 'bom:a',
        reservationVersions: { [ownedId]: 3 },
        currentVersions: { [ownedId]: 4 },
      }),
    ).toBe(true);
    expect(
      isStockAcknowledgementStale({
        reservationBomFingerprint: 'bom:a',
        currentBomFingerprint: 'bom:a',
        reservationVersions: { [ownedId]: 3 },
        currentVersions: { [ownedId]: 3 },
      }),
    ).toBe(false);
  });
});
