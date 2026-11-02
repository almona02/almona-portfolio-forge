import { describe, expect, it } from 'vitest';
import type { BomDemandReport } from './bomStockAvailability';
import {
  availableBarsForSelectedLength,
  availableLotsByProfileLength,
  bindPhysicalBarsForDemand,
  netPhysicalBarsFromMovements,
  physicalBarKey,
  type PhysicalBarMovement,
} from './physicalOwnedBars';

const report = (rows: BomDemandReport['rows']): BomDemandReport => ({
  rows,
  missingMappingCount: 0,
  shortageCount: 0,
  allMapped: true,
  availabilityOk: true,
  totalRequiredMetres: 12,
  stockVersionByProfile: { 'owned-f60': 1 },
});

const baseRow = {
  bomRowId: 'bom-f60',
  catalogueCode: 'F60',
  pack: 'pack',
  material: 'aluminum',
  finish: '',
  requiredMetres: 12,
  ownedProfileId: 'owned-f60',
  ownedProfileName: 'F60 owned',
  availableMetres: 12,
  shortageMetres: 0,
  mappingStatus: 'mapped' as const,
  eligibleBarLengthsM: [3, 6],
  isTestStock: false,
};

const mv = (partial: Partial<PhysicalBarMovement> & Pick<PhysicalBarMovement, 'movementType'>): PhysicalBarMovement => ({
  profileId: 'owned-f60',
  barCount: null,
  barLengthM: null,
  ...partial,
});

