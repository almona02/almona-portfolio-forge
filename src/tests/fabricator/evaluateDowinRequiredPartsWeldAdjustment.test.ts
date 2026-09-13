/**
 * FP-024C.12 — bounded DoWin Required Parts weld adjustment.
 * Parity adapter only. Fail closed outside measured C.6–C.11 scope.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FP024C11_CANONICAL_PROFILE_SYSTEM,
  FP024C11_MEASURED_45_PROFILE_CODES,
  FP024C11_MEASURED_90_PROFILE_CODES,
  FP024C11_MEASURED_WELDING_WASTE_MM,
  FP024C12_BOUNDED_PARITY_WELD_RULE,
} from '@/lib/fabricator/dowinParity/optimizerStateProvenance';
import {
  computeDowinParityLengths,
  deceuninck70zParityInput,
  sashHorizontalCutMm,
} from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';
import {
  evaluateDowinRequiredPartsWeldAdjustment,
  FP024C12_IMPLEMENTATION_SCOPE,
  FP024C12_SUPPORTED_45_PROFILE_CODES,
  FP024C12_SUPPORTED_90_PROFILE_CODES,
  FP024C12_SUPPORTED_PROFILE_SYSTEM,
  FP024C12_SUPPORTED_WELDING_WASTE_MM,
  type DowinRequiredPartsWeldInput,
} from '@/lib/fabricator/dowinParity/evaluateDowinRequiredPartsWeldAdjustment';

const SYSTEM = FP024C12_SUPPORTED_PROFILE_SYSTEM;

function reportInput(
  overrides: Partial<DowinRequiredPartsWeldInput> &
    Pick<DowinRequiredPartsWeldInput, 'profileCode' | 'designReportLengthMm' | 'weldingWasteMm'> & {
      leftAngleDeg?: number | null;
      rightAngleDeg?: number | null;
    }
): DowinRequiredPartsWeldInput {
  return {
    profileSystem: SYSTEM,
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: 45,
    rightAngleDeg: 45,
    priorCompensationPath: 'NONE',
    ...overrides,
  };
}

describe('FP-024C.12 bounded DoWin Required Parts weld adjustment', () => {
  it('reuses the exact C.11 evidenced identifiers', () => {
    expect(FP024C12_SUPPORTED_PROFILE_SYSTEM).toBe(FP024C11_CANONICAL_PROFILE_SYSTEM);
    expect([...FP024C12_SUPPORTED_45_PROFILE_CODES]).toEqual([...FP024C11_MEASURED_45_PROFILE_CODES]);
    expect([...FP024C12_SUPPORTED_90_PROFILE_CODES]).toEqual([...FP024C11_MEASURED_90_PROFILE_CODES]);
    expect([...FP024C12_SUPPORTED_WELDING_WASTE_MM]).toEqual([...FP024C11_MEASURED_WELDING_WASTE_MM]);
    expect(FP024C12_IMPLEMENTATION_SCOPE).toBe('PARITY_ADAPTER_ONLY');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.implementationScope).toBe('PARITY_ADAPTER_ONLY');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.generalizedManufacturingFormula).toBe('UNPROVEN');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.wiredIntoSashBasmaKaynakFormula).toBe(false);
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.physicalLengthScore).toBe('6.0/10');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.fp027.rootCause).toBe('UNPROVEN');
  });

  it('adds Welding Waste on measured 45°/45° KASA/KANAT/CITA Design Report lengths', () => {
    const matrix = [
      { profileCode: 'Deceuninck-KASA-70', base: 1200, long: 1500 },
      { profileCode: 'Deceuninck-KANAT-70', base: 451, long: 1430 },
      { profileCode: 'Deceuninck-CITA-20', base: 537, long: 1116 },
    ] as const;
    for (const row of matrix) {
      for (const weld of [0, 2, 3] as const) {
        for (const base of [row.base, row.long]) {
          const result = evaluateDowinRequiredPartsWeldAdjustment(
            reportInput({
              profileCode: row.profileCode,
              designReportLengthMm: base,
              weldingWasteMm: weld,
            })
          );
          expect(result.supported).toBe(true);
          if (result.supported) {
            expect(result.reason).toBe('FORTY_FIVE_REPORT_PLUS_WELD');
            expect(result.authoritativeLengthMm).toBe(base + weld);
            expect(result.weldingWasteAppliedMm).toBe(weld);
          }
        }
      }
    }
  });

  it('does not add Welding Waste on measured 90°/90° ORTA', () => {
    for (const base of [1116, 1416]) {
      for (const weld of [0, 2, 3] as const) {
        const result = evaluateDowinRequiredPartsWeldAdjustment(
          reportInput({
            profileCode: 'Deceuninck-ORTA-KAYIT-70',
            leftAngleDeg: 90,
            rightAngleDeg: 90,
            designReportLengthMm: base,
            weldingWasteMm: weld,
          })
        );
        expect(result.supported).toBe(true);
        if (result.supported) {
          expect(result.reason).toBe('NINETY_ORTA_REPORT_UNCHANGED');
          expect(result.authoritativeLengthMm).toBe(base);
          expect(result.weldingWasteAppliedMm).toBe(0);
        }
      }
    }
  });

  it('fails closed for missing angles, mixed pairs, and non-45/90 pairs', () => {
    const kasa = { profileCode: 'Deceuninck-KASA-70', designReportLengthMm: 1200, weldingWasteMm: 3 };
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, leftAngleDeg: null })).reason
    ).toBe('MISSING_ANGLE_AUTHORITY');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, rightAngleDeg: undefined })).reason
    ).toBe('MISSING_ANGLE_AUTHORITY');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, leftAngleDeg: 45, rightAngleDeg: 90 })
      ).reason
    ).toBe('UNSUPPORTED_ANGLE_PAIR');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, leftAngleDeg: 90, rightAngleDeg: 45 })
      ).reason
    ).toBe('UNSUPPORTED_ANGLE_PAIR');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, leftAngleDeg: 30, rightAngleDeg: 30 })
      ).reason
    ).toBe('UNSUPPORTED_ANGLE_PAIR');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, leftAngleDeg: Number.NaN, rightAngleDeg: 45 })
      ).reason
    ).toBe('UNSUPPORTED_ANGLE_PAIR');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, leftAngleDeg: null })).supported
    ).toBe(false);
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, leftAngleDeg: null }))
        .authoritativeLengthMm
    ).toBeNull();
  });

  it('fails closed for unsupported system, profile, weld, and layers', () => {
    const kasa = { profileCode: 'Deceuninck-KASA-70', designReportLengthMm: 1200, weldingWasteMm: 3 };
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, profileSystem: 'Deceuninck' })
      ).reason
    ).toBe('UNSUPPORTED_SYSTEM');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, profileSystem: "Deceuninck 70'lik PVC Sistemi extra" })
      ).reason
    ).toBe('UNSUPPORTED_SYSTEM');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, profileCode: 'KANAT-70' })).reason
    ).toBe('UNSUPPORTED_PROFILE');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, profileCode: 'Deceuninck-ORTA-KAYIT-70' })
      ).reason
    ).toBe('UNSUPPORTED_PROFILE');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({
          profileCode: 'Deceuninck-KASA-70',
          leftAngleDeg: 90,
          rightAngleDeg: 90,
          designReportLengthMm: 1200,
          weldingWasteMm: 3,
        })
      ).reason
    ).toBe('UNSUPPORTED_PROFILE');
    expect(evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, weldingWasteMm: 1 })).reason).toBe(
      'UNSUPPORTED_WELD_VALUE'
    );
    expect(evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, weldingWasteMm: 4 })).reason).toBe(
      'UNSUPPORTED_WELD_VALUE'
    );
    expect(evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, weldingWasteMm: -1 })).reason).toBe(
      'UNSUPPORTED_WELD_VALUE'
    );
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, weldingWasteMm: Number.NaN })).reason
    ).toBe('UNSUPPORTED_WELD_VALUE');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, sourceLayer: 'REQUIRED_PARTS' })
      ).reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, sourceLayer: 'PACKED' })).reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, sourceLayer: 'MACHINE' })).reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, sourceLayer: 'UNKNOWN' })).reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(reportInput({ ...kasa, targetLayer: 'PACKED' })).reason
    ).toBe('UNSUPPORTED_TARGET_LAYER');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, priorCompensationPath: 'SASH_BASMA_KAYNAK_WELD' })
      ).reason
    ).toBe('DOUBLE_COUNT_PATH_DETECTED');
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({ ...kasa, designReportLengthMm: Number.NaN })
      ).reason
    ).toBe('NON_FINITE_DESIGN_REPORT_LENGTH');
  });

  it('does not stack onto the existing sash Basma/Kaynak/Weld packed formula', () => {
    const packedSash = sashHorizontalCutMm(437, 7, { horizontalBasmaMm: 12, horizontalKaynakMm: 6 }, 3);
    expect(packedSash).toBe(444);
    const lines = computeDowinParityLengths(deceuninck70zParityInput(437, 1416)).lines;
    const sashH = lines.find((line) => line.category === 'sash_horizontal');
    expect(sashH?.note).toContain('YatayBasma');
    expect(sashH?.lengthMm).toBe(packedSash);
    expect(
      evaluateDowinRequiredPartsWeldAdjustment(
        reportInput({
          profileCode: 'Deceuninck-KANAT-70',
          designReportLengthMm: packedSash,
          weldingWasteMm: 3,
          priorCompensationPath: 'SASH_BASMA_KAYNAK_WELD',
        })
      ).reason
    ).toBe('DOUBLE_COUNT_PATH_DETECTED');
  });

  it('is not imported by canonical production engines', () => {
    const forbidden = [
      'src/lib/fabricator/UPVCCuttingEngine.ts',
      'src/lib/fabricator/AlmonaCuttingEngine.ts',
      'src/lib/fabricator/barPackAccounting.ts',
      'src/lib/fabricator/CuttingListGenerator.ts',
      'src/lib/fabricator/production/machineExportPreflight.ts',
      'src/lib/fabricator/production/CutSheetGenerator.ts',
    ];
    for (const rel of forbidden) {
      const source = readFileSync(resolve(process.cwd(), rel), 'utf8');
      expect(source).not.toContain('evaluateDowinRequiredPartsWeldAdjustment');
    }
    const engine = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts'),
      'utf8'
    );
    expect(engine).toContain('evaluateDowinRequiredPartsWeldAdjustment');
    expect(engine).not.toContain('evaluateDowinRequiredPartsWeldAdjustment(');
  });
});
