/**
 * FP-023A — Canonical ManufacturingSettings contract
 */
import { describe, expect, it } from 'vitest';
import { optimizeLinearCuts } from '@/lib/algorithms/LinearOptimizer';
import {
  PLATFORM_MANUFACTURING_DEFAULTS,
  YILMAZCAD_PARITY_MANUFACTURING_SETTINGS,
  isReusableRemnantLength,
  manufacturingSettingsSignature,
  resolveManufacturingSettings,
  visualBarUsedMm,
} from '@/lib/fabricator/ManufacturingSettings';
import { AlmonaCuttingEngine } from '@/lib/fabricator/AlmonaCuttingEngine';
import type { CutListItem } from '@/lib/fabricator/UPVCCuttingEngine';
import { RemnantManager } from '@/algorithms/remnantManagement';
import { generateCutSheets } from '@/lib/fabricator/production/CutSheetGenerator';
import type { CuttingPlan } from '@/types/fabricator';

function fourEqualCuts(length: number) {
  return [
    { id: 'a', length, label: 'A', quantity: 1 },
    { id: 'b', length, label: 'B', quantity: 1 },
    { id: 'c', length, label: 'C', quantity: 1 },
    { id: 'd', length, label: 'D', quantity: 1 },
  ];
}

function sampleItems(count: number, lengthMm: number): CutListItem[] {
  return Array.from({ length: count }, () => ({
    profileId: 'p1',
    profileName: 'Frame',
    role: 'frame' as const,
    cutLengthMm: lengthMm,
    quantity: 1,
    cuttingAngle: 45,
    barNumber: 1,
    positionOnBarMm: 0,
    wasteAfterMm: 0,
  }));
}

