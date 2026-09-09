/**
 * FP-023B — kerf_after_each_piece invariant
 */
import { describe, expect, it } from 'vitest';
import { optimizeLinearCuts } from '@/lib/algorithms/LinearOptimizer';
import { AlmonaCuttingEngine } from '@/lib/fabricator/AlmonaCuttingEngine';
import {
  BAR_PACK_KERF_RULE_ID,
  PLATFORM_MANUFACTURING_DEFAULTS,
  YILMAZCAD_PARITY_MANUFACTURING_SETTINGS,
  accountBarPack,
  barConsumedLengthMm,
  barRemnantLengthMm,
  kerfLossOnBarMm,
  pieceStartPositionsMm,
  resolveManufacturingSettings,
} from '@/lib/fabricator/ManufacturingSettings';
import { generateCutSheets } from '@/lib/fabricator/production/CutSheetGenerator';
import { RemnantManager as WarehouseRemnantManager } from '@/lib/inventory/RemnantManager';
import type { CutListItem } from '@/lib/fabricator/UPVCCuttingEngine';
import type { CuttingPlan } from '@/types/fabricator';

const STOCK = 6000;
const LENGTHS = [1400, 1000, 800];

const profile = {
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
};

function planFromLengths(lengths: number[]): CuttingPlan {
  return {
    profile: profile as CuttingPlan['profile'],
    stockLength: STOCK,
    totalWaste: 0,
    utilization: 0,
    cuts: lengths.map((length, i) => ({
      length,
      angle: 90,
      componentId: 'C1',
      cutId: `cut:${i}`,
      occurrenceIndex: i,
      waste: 0,
    })),
  };
}

describe('FP-023B kerf accounting', () => {
  it('uses N kerfs (one SawThickness per piece), not N−1 gaps', () => {
    const settings = { sawKerfMm: 4, trimCutMm: 0 };
    expect(kerfLossOnBarMm(3, 4)).toBe(12);
    expect(accountBarPack(STOCK, [1997, 1997, 1997], settings).consumedMm).toBe(1997 * 3 + 12);
    expect(accountBarPack(STOCK, [1997, 1997, 1997], settings).remnantMm).toBeLessThan(0);
    const nMinus1WouldFit = 1997 * 3 + 2 * 4;
    expect(nMinus1WouldFit).toBeLessThanOrEqual(STOCK);
    const packed = optimizeLinearCuts(
      [{ id: 'p', length: 1997, label: 'P', quantity: 3 }],
      STOCK,
      4
    );
    expect(packed.barsCount).toBe(2);
  });

  it('optimizer, CutSheet, visual consumed-length and remnant agree on one bar', () => {
    const settings = resolveManufacturingSettings();
    expect(settings.trimCutMm).toBe(0);
    const expected = accountBarPack(STOCK, LENGTHS, settings);

    const packed = optimizeLinearCuts(
      LENGTHS.map((length, i) => ({ id: `c${i}`, length, label: 'C', quantity: 1 })),
      STOCK,
      settings.sawKerfMm,
      settings.trimCutMm
    );
    expect(packed.barsCount).toBe(1);
    const optBar = packed.stockUsed[0];
    expect(optBar.waste).toBe(expected.remnantMm);

    const sheet = generateCutSheets([planFromLengths(LENGTHS)], {
      job: { sawKerfMm: settings.sawKerfMm, trimCutMm: settings.trimCutMm },
    });
    expect(sheet.bars[0].wasteMm).toBe(expected.remnantMm);
    expect(sheet.bars[0].cuts.map((c) => c.positionMm)).toEqual(
      pieceStartPositionsMm(LENGTHS, settings)
    );

    const visualConsumed = barConsumedLengthMm(LENGTHS, settings);
    expect(visualConsumed).toBe(expected.consumedMm);
    expect(barRemnantLengthMm(STOCK, LENGTHS, settings)).toBe(expected.remnantMm);

    const items: CutListItem[] = LENGTHS.map((cutLengthMm) => ({
      profileId: 'p1',
      profileName: 'Frame',
      role: 'frame',
      cutLengthMm,
      quantity: 1,
      cuttingAngle: 45,
      barNumber: 1,
      positionOnBarMm: 0,
      wasteAfterMm: 0,
    }));
    const engine = new AlmonaCuttingEngine({ barLengthMm: STOCK });
    const report = engine.buildReportFromOptimizedCutList(
      {
        items,
        totalBarsUsed: 1,
        totalWasteMm: 0,
        wastePercentage: 0,
        cuttingSequence: [],
      },
      { name: 'Inv' }
    );
    expect(report.body.bars).toHaveLength(1);
    expect(report.body.bars[0].remnant).toBe(expected.remnantMm);
    expect(expected.kerfLossMm).toBe(LENGTHS.length * settings.sawKerfMm);
    expect(expected.ruleId).toBe(BAR_PACK_KERF_RULE_ID);
  });

  it('preserves platform remnant 300 vs yilmazcad-parity 500', () => {
    expect(PLATFORM_MANUFACTURING_DEFAULTS.minimumReusableLengthMm).toBe(300);
    expect(YILMAZCAD_PARITY_MANUFACTURING_SETTINGS.minimumReusableLengthMm).toBe(500);
    expect(new WarehouseRemnantManager().minimumReusableLengthMm).toBe(300);
    const parity = WarehouseRemnantManager.fromManufacturingSettings(
      YILMAZCAD_PARITY_MANUFACTURING_SETTINGS
    );
    expect(parity.minimumReusableLengthMm).toBe(500);
  });
});
