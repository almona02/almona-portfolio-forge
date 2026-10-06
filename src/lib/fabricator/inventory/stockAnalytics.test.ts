import { describe, expect, it } from 'vitest';
import { computeStockAnalytics } from './stockAnalytics';
import { isTestStockProfile, partitionProductionInventory } from './testStock';

describe('testStock', () => {
  it('detects flag and name markers', () => {
    expect(isTestStockProfile({ name: 'Frame', specifications: { testStock: true } })).toBe(true);
    expect(isTestStockProfile({ name: 'PR1 TEST Disposable (TEST STOCK — 66 m)', specifications: {} })).toBe(true);
    expect(isTestStockProfile({ name: 'BATCH0 Frame 60', specifications: {} })).toBe(false);
  });

  it('partitions production vs test lots', () => {
    const { production, testStock } = partitionProductionInventory([
      { id: 'a', name: 'BATCH0 Frame 60', specifications: {} },
      { id: 'b', name: 'Disposable', specifications: { testStock: true } },
    ]);
    expect(production.map((p) => p.id)).toEqual(['a']);
    expect(testStock.map((p) => p.id)).toEqual(['b']);
  });
});

describe('computeStockAnalytics', () => {
  const now = new Date('2026-10-06T12:00:00.000Z');

  it('excludes test stock from readiness totals and covers reorder deficit', () => {
    const report = computeStockAnalytics({
      now,
      profiles: [
        {
          id: 'prod',
          name: 'BATCH0 Frame 60',
          stockQuantity: 50,
          minStockLevel: 80,
          costPerMeter: 120,
          specifications: {},
        },
        {
          id: 'test',
          name: 'PR1 TEST Disposable Stock Lot (TEST STOCK — 66 m)',
          stockQuantity: 66,
          minStockLevel: 0,
          costPerMeter: 0,
          specifications: { testStock: true },
        },
      ],
      movements: [
        {
          profileId: 'prod',
          movementType: 'out',
          quantity: 12,
          unit: 'meters',
          canonicalMetres: 12,
          createdAt: '2026-09-20T00:00:00.000Z',
        },
        {
          profileId: 'prod',
          movementType: 'in',
          quantity: 6,
          unit: 'meters',
          canonicalMetres: 6,
          createdAt: '2026-09-25T00:00:00.000Z',
        },
        {
          profileId: 'test',
          movementType: 'in',
          quantity: 66,
          unit: 'meters',
          canonicalMetres: 66,
          createdAt: '2026-10-05T00:00:00.000Z',
        },
      ],
      remnantStats: { totalRemnants: 10, availableRemnants: 4, unusedRemnants: 3 },
    });

    expect(report.productionProfiles).toBe(1);
    expect(report.testStockExcluded).toBe(1);
    expect(report.totalMetresOnHand).toBe(50);
    expect(report.totalInventoryValue).toBe(6000);
    expect(report.reorderCoverageMetres).toBe(30);
    expect(report.consumedMetres30d).toBe(12);
    expect(report.intakeMetres30d).toBe(6);
    expect(report.remnantReuseRate).toBeCloseTo(0.4);
    expect(report.notes.some((n) => /not a sales forecast/i.test(n))).toBe(true);
  });

  it('does not invent metres from piece movements without canonical_metres', () => {
    const report = computeStockAnalytics({
      now,
      profiles: [
        {
          id: 'prod',
          name: 'Frame',
          stockQuantity: 10,
          minStockLevel: 10,
          costPerMeter: 1,
          specifications: {},
        },
      ],
      movements: [
        {
          profileId: 'prod',
          movementType: 'in',
          quantity: 10,
          unit: 'pieces',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    });
    expect(report.intakeMetres30d).toBe(0);
    expect(report.reorderCoverageMetres).toBe(0);
  });
});