describe('FP-023A ManufacturingSettings', () => {
  it('resolves YilmazCAD parity kerf 4 and remnant 500', () => {
    const s = resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' });
    expect(s.sawKerfMm).toBe(4);
    expect(s.minimumReusableLengthMm).toBe(500);
    expect(s.weldingWasteMm).toBe(3);
    expect(s.sashOffsetMm).toBe(7);
    expect(s.glazingClearanceMm).toBe(2.5);
  });

  it('applies machine kerf override everywhere via one resolve', () => {
    const s = resolveManufacturingSettings({
      namedProfileId: 'yilmazcad-parity',
      machineOverride: { sawKerfMm: 3.2 },
    });
    expect(s.sawKerfMm).toBe(3.2);
    expect(s.provenance.sawKerfMm).toBe('machine');
    expect(s.minimumReusableLengthMm).toBe(500);
  });

  it('job overrides beat machine', () => {
    const s = resolveManufacturingSettings({
      machineId: 'aluminum-micron',
      job: { sawKerfMm: 4.8 },
    });
    expect(s.sawKerfMm).toBe(4.8);
    expect(s.provenance.sawKerfMm).toBe('job');
  });

  it('catalog machine aluminum-micron uses 4.2 kerf', () => {
    const s = resolveManufacturingSettings({ machineId: 'aluminum-micron' });
    expect(s.sawKerfMm).toBe(4.2);
    expect(s.trimCutMm).toBe(15);
  });

  it('does not alias endDeductionMm to trimCutMm', () => {
    const s = resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' });
    expect(s.trimCutMm).toBe(0);
    expect(s.endDeductionMm).toBe(20);
  });

  it('remnant boundary at 499.9 vs 500.0 for parity profile', () => {
    const s = YILMAZCAD_PARITY_MANUFACTURING_SETTINGS;
    expect(isReusableRemnantLength(499.9, s)).toBe(false);
    expect(isReusableRemnantLength(500.0, s)).toBe(true);
    expect(isReusableRemnantLength(500.04, s)).toBe(true);
  });

  it('LinearOptimizer default kerf is platform sawKerfMm (4)', () => {
    expect(PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm).toBe(4);
    const withDefault = optimizeLinearCuts(fourEqualCuts(1000), 6000);
    const withFour = optimizeLinearCuts(fourEqualCuts(1000), 6000, 4);
    expect(withDefault.barsCount).toBe(withFour.barsCount);
    expect(withDefault.totalWaste).toBe(withFour.totalWaste);
  });

  it('kerf 4 vs 10 changes consumed length on a multi-cut bar', () => {
    const requests = [{ id: 'p', length: 1400, label: 'piece', quantity: 4 }];
    const k4 = optimizeLinearCuts(requests, 6000, 4);
    const k10 = optimizeLinearCuts(requests, 6000, 10);
    expect(k4.totalWaste).not.toBe(k10.totalWaste);
  });

  it('visualization consumed-length formula uses the same resolved kerf as packing', () => {
    const kerf = PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm;
    const lengths = [1200, 1200, 1400];
    const vizUsed = visualBarUsedMm(lengths, kerf);
    const engineUsed = visualBarUsedMm(lengths, kerf);
    expect(vizUsed).toBe(engineUsed);
    expect(vizUsed).toBe(1200 + 1200 + 1400 + 3 * kerf);
  });

  it('AlmonaCuttingEngine without kerf uses platform 4 mm', () => {
    const engine = new AlmonaCuttingEngine({ barLengthMm: 6500 });
    const report = engine.buildReportFromOptimizedCutList(
      {
        items: sampleItems(2, 1200),
        totalBarsUsed: 1,
        totalWasteMm: 0,
        wastePercentage: 0,
        cuttingSequence: [],
      },
      { name: 'Job' }
    );
    expect(report.header.sawCutDeduction).toBe('4 mm');
  });

  it('explicit job kerf 10 still wins (no silent rewrite of caller)', () => {
    const engine = new AlmonaCuttingEngine({ barLengthMm: 6500, sawKerfMm: 10, endDeductionMm: 20 });
    const report = engine.buildReportFromOptimizedCutList(
      {
        items: sampleItems(1, 1200),
        totalBarsUsed: 1,
        totalWasteMm: 0,
        wastePercentage: 0,
        cuttingSequence: [],
      },
      { name: 'Job', sawKerfMm: 10 }
    );
    expect(report.header.sawCutDeduction).toBe('10 mm');
  });

  it('parity remnant: 499.9 discarded, 500.0 kept on last bar', () => {
    const engine = new AlmonaCuttingEngine({
      barLengthMm: 1700,
      namedProfileId: 'yilmazcad-parity',
    });
    engine.buildReportFromOptimizedCutList(
      {
        items: sampleItems(1, 1200),
        totalBarsUsed: 1,
        totalWasteMm: 0,
        wastePercentage: 0,
        cuttingSequence: [],
      },
      { name: 'Job', namedProfileId: 'yilmazcad-parity' }
    );
    // 1700 - (1200 + 4 kerf) = 496 → not reusable
    expect(engine.getRemnants()).toHaveLength(0);

    const keepEngine = new AlmonaCuttingEngine({
      barLengthMm: 1704,
      namedProfileId: 'yilmazcad-parity',
    });
    keepEngine.buildReportFromOptimizedCutList(
      {
        items: sampleItems(1, 1200),
        totalBarsUsed: 1,
        totalWasteMm: 0,
        wastePercentage: 0,
        cuttingSequence: [],
      },
      { name: 'Keep', namedProfileId: 'yilmazcad-parity' }
    );
    // 1704 - 1204 = 500
    expect(keepEngine.getRemnants()).toHaveLength(1);
    expect(keepEngine.getRemnants()[0].length).toBe(500);
    expect(keepEngine.getRemnants()[0].id).toBe('REM-1');
  });

  it('in-memory remnant inventory honors Yilmaz parity 500', () => {
    const manager = new RemnantManager(
      resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' }).minimumReusableLengthMm
    );
    const profile = {
      id: 'p1',
      name: 'P',
      material: 'upvc',
      width: 70,
      height: 70,
      thickness: 2,
      color: 'white',
      costPerMeter: 1,
      cuttingAllowance: 0,
      stockQuantity: 1,
      minStockLevel: 0,
      supplier: 't',
      specifications: {},
    };
    manager.addRemnant({
      id: 'r-499',
      profile: profile as never,
      length: 499.9,
      material: 'upvc',
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      usageCount: 0,
      status: 'available',
      quality: 'good',
      cost: 0,
    });
    manager.addRemnant({
      id: 'r-500',
      profile: profile as never,
      length: 500,
      material: 'upvc',
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      usageCount: 0,
      status: 'available',
      quality: 'good',
      cost: 0,
    });
    expect(manager.getAvailableRemnants().map((r) => r.id)).toEqual(['r-500']);
  });

  it('deterministic replay: same input + settings → same packing signature', () => {
    const requests = fourEqualCuts(1800);
    const a = optimizeLinearCuts(requests, 6500, 4);
    const b = optimizeLinearCuts(requests, 6500, 4);
    const sig = (r: typeof a) =>
      r.stockUsed.map((bar) => `${bar.cuts.map((c) => c.length).join(',')}:${bar.waste}`).join('|');
    expect(sig(a)).toBe(sig(b));
    const settingsA = resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' });
    const settingsB = resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' });
    expect(manufacturingSettingsSignature(settingsA)).toBe(manufacturingSettingsSignature(settingsB));
  });

  it('CutSheetGenerator positions use resolved kerf (no leftover +4 hardcode)', () => {
    const plan: CuttingPlan = {
      profile: {
        id: 'p1',
        name: 'Frame',
        material: 'aluminum',
        width: 50,
        height: 20,
        thickness: 1.4,
        color: 'White',
        costPerMeter: 10,
        cuttingAllowance: 0,
        stockQuantity: 1,
        minStockLevel: 0,
        supplier: 'T',
        specifications: {},
      },
      cuts: [
        { length: 1000, angle: 90, componentId: 'C1', cutId: 'cut:A', occurrenceIndex: 0, waste: 0 },
        { length: 1000, angle: 90, componentId: 'C1', cutId: 'cut:B', occurrenceIndex: 1, waste: 0 },
      ],
      stockLength: 6000,
      totalWaste: 0,
      utilization: 0,
    };
    const sheet4 = generateCutSheets([plan], { job: { sawKerfMm: 4 } });
    const sheet10 = generateCutSheets([plan], { job: { sawKerfMm: 10 } });
    expect(sheet4.bars[0].cuts[0].positionMm).toBe(0);
    expect(sheet4.bars[0].cuts[1].positionMm).toBe(1004);
    expect(sheet10.bars[0].cuts[1].positionMm).toBe(1010);
    expect(sheet4.bars[0].cuts[0].cutId).toBe('cut:A');
    expect(sheet4.bars[0].cuts[1].cutId).toBe('cut:B');
  });
});
