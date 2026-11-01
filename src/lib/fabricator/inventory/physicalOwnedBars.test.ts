import { describe, expect, it } from 'vitest';
import type { BomDemandReport } from './bomStockAvailability';
import {
  availableBarsForSelectedLength,
  bindPhysicalBarsForDemand,
  netPhysicalBarsFromMovements,
  physicalBarKey,
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

// Fix invalid key - use string properly
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

describe('netPhysicalBarsFromMovements', () => {
  it('nets piece intakes by profile × length and ignores metres-only rows', () => {
    const lots = netPhysicalBarsFromMovements([
      { profileId: 'owned-f60', movementType: 'intake', barCount: 4, barLengthM: 3 },
      { profileId: 'owned-f60', movementType: 'intake', barCount: null, barLengthM: null }, // metres-only
      { profileId: 'owned-f60', movementType: 'consume', barCount: 1, barLengthM: 3 },
      { profileId: 'owned-f60', movementType: 'intake', barCount: 2, barLengthM: 6 },
      { profileId: 'owned-f60', movementType: 'intake', barCount: 5, barLengthM: 6, status: 'reserved' },
      { profileId: 'test', movementType: 'intake', barCount: 99, barLengthM: 6, isTestStock: true },
    ]);
    expect(lots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownedProfileId: 'owned-f60', stockLengthMm: 3000, availableBars: 3 }),
        expect.objectContaining({ ownedProfileId: 'owned-f60', stockLengthMm: 6000, availableBars: 2 }),
      ]),
    );
    expect(lots.find((l) => l.stockLengthMm === 6000 && l.availableBars === 5)).toBeUndefined();
  });
});

describe('bindPhysicalBarsForDemand', () => {
  it('does not treat 12 m as four 3 m bars when only 6 m lots exist', () => {
    const lots = [
      { ownedProfileId: 'owned-f60', stockLengthMm: 6000, availableBars: 2, status: 'available' },
    ];
    const bound = bindPhysicalBarsForDemand(
      report([{ ...baseRow }]),
      lots,
    );
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

  it('availableBarsForSelectedLength rejects wrong length after acknowledgement', () => {
    const bars = {
      [physicalBarKey('F60', 6000)]: 2,
      [physicalBarKey('owned-f60', 6000)]: 2,
    };
    expect(availableBarsForSelectedLength(bars, ['F60', 'owned-f60'], 6000)).toBe(2);
    expect(availableBarsForSelectedLength(bars, ['F60', 'owned-f60'], 8000)).toBeNull();
  });
});