describe('netPhysicalBarsFromMovements reconciliation', () => {
  it('FIFO-consumes unassigned outbound against lot-tagged intake (10 − 6 = 4, not 10)', () => {
    const result = netPhysicalBarsFromMovements([
      mv({
        movementType: 'intake',
        barCount: 10,
        barLengthM: 6,
        lotId: 'lot-A',
        createdAt: '2026-01-01T00:00:00Z',
      }),
      mv({
        movementType: 'consume',
        barCount: 6,
        barLengthM: 6,
        // no lotId
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(result.invalidatedProfileIds).toEqual([]);
    expect(availableLotsByProfileLength(result.lots)).toEqual([
      expect.objectContaining({ ownedProfileId: 'owned-f60', stockLengthMm: 6000, availableBars: 4 }),
    ]);
  });

  it('invalidates when metres-only outbound follows physical intake', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 4, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({
        movementType: 'out',
        barCount: null,
        barLengthM: null,
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(result.invalidatedProfileIds).toContain('owned-f60');
    expect(result.lots).toEqual([]);
  });

  it('applies consume/reserve movement types even when lot_metadata status says consumed/reserved', () => {
    const result = netPhysicalBarsFromMovements([
      mv({
        movementType: 'intake',
        barCount: 5,
        barLengthM: 6,
        status: 'available',
        createdAt: '2026-01-01T00:00:00Z',
      }),
      mv({
        movementType: 'consume',
        barCount: 2,
        barLengthM: 6,
        status: 'consumed', // annotation must not skip the transaction
        createdAt: '2026-01-02T00:00:00Z',
      }),
      mv({
        movementType: 'reserve',
        barCount: 1,
        barLengthM: 6,
        status: 'reserved',
        createdAt: '2026-01-03T00:00:00Z',
      }),
    ]);
    expect(result.invalidatedProfileIds).toEqual([]);
    expect(availableLotsByProfileLength(result.lots)[0].availableBars).toBe(2); // 5 - 2 - 1
  });

  it('same-lot consumption and reservation/release', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 8, barLengthM: 6, lotId: 'L1', createdAt: '2026-01-01T00:00:00Z' }),
      mv({ movementType: 'consume', barCount: 3, barLengthM: 6, lotId: 'L1', createdAt: '2026-01-02T00:00:00Z' }),
      mv({ movementType: 'reserve', barCount: 2, barLengthM: 6, lotId: 'L1', createdAt: '2026-01-03T00:00:00Z' }),
      mv({ movementType: 'release', barCount: 1, barLengthM: 6, lotId: 'L1', createdAt: '2026-01-04T00:00:00Z' }),
    ]);
    // 8 - 3 - 2 + 1 = 4 available, 1 reserved
    const lot = result.lots.find((l) => l.lotId === 'L1');
    expect(lot?.availableBars).toBe(4);
    expect(lot?.reservedBars).toBe(1);
  });

  it('return restores available bars', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 3, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({ movementType: 'consume', barCount: 2, barLengthM: 6, createdAt: '2026-01-02T00:00:00Z' }),
      mv({ movementType: 'return', barCount: 1, barLengthM: 6, createdAt: '2026-01-03T00:00:00Z' }),
    ]);
    expect(availableLotsByProfileLength(result.lots)[0].availableBars).toBe(2);
  });

  it('unknown movement type invalidates instead of increasing stock', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 4, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({ movementType: 'mystery_event', barCount: 99, barLengthM: 6, createdAt: '2026-01-02T00:00:00Z' }),
    ]);
    expect(result.invalidatedProfileIds).toContain('owned-f60');
    expect(result.lots).toEqual([]);
  });

  it('rejects fractional bar counts', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 2.5, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
    ]);
    // fractional → treated as incomplete/metres-like for inbound (no bars established)
    expect(result.lots).toEqual([]);
  });

  it('invalidates metres-only adjustment after physical intake (does not keep 10 bars)', () => {
    const result = netPhysicalBarsFromMovements([
      mv({
        movementType: 'intake',
        barCount: 10,
        barLengthM: 6,
        lotId: 'A',
        createdAt: '2026-01-01T00:00:00Z',
      }),
      mv({
        movementType: 'adjustment',
        barCount: null,
        barLengthM: null,
        canonicalMetres: -12,
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(result.invalidatedProfileIds).toContain('owned-f60');
    expect(result.lots).toEqual([]);
  });

  it('invalidates incomplete/fractional adjustment after intake', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 4, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({
        movementType: 'adjustment',
        barCount: 1.5,
        barLengthM: 6,
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(result.invalidatedProfileIds).toContain('owned-f60');
    expect(result.lots).toEqual([]);
  });

  it('invalidates positive incomplete adjustment with unknown physical composition', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 2, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({
        movementType: 'adjustment',
        barCount: null,
        barLengthM: null,
        canonicalMetres: 6,
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(result.invalidatedProfileIds).toContain('owned-f60');
    expect(result.lots).toEqual([]);
  });

  it('allows proven same-scope transfer as a no-op; invalidates ambiguous transfer', () => {
    const harmless = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 5, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({
        movementType: 'transfer',
        barCount: 2,
        barLengthM: 6,
        transferPeerProfileId: 'owned-f60',
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(harmless.invalidatedProfileIds).toEqual([]);
    expect(availableLotsByProfileLength(harmless.lots)[0].availableBars).toBe(5);

    const ambiguous = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 5, barLengthM: 6, createdAt: '2026-01-01T00:00:00Z' }),
      mv({
        movementType: 'transfer',
        barCount: 2,
        barLengthM: 6,
        // no peer
        createdAt: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(ambiguous.invalidatedProfileIds).toContain('owned-f60');
    expect(ambiguous.lots).toEqual([]);
  });

  it('preserves lot provenance on detailed lots after netting', () => {
    const result = netPhysicalBarsFromMovements([
      mv({ movementType: 'intake', barCount: 2, barLengthM: 6, lotId: 'A', createdAt: '2026-01-01T00:00:00Z' }),
      mv({ movementType: 'intake', barCount: 3, barLengthM: 6, lotId: 'B', createdAt: '2026-01-02T00:00:00Z' }),
    ]);
    expect(result.lots.map((l) => l.lotId).sort()).toEqual(['A', 'B']);
    expect(availableLotsByProfileLength(result.lots)[0]).toMatchObject({
      availableBars: 5,
      lotId: null, // aggregate
    });
  });
});

describe('bindPhysicalBarsForDemand', () => {
  it('does not treat 12 m as four 3 m bars when only 6 m lots exist', () => {
    const lots = [
      { ownedProfileId: 'owned-f60', stockLengthMm: 6000, availableBars: 2, status: 'available' },
    ];
    const bound = bindPhysicalBarsForDemand(report([{ ...baseRow }]), lots);
    expect(bound.binding).toBe('physical');
    expect(bound.barsByCatalogueLength[physicalBarKey('F60', 6000)]).toBe(2);
    expect(bound.barsByCatalogueLength[physicalBarKey('F60', 3000)]).toBeUndefined();
  });

  it('marks metres-only inventory unbound (no invented quotient)', () => {
    const bound = bindPhysicalBarsForDemand(report([{ ...baseRow }]), []);
    expect(bound.binding).toBe('metres_only');
    expect(bound.barsByCatalogueLength).toEqual({});
    expect(bound.unboundCatalogueCodes).toContain('F60');
  });

  it('rejects invalidated profiles even when leftover lots are passed', () => {
    const bound = bindPhysicalBarsForDemand(
      report([{ ...baseRow }]),
      [{ ownedProfileId: 'owned-f60', stockLengthMm: 6000, availableBars: 9, status: 'available' }],
      new Map(),
      { invalidatedProfileIds: ['owned-f60'] },
    );
    expect(bound.binding).toBe('unbound');
    expect(bound.barsByCatalogueLength).toEqual({});
  });

  it('availableBarsForSelectedLength rejects wrong length after acknowledgement', () => {
    const bars = {
      [physicalBarKey('F60', 6000)]: 2,
      [physicalBarKey('owned-f60', 6000)]: 2,
    };
    expect(availableBarsForSelectedLength(bars, ['F60', 'owned-f60'], 6000)).toBe(2);
    expect(availableBarsForSelectedLength(bars, ['F60', 'owned-f60'], 8000)).toBeNull();
  });
});
