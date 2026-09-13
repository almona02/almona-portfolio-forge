/**
 * FP-024C.12.1 — parity API boundary for DESIGN_REPORT → REQUIRED_PARTS.
 * Imports the public engine export, not the helper module, so a missing
 * re-export / unwired helper fails these tests.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeDowinParityLengths,
  computeDowinRequiredPartsFromDesignReport,
  deceuninck70zParityInput,
  FP024C12_PARITY_ENTRY_POINT,
  sashHorizontalCutMm,
} from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';
import { FP024C12_BOUNDED_PARITY_WELD_RULE } from '@/lib/fabricator/dowinParity/optimizerStateProvenance';
import type { DowinRequiredPartsWeldInput } from '@/lib/fabricator/dowinParity/evaluateDowinRequiredPartsWeldAdjustment';

const SYSTEM = "Deceuninck 70'lik PVC Sistemi";

function reportPiece(
  overrides: Partial<DowinRequiredPartsWeldInput> &
    Pick<DowinRequiredPartsWeldInput, 'profileCode' | 'designReportLengthMm' | 'weldingWasteMm'>
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

describe('FP-024C.12.1 DoWin Required Parts parity API', () => {
  it('records explicit wiring through computeDowinRequiredPartsFromDesignReport', () => {
    expect(FP024C12_PARITY_ENTRY_POINT).toBe('computeDowinRequiredPartsFromDesignReport');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.parityWiring).toBe('PROVEN');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.wiringClassification).toBe(
      'PARITY_API_NEEDS_EXPLICIT_ENTRY_POINT'
    );
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.status).toBe('WIRED_PARITY_ADAPTER_ONLY');
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.wiredIntoComputeDowinParityLengths).toBe(false);
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.wiredIntoSashBasmaKaynakFormula).toBe(false);
    expect(FP024C12_BOUNDED_PARITY_WELD_RULE.physicalLengthScore).toBe('6.0/10');
  });

  it('maps measured 45° Design Report lengths to Required Parts at the parity API', () => {
    const rows = [
      { profileCode: 'Deceuninck-KASA-70', base: 1200 as const },
      { profileCode: 'Deceuninck-KANAT-70', base: 451 as const },
      { profileCode: 'Deceuninck-CITA-20', base: 537 as const },
    ];
    for (const row of rows) {
      for (const weld of [0, 2, 3] as const) {
        const result = computeDowinRequiredPartsFromDesignReport(
          reportPiece({
            profileCode: row.profileCode,
            designReportLengthMm: row.base,
            weldingWasteMm: weld,
          })
        );
        expect(result.sourceLayer).toBe('DESIGN_REPORT');
        expect(result.targetLayer).toBe('REQUIRED_PARTS');
        expect(result.supported).toBe(true);
        expect(result.requiredPartsLengthMm).toBe(row.base + weld);
        expect(result.designReportLengthMm).toBe(row.base);
      }
    }
  });

  it('leaves measured 90° ORTA Design Report length unchanged at the parity API', () => {
    for (const weld of [0, 2, 3] as const) {
      const result = computeDowinRequiredPartsFromDesignReport(
        reportPiece({
          profileCode: 'Deceuninck-ORTA-KAYIT-70',
          leftAngleDeg: 90,
          rightAngleDeg: 90,
          designReportLengthMm: 1116,
          weldingWasteMm: weld,
        })
      );
      expect(result.supported).toBe(true);
      expect(result.requiredPartsLengthMm).toBe(1116);
      expect(result.weldingWasteAppliedMm).toBe(0);
    }
  });

  it('fails closed at the parity API for missing angles, mixed pairs, and unsupported identity', () => {
    const kasa = { profileCode: 'Deceuninck-KASA-70', designReportLengthMm: 1200, weldingWasteMm: 3 };
    expect(computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, leftAngleDeg: null })).reason).toBe(
      'MISSING_ANGLE_AUTHORITY'
    );
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, rightAngleDeg: undefined })).reason
    ).toBe('MISSING_ANGLE_AUTHORITY');
    expect(
      computeDowinRequiredPartsFromDesignReport(
        reportPiece({ ...kasa, leftAngleDeg: 45, rightAngleDeg: 90 })
      ).reason
    ).toBe('UNSUPPORTED_ANGLE_PAIR');
    expect(
      computeDowinRequiredPartsFromDesignReport(
        reportPiece({ ...kasa, leftAngleDeg: 90, rightAngleDeg: 45 })
      ).reason
    ).toBe('UNSUPPORTED_ANGLE_PAIR');
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, profileCode: 'KANAT-70' })).reason
    ).toBe('UNSUPPORTED_PROFILE');
    expect(
      computeDowinRequiredPartsFromDesignReport(
        reportPiece({ ...kasa, profileSystem: 'Deceuninck' })
      ).reason
    ).toBe('UNSUPPORTED_SYSTEM');
    expect(computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, weldingWasteMm: 1 })).reason).toBe(
      'UNSUPPORTED_WELD_VALUE'
    );
    expect(computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, weldingWasteMm: 4 })).reason).toBe(
      'UNSUPPORTED_WELD_VALUE'
    );
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, sourceLayer: 'PACKED' })).reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, sourceLayer: 'MACHINE' })).reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, sourceLayer: 'REQUIRED_PARTS' }))
        .reason
    ).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa, targetLayer: 'PACKED' })).reason
    ).toBe('UNSUPPORTED_TARGET_LAYER');
    expect(
      computeDowinRequiredPartsFromDesignReport(reportPiece({ ...kasa })).requiredPartsLengthMm
    ).toBe(1203);
  });

  it('cannot stack onto the existing sash packed weld path', () => {
    const packed = sashHorizontalCutMm(437, 7, { horizontalBasmaMm: 12, horizontalKaynakMm: 6 }, 3);
    expect(packed).toBe(444);
    expect(computeDowinParityLengths(deceuninck70zParityInput(437, 1416)).lines.find((l) => l.category === 'sash_horizontal')?.lengthMm).toBe(444);
    const stacked = computeDowinRequiredPartsFromDesignReport(
      reportPiece({
        profileCode: 'Deceuninck-KANAT-70',
        designReportLengthMm: packed,
        weldingWasteMm: 3,
        sourceLayer: 'PACKED',
        priorCompensationPath: 'SASH_BASMA_KAYNAK_WELD',
      })
    );
    expect(stacked.supported).toBe(false);
    expect(stacked.reason).toBe('UNSUPPORTED_SOURCE_LAYER');
    expect(stacked.requiredPartsLengthMm).toBeNull();
    const doubleCount = computeDowinRequiredPartsFromDesignReport(
      reportPiece({
        profileCode: 'Deceuninck-KANAT-70',
        designReportLengthMm: packed,
        weldingWasteMm: 3,
        priorCompensationPath: 'SASH_BASMA_KAYNAK_WELD',
      })
    );
    expect(doubleCount.reason).toBe('DOUBLE_COUNT_PATH_DETECTED');
  });

  it('keeps the sash packed path unreachable from the bounded helper by construction', () => {
    const engine = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts'),
      'utf8'
    );
    expect(engine).toContain('computeDowinRequiredPartsFromDesignReport');
    expect(engine).not.toContain('evaluateDowinRequiredPartsWeldAdjustment(');
    expect(engine).not.toContain('computeDowinRequiredPartsFromDesignReport(');
    const sashStart = engine.indexOf('export function sashHorizontalCutMm');
    const computeStart = engine.indexOf('export function computeDowinParityLengths');
    const actualsStart = engine.indexOf('export function almonaParityActualsForAsdd');
    const packedRegion = engine.slice(sashStart, computeStart);
    const compute = engine.slice(computeStart, actualsStart);
    const actuals = engine.slice(actualsStart);
    expect(packedRegion).not.toContain('computeDowinRequiredPartsFromDesignReport');
    expect(packedRegion).not.toContain('evaluateDowinRequiredPartsWeldAdjustment');
    expect(compute).not.toContain('computeDowinRequiredPartsFromDesignReport');
    expect(compute).not.toContain('evaluateDowinRequiredPartsWeldAdjustment');
    expect(actuals).not.toContain('computeDowinRequiredPartsFromDesignReport');
    expect(actuals).not.toContain('evaluateDowinRequiredPartsWeldAdjustment');
  });
});
