/**
 * FP-024C.12 — Bounded DoWin parity-adapter Welding Waste rule (AICS-001 Tier 3).
 *
 * Isolated from sashInner + Basma + Kaynak + WeldingWaste in DowinParityLengthEngine.
 * Do not call this helper from computeDowinParityLengths, sashHorizontalCutMm,
 * sashVerticalCutMm, generateOptimizedCutList, or any production engine.
 *
 * Applies only at DESIGN_REPORT → REQUIRED_PARTS for measured Deceuninck 70
 * angle-pairs and Welding Waste {0, 2, 3}. Fail closed otherwise.
 *
 * Do not use Cut.angle. Do not default missing ends to 45°.
 */

import { roundManufacturingMm } from '@/lib/fabricator/ManufacturingSettings';

/** Exact evidenced system identity. Do not substring-match. */
export const FP024C12_SUPPORTED_PROFILE_SYSTEM =
  "Deceuninck 70'lik PVC Sistemi" as const;

export const FP024C12_SUPPORTED_45_PROFILE_CODES = [
  'Deceuninck-KASA-70',
  'Deceuninck-KANAT-70',
  'Deceuninck-CITA-20',
] as const;

export const FP024C12_SUPPORTED_90_PROFILE_CODES = [
  'Deceuninck-ORTA-KAYIT-70',
] as const;

export const FP024C12_SUPPORTED_WELDING_WASTE_MM = [0, 2, 3] as const;

export const FP024C12_IMPLEMENTATION_SCOPE = 'PARITY_ADAPTER_ONLY' as const;

export type DowinParityLengthLayer =
  | 'DESIGN_REPORT'
  | 'REQUIRED_PARTS'
  | 'PACKED'
  | 'MACHINE'
  | 'UNKNOWN';

export type DowinParityPriorCompensationPath = 'NONE' | 'SASH_BASMA_KAYNAK_WELD';

export type DowinRequiredPartsWeldRejection =
  | 'UNSUPPORTED_SYSTEM'
  | 'UNSUPPORTED_PROFILE'
  | 'UNSUPPORTED_ANGLE_PAIR'
  | 'MISSING_ANGLE_AUTHORITY'
  | 'UNSUPPORTED_WELD_VALUE'
  | 'UNSUPPORTED_SOURCE_LAYER'
  | 'UNSUPPORTED_TARGET_LAYER'
  | 'DOUBLE_COUNT_PATH_DETECTED'
  | 'NON_FINITE_DESIGN_REPORT_LENGTH';

export type DowinRequiredPartsWeldSupportReason =
  | 'FORTY_FIVE_REPORT_PLUS_WELD'
  | 'NINETY_ORTA_REPORT_UNCHANGED';

export interface DowinRequiredPartsWeldInput {
  profileSystem: string;
  profileCode: string;
  sourceLayer: DowinParityLengthLayer;
  targetLayer: DowinParityLengthLayer;
  leftAngleDeg: number | null | undefined;
  rightAngleDeg: number | null | undefined;
  weldingWasteMm: number;
  designReportLengthMm: number;
  /**
   * Must be NONE for this helper. SASH_BASMA_KAYNAK_WELD means the piece already
   * received the isolated sash packed weld term — stacking is forbidden.
   */
  priorCompensationPath?: DowinParityPriorCompensationPath;
}

export type DowinRequiredPartsWeldResult =
  | {
      supported: true;
      reason: DowinRequiredPartsWeldSupportReason;
      authoritativeLengthMm: number;
      weldingWasteAppliedMm: number;
    }
  | {
      supported: false;
      reason: DowinRequiredPartsWeldRejection;
      authoritativeLengthMm: null;
    };

const SUPPORTED_45 = new Set<string>(FP024C12_SUPPORTED_45_PROFILE_CODES);
const SUPPORTED_90 = new Set<string>(FP024C12_SUPPORTED_90_PROFILE_CODES);
const SUPPORTED_WELD = new Set<number>(FP024C12_SUPPORTED_WELDING_WASTE_MM);

function fail(reason: DowinRequiredPartsWeldRejection): DowinRequiredPartsWeldResult {
  return { supported: false, reason, authoritativeLengthMm: null };
}

function isExactAngle(value: number, expected: 45 | 90): boolean {
  return Number.isFinite(value) && value === expected;
}

function angleAuthorityMissing(
  leftAngleDeg: number | null | undefined,
  rightAngleDeg: number | null | undefined
): boolean {
  return leftAngleDeg == null || rightAngleDeg == null;
}

/**
 * Bounded Design Report → Required Parts weld adjustment.
 * Fail closed outside the measured C.6–C.11 scope. Never infers 45°.
 */
export function evaluateDowinRequiredPartsWeldAdjustment(
  input: DowinRequiredPartsWeldInput
): DowinRequiredPartsWeldResult {
  if (input.sourceLayer !== 'DESIGN_REPORT') {
    return fail('UNSUPPORTED_SOURCE_LAYER');
  }
  if (input.targetLayer !== 'REQUIRED_PARTS') {
    return fail('UNSUPPORTED_TARGET_LAYER');
  }
  if ((input.priorCompensationPath ?? 'NONE') === 'SASH_BASMA_KAYNAK_WELD') {
    return fail('DOUBLE_COUNT_PATH_DETECTED');
  }
  if (input.profileSystem !== FP024C12_SUPPORTED_PROFILE_SYSTEM) {
    return fail('UNSUPPORTED_SYSTEM');
  }
  if (!SUPPORTED_45.has(input.profileCode) && !SUPPORTED_90.has(input.profileCode)) {
    return fail('UNSUPPORTED_PROFILE');
  }
  if (angleAuthorityMissing(input.leftAngleDeg, input.rightAngleDeg)) {
    return fail('MISSING_ANGLE_AUTHORITY');
  }
  const left = input.leftAngleDeg as number;
  const right = input.rightAngleDeg as number;
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return fail('UNSUPPORTED_ANGLE_PAIR');
  }

  const fortyFivePair = isExactAngle(left, 45) && isExactAngle(right, 45);
  const ninetyPair = isExactAngle(left, 90) && isExactAngle(right, 90);
  if (!fortyFivePair && !ninetyPair) {
    return fail('UNSUPPORTED_ANGLE_PAIR');
  }
  if (fortyFivePair && !SUPPORTED_45.has(input.profileCode)) {
    return fail('UNSUPPORTED_PROFILE');
  }
  if (ninetyPair && !SUPPORTED_90.has(input.profileCode)) {
    return fail('UNSUPPORTED_PROFILE');
  }

  if (typeof input.weldingWasteMm !== 'number' || !SUPPORTED_WELD.has(input.weldingWasteMm)) {
    return fail('UNSUPPORTED_WELD_VALUE');
  }
  if (!Number.isFinite(input.designReportLengthMm)) {
    return fail('NON_FINITE_DESIGN_REPORT_LENGTH');
  }

  if (ninetyPair) {
    return {
      supported: true,
      reason: 'NINETY_ORTA_REPORT_UNCHANGED',
      authoritativeLengthMm: roundManufacturingMm(input.designReportLengthMm),
      weldingWasteAppliedMm: 0,
    };
  }

  return {
    supported: true,
    reason: 'FORTY_FIVE_REPORT_PLUS_WELD',
    authoritativeLengthMm: roundManufacturingMm(
      input.designReportLengthMm + input.weldingWasteMm
    ),
    weldingWasteAppliedMm: input.weldingWasteMm,
  };
}
