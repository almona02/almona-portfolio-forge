/**
 * FP-024A — licensed DoWin asdd three-layer golden. Not accepted.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateKFactor } from '@/lib/fabricator/UPVCCuttingEngine';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  DOWIN_ASDD_FIXTURE_SLUG,
  DOWIN_ASDD_MDB_PROFILE_CUTS,
  DOWIN_ASDD_REPRESENTED_CATEGORIES,
  DOWIN_ASDD_SOURCE_HASHES,
  DOWIN_LENGTH_CATEGORIES,
  DOWIN_PARITY_TOLERANCE_MM,
  compareDowinGoldenLengths,
  dowinMachineParityPasses,
  dowinParityGatePasses,
  isWithinDowinParityTolerance,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';
import {
  DOWIN_ASDD_EXTERNAL_BAR_PATTERNS,
  reconcileExternalBarPattern,
} from '@/lib/fabricator/barPackExternalReconciliation';
import {
  machineInstructionLengthMm,
  packedSegmentLengthMm,
  physicalSawCutLengthMm,
} from '@/lib/fabricator/cutLengthSemantics';
import {
  freezeManufacturingSettings,
  isReusableRemnantLength,
  manufacturingSettingsProvenanceRows,
  resolveManufacturingSettings,
} from '@/lib/fabricator/ManufacturingSettings';
import {
  almonaParityActualsForAsdd,
  sashHorizontalCutMm,
} from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';
import { evaluateMachineExportPreflight } from '@/lib/fabricator/production/machineExportPreflight';
import { generateCutSheets } from '@/lib/fabricator/production/CutSheetGenerator';
import type { Cut } from '@/types/fabricator';

const fixture = DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION;

function physicalRows() {
  return fixture.rows.filter(
    (r) => r.category !== 'glass' && r.category !== 'angle_compensation'
  );
}

function expectedNominals(category: (typeof fixture.rows)[number]['category']) {
  return fixture.rows
    .filter((r) => r.category === category)
    .map((r) => r.expectedNominalLengthMm);
}

describe('FP-024 DoWin external golden', () => {
  it('stores provenance and 21 design-list physical pieces plus UNPROVEN rows', () => {
    expect(fixture.id).toBe('dowin-deceuninck70z-asdd-1000x1500-20260909');
    expect(DOWIN_ASDD_FIXTURE_SLUG).toBe('deceuninck70-asdd-1000x1500-dowin-2026-09-09');
    expect(fixture.status).toBe('READY_EXTERNAL_FIXTURE');
    expect(fixture.orderNo).toBe('10001');
    expect(fixture.sourceHashesSha256).toEqual(DOWIN_ASDD_SOURCE_HASHES);
    expect(physicalRows()).toHaveLength(21);
    expect(new Set(physicalRows().map((r) => r.pieceId)).size).toBe(21);
    expect(DOWIN_LENGTH_CATEGORIES).toHaveLength(9);
  });

  it('does not fill unknown this-run settings with factory defaults', () => {
    expect(fixture.jobSettings.sawThicknessMm).toBeNull();
    expect(fixture.jobSettings.weldingWasteMm).toBeNull();
    expect(fixture.jobSettings.sashOffsetMm).toBeNull();
    expect(fixture.jobSettings.trimCutMm).toBeNull();
    expect(fixture.jobSettings.remnantThresholdMm).toBeNull();
    expect(fixture.jobSettings.machineId).toBe('DC-600');
  });

  it('keeps repeated lengths as distinct physical records', () => {
    const sashH = fixture.rows.filter((r) => r.category === 'sash_horizontal');
    expect(sashH).toHaveLength(4);
    expect(sashH.every((r) => r.expectedPackedSegmentMm === 454)).toBe(true);
    expect(new Set(sashH.map((r) => r.pieceId)).size).toBe(4);
    expect(new Set(sashH.map((r) => r.externalAssemblyLabel)).size).toBe(4);
  });

  it('records frame 2×1000 and 2×1500 nominal expectations', () => {
    expect(expectedNominals('frame_horizontal')).toEqual([1000, 1000]);
    expect(expectedNominals('frame_vertical')).toEqual([1500, 1500]);
  });

  it('records sash 4×451 and 4×1430 nominal expectations', () => {
    expect(expectedNominals('sash_horizontal')).toEqual([451, 451, 451, 451]);
    expect(expectedNominals('sash_vertical')).toEqual([1430, 1430, 1430, 1430]);
  });

  it('records mullion 1×1416', () => {
    expect(expectedNominals('mullion')).toEqual([1416]);
  });

  it('records glazing bead 4×331 and 4×1310', () => {
    expect(expectedNominals('glazing_bead_horizontal')).toEqual([331, 331, 331, 331]);
    expect(expectedNominals('glazing_bead_vertical')).toEqual([1310, 1310, 1310, 1310]);
  });

  it('matches DC-600 MDB LENGTH to the machine layer only; beads stay null', () => {
    expect(DOWIN_ASDD_MDB_PROFILE_CUTS).toHaveLength(13);
    expect(DOWIN_ASDD_MDB_PROFILE_CUTS.filter((c) => c.lengthMm === 1003)).toHaveLength(2);
    expect(DOWIN_ASDD_MDB_PROFILE_CUTS.some((c) => c.lengthMm === 1000)).toBe(false);
    const beads = fixture.rows.filter((r) => r.category.startsWith('glazing_bead'));
    expect(beads).toHaveLength(8);
    expect(beads.every((r) => r.expectedMachineLengthMm === null)).toBe(true);
  });

  it('fails represented categories and keeps glass/angle UNPROVEN, not PASS', () => {
    const compared = compareDowinGoldenLengths(fixture, almonaParityActualsForAsdd());
    expect(dowinParityGatePasses(compared)).toBe(false);
    expect(compared.representedCategoriesPass).toBe(false);
    expect(compared.fullSuitePasses).toBe(false);
    expect(compared.categoryScorecard.glass).toBe('UNPROVEN');
    expect(compared.categoryScorecard.angle_compensation).toBe('UNPROVEN');
    expect(compared.categoryScorecard.glass).not.toBe('PASS');
    expect(compared.categoryScorecard.angle_compensation).not.toBe('PASS');
    expect(fixture.categoryAvailability.glass).toBe('PENDING_EXTERNAL_FIXTURE');
    expect(fixture.categoryAvailability.angle_compensation).toBe('NOT_APPLICABLE');
    for (const category of DOWIN_ASDD_REPRESENTED_CATEGORIES) {
      expect(compared.categoryScorecard[category]).toBe('FAIL');
    }
    const sashH = compared.results.find((r) => r.pieceId === 'asdd.Left.Sash.Top');
    expect(sashH?.packed.expectedMm).toBe(454);
    expect(sashH?.packed.actualMm).toBe(444);
    expect(sashH?.nominal.expectedMm).toBe(451);
    expect(sashH?.nominal.actualMm).toBeNull();
    expect(sashH?.machine.expectedMm).toBe(454);
    expect(sashH?.machine.actualMm).toBeNull();
  });

  it('uses ±0.1 mm per piece: 0.10 passes, 0.11 fails, no averaging', () => {
    expect(isWithinDowinParityTolerance(1000, 1000.1)).toBe(true);
    expect(isWithinDowinParityTolerance(1000, 1000.11)).toBe(false);
    expect(DOWIN_PARITY_TOLERANCE_MM).toBe(0.1);
    const mixed = compareDowinGoldenLengths(fixture, [
      ...almonaParityActualsForAsdd(),
      {
        pieceId: 'asdd.Frame.Top',
        nominalLengthMm: 1000,
        packedSegmentMm: 1003,
        machineInstructionMm: 1003,
      },
    ]);
    expect(mixed.categoryScorecard.frame_horizontal).toBe('FAIL');
  });

  it('matching is by pieceId, so array reorder does not collapse identity', () => {
    const actuals = almonaParityActualsForAsdd().reverse();
    const a = compareDowinGoldenLengths(fixture, actuals);
    const b = compareDowinGoldenLengths(fixture, almonaParityActualsForAsdd());
    expect(a.results.find((r) => r.pieceId === 'asdd.Left.Sash.Top')?.packed.actualMm).toBe(
      b.results.find((r) => r.pieceId === 'asdd.Left.Sash.Top')?.packed.actualMm
    );
  });

  it('does not silently substitute nominal and packed millimetres', () => {
    const swapped = compareDowinGoldenLengths(fixture, [
      {
        pieceId: 'asdd.Frame.Top',
        nominalLengthMm: 1003,
        packedSegmentMm: 1000,
        machineInstructionMm: 1003,
      },
    ]);
    const row = swapped.results.find((r) => r.pieceId === 'asdd.Frame.Top');
    expect(row?.nominal.withinTolerance).toBe(false);
    expect(row?.packed.withinTolerance).toBe(false);
    expect(packedSegmentLengthMm({ packedSegmentMm: 1003 })).toBe(1003);
    expect(packedSegmentLengthMm({ packedSegmentMm: undefined })).toBeNull();
  });

  it('does not treat a null machine expected as machine-parity PASS', () => {
    const bead = fixture.rows.find((r) => r.pieceId === 'asdd.Left.Bead.Top');
    expect(bead?.expectedMachineLengthMm).toBeNull();
    const compared = compareDowinGoldenLengths(fixture, [
      {
        pieceId: 'asdd.Left.Bead.Top',
        nominalLengthMm: 331,
        packedSegmentMm: 334,
        machineInstructionMm: 334,
      },
    ]);
    const row = compared.results.find((r) => r.pieceId === 'asdd.Left.Bead.Top');
    expect(dowinMachineParityPasses(row!.machine)).toBe(false);
    expect(machineInstructionLengthMm({ machineInstructionLengthMm: undefined })).toBeNull();
  });

  it('does not adopt outer+2×SashOffset+weld to force 454', () => {
    expect(437 + 14 + 3).toBe(454);
    expect(sashHorizontalCutMm(437, 7, { horizontalBasmaMm: 12, horizontalKaynakMm: 6 }, 3)).toBe(
      444
    );
  });

  it('Cut.length stays saw-oriented when sawCutLengthMm is omitted', () => {
    const cut: Cut = { length: 1003, angle: 45, componentId: 'c', waste: 0 };
    expect(physicalSawCutLengthMm(cut)).toBe(1003);
    expect(
      physicalSawCutLengthMm({ ...cut, sawCutLengthMm: 1003, reportedWeldedLengthMm: 1000 })
    ).toBe(1003);
  });

  it('external bar patterns report unexplained delta; mullion is RECONCILED', () => {
    const settings = { sawKerfMm: 4, trimCutMm: 0 };
    const reports = DOWIN_ASDD_EXTERNAL_BAR_PATTERNS.map((p) =>
      reconcileExternalBarPattern(p, settings)
    );
    const mullion = reports.find((r) => r.patternId === 'asdd-mullion-orta-6500');
    expect(mullion?.status).toBe('RECONCILED');
    expect(mullion?.unexplainedDeltaMm).toBe(0);
    const frame = reports.find((r) => r.patternId === 'asdd-frame-kasa-6000');
    expect(frame?.status).toBe('UNRECONCILED');
    expect(frame?.unexplainedDeltaMm).toBe(7);
    const sash = reports.find((r) => r.patternId === 'asdd-sash-kanat-6000');
    expect(sash?.unexplainedDeltaMm).toBe(7);
    expect(reports.filter((r) => r.status === 'UNRECONCILED').length).toBeGreaterThan(0);
  });

  it('settings freeze is deterministic and remnant floors stay 300 / 500', () => {
    const a = freezeManufacturingSettings(
      resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' })
    );
    const b = freezeManufacturingSettings(
      resolveManufacturingSettings({ namedProfileId: 'yilmazcad-parity' })
    );
    expect(a.signature).toBe(b.signature);
    expect(a.values.minimumReusableLengthMm).toBe(500);
    expect(isReusableRemnantLength(499.9, a.values)).toBe(false);
    expect(isReusableRemnantLength(500, a.values)).toBe(true);
    const platform = resolveManufacturingSettings({ namedProfileId: 'platform' });
    expect(isReusableRemnantLength(299.9, platform)).toBe(false);
    expect(isReusableRemnantLength(300, platform)).toBe(true);
    const rows = manufacturingSettingsProvenanceRows(platform);
    expect(rows.find((r) => r.key === 'sawKerfMm')?.source).toBe('platform');
  });

  it('VisualCuttingPlan and CutSheet still consume canonical ManufacturingSettings', () => {
    const visual = readFileSync(
      resolve(process.cwd(), 'src/components/fabricator/VisualCuttingPlan.tsx'),
      'utf8'
    );
    const cutSheet = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/production/CutSheetGenerator.ts'),
      'utf8'
    );
    const provenance = readFileSync(
      resolve(process.cwd(), 'src/components/fabricator/ManufacturingSettingsProvenancePanel.tsx'),
      'utf8'
    );
    expect(visual).toContain('isReusableRemnantLength');
    expect(visual).not.toMatch(/minimumReusableLengthMm\s*=\s*500/);
    expect(cutSheet).toContain('resolveManufacturingSettings');
    expect(provenance).toContain('manufacturingSettingsProvenanceRows');
    expect(provenance).not.toContain('DowinParityLengthEngine');
    const sheet = generateCutSheets(
      [
        {
          profile: {
            id: 'p',
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
          stockLength: 6000,
          totalWaste: 0,
          utilization: 0,
          cuts: [
            {
              length: 1003,
              angle: 45,
              componentId: 'frame-top',
              waste: 0,
              nominalLengthMm: 1000,
              packedSegmentMm: 1003,
            },
          ],
        },
      ],
      { namedProfileId: 'platform' }
    );
    expect(sheet.bars[0].cuts[0].lengthMm).toBe(1003);
    expect(sheet.bars[0].cuts[0].nominalLengthMm).toBe(1000);
    expect(sheet.bars[0].cuts[0].packedSegmentMm).toBe(1003);
  });

  it('unplaced physical cuts and unsupported NCW prevent production export', () => {
    const blocked = evaluateMachineExportPreflight({
      unplacedPhysicalCuts: [{ pieceId: 'asdd.Frame.Top' }],
      requestedFormat: 'mdb',
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockingReasons[0]).toContain('asdd.Frame.Top');
    const ncw = evaluateMachineExportPreflight({
      unplacedPhysicalCuts: [],
      requestedFormat: 'ncw',
    });
    expect(ncw.allowed).toBe(false);
    expect(ncw.ncwSupported).toBe(false);
    const ok = evaluateMachineExportPreflight({
      unplacedPhysicalCuts: [],
      requestedFormat: 'mdb',
    });
    expect(ok.allowed).toBe(true);
  });

  it('does not delete calculateKFactor or wire parity into UPVCCuttingEngine', () => {
    expect(
      calculateKFactor({ profileWidthMm: 70, wallThicknessMm: 2.5, miterAngleDegrees: 45 })
    ).toBeGreaterThan(0);
    const upvc = readFileSync(resolve(process.cwd(), 'src/lib/fabricator/UPVCCuttingEngine.ts'), 'utf8');
    expect(upvc).not.toContain('DowinParityLengthEngine');
  });
});
