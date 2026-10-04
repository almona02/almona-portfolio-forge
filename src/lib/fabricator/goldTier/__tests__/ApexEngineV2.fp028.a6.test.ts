/**
 * FP-028 / Phase 0 / A6
 *
 * Mullion/transom stock lengths must use mm→micron conversion consistently
 * with frame/sash. Never treat mm as microns, never invent 6000 mm stock.
 */
import { describe, expect, it, vi } from 'vitest';
import { ApexEngineV2, stockLengthMmToMicrons } from '../ApexEngineV2';
import { createValidSystem } from './testFixtures';
import type { WindowUnit } from '@/types/fabricator';

vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn().mockReturnValue('test-id'),
  },
}));

vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('FP-028 / A6 — stock length mm↔micron consistency', () => {
  it('converts approved mm stock to microns (6000 mm → 6_000_000 µm)', () => {
    expect(stockLengthMmToMicrons(6000, 'mullion')).toBe(6_000_000);
    expect(stockLengthMmToMicrons(6000, 'transom')).toBe(6_000_000);
    expect(stockLengthMmToMicrons(6000, 'frame')).toBe(6_000_000);
  });

  it('documents the prior operator bug: mm value used as microns when present', () => {
    const stockMm = 6000;
    // Legacy defective expression (short-circuits before * 1000)
    const legacyMixed = stockMm || 6000 * 1000;
    expect(legacyMixed).toBe(6000); // microns wrongly equal to mm
    expect(legacyMixed).not.toBe(stockLengthMmToMicrons(stockMm, 'mullion'));
  });

  it('rejects missing/non-positive stock instead of inventing 6000 mm', () => {
    expect(() => stockLengthMmToMicrons(undefined, 'mullion')).toThrow(/standardStockLength/);
    expect(() => stockLengthMmToMicrons(0, 'transom')).toThrow(/standardStockLength/);
    expect(() => stockLengthMmToMicrons(-100, 'frame')).toThrow(/standardStockLength/);
  });

  it('generates multi-column/row assemblies without unit-mix throw when stock is approved', () => {
    const system = createValidSystem();
    const unit: WindowUnit = {
      id: 'fp028-a6-grid',
      orderNumber: 'ORD-A6',
      posNumber: 'L01',
      type: 'window',
      components: [],
      overallWidth: 1800,
      overallHeight: 2100,
      color: 'white',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date('2026-10-04T00:00:00.000Z'),
      updatedAt: new Date('2026-10-04T00:00:00.000Z'),
      revision: 1,
      quantity: 1,
      grid: {
        rows: 2,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'fixed' },
          { id: '0-1', row: 0, col: 1, type: 'sash', openingDirection: 'right' },
          { id: '1-0', row: 1, col: 0, type: 'sash', openingDirection: 'left' },
          { id: '1-1', row: 1, col: 1, type: 'fixed' },
        ],
        colWidths: [900, 900],
        rowHeights: [1050, 1050],
      },
    };

    const result = new ApexEngineV2(system, unit).generateAssembly();
    expect(result.visualGeometry.frame.mullions?.length).toBe(1);
    expect(result.visualGeometry.frame.transoms?.length).toBe(1);
    expect(result.fabricationData.cutList.some((c) => c.role === 'mullion')).toBe(true);
    expect(result.fabricationData.cutList.some((c) => c.role === 'transom')).toBe(true);
  });

  it('fails closed when mullion stock length is missing from an otherwise valid multi-col system', () => {
    const system = createValidSystem();
    // Remove mullion stock authority
    (system.profiles.mullion as { standardStockLength?: number }).standardStockLength = undefined;

    const unit: WindowUnit = {
      id: 'fp028-a6-missing-stock',
      orderNumber: 'ORD-A6',
      posNumber: 'L01',
      type: 'window',
      components: [],
      overallWidth: 1500,
      overallHeight: 1400,
      color: 'white',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date('2026-10-04T00:00:00.000Z'),
      updatedAt: new Date('2026-10-04T00:00:00.000Z'),
      grid: {
        rows: 1,
        cols: 2,
        cells: [
          { id: 'a', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
          { id: 'b', row: 0, col: 1, type: 'fixed' },
        ],
      },
    };

    expect(() => new ApexEngineV2(system, unit).generateAssembly()).toThrow(/mullion.*standardStockLength/i);
  });
});
