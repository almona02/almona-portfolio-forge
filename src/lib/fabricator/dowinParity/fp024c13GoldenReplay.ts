/**
 * FP-024C.13 — Golden replay of accepted Design Report → Required Parts
 * evidence through the public parity API (AICS-001).
 *
 * Exercises computeDowinRequiredPartsFromDesignReport only.
 * Does not call production engines. Does not invent new evidence.
 */

import {
  computeDowinRequiredPartsFromDesignReport,
  FP024C12_SUPPORTED_PROFILE_SYSTEM,
  type DowinParityLengthLayer,
  type DowinRequiredPartsParityResult,
  type DowinRequiredPartsWeldInput,
} from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';

export const FP024C13_PROFILE_CODES = {
  KASA: 'Deceuninck-KASA-70',
  KANAT: 'Deceuninck-KANAT-70',
  CITA: 'Deceuninck-CITA-20',
  ORTA: 'Deceuninck-ORTA-KAYIT-70',
} as const;

export type Fp024c13GoldenGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Fp024c13ProfileFamily = keyof typeof FP024C13_PROFILE_CODES;

export interface Fp024c13GoldenCase {
  id: string;
  group: Fp024c13GoldenGroup;
  fixture: 'asdd' | 'c5';
  profileFamily: Fp024c13ProfileFamily;
  profileCode: (typeof FP024C13_PROFILE_CODES)[Fp024c13ProfileFamily];
  leftAngleDeg: 45 | 90;
  rightAngleDeg: 45 | 90;
  weldingWasteMm: 0 | 2 | 3;
  designReportLengthMm: number;
  expectedRequiredPartsMm: number;
}

export interface Fp024c13FailClosedCase {
  id: string;
  label: string;
  input: DowinRequiredPartsWeldInput;
  expectedReason: DowinRequiredPartsParityResult['reason'];
}

export interface Fp024c13GoldenReplayRow {
  id: string;
  group: Fp024c13GoldenGroup;
  fixture: 'asdd' | 'c5';
  profileFamily: Fp024c13ProfileFamily;
  angles: string;
  weldingWasteMm: number;
  designReportLengthMm: number;
  expectedRequiredPartsMm: number;
  actualRequiredPartsMm: number | null;
  deltaMm: number | null;
  supported: boolean;
  reason: DowinRequiredPartsParityResult['reason'];
  verdict: 'PASS' | 'FAIL';
}

function golden(
  group: Fp024c13GoldenGroup,
  fixture: 'asdd' | 'c5',
  profileFamily: Fp024c13ProfileFamily,
  weldingWasteMm: 0 | 2 | 3,
  designReportLengthMm: number,
  expectedRequiredPartsMm: number
): Fp024c13GoldenCase {
  const fortyFive = profileFamily !== 'ORTA';
  return {
    id: `${group}-${fixture}-${profileFamily}-${designReportLengthMm}-weld${weldingWasteMm}`,
    group,
    fixture,
    profileFamily,
    profileCode: FP024C13_PROFILE_CODES[profileFamily],
    leftAngleDeg: fortyFive ? 45 : 90,
    rightAngleDeg: fortyFive ? 45 : 90,
    weldingWasteMm,
    designReportLengthMm,
    expectedRequiredPartsMm,
  };
}

/** Accepted measured conditions only. Do not patch expected millimetres. */
export const FP024C13_GOLDEN_CASES: readonly Fp024c13GoldenCase[] = [
  golden('A', 'asdd', 'KASA', 3, 1000, 1003),
  golden('A', 'asdd', 'KASA', 3, 1500, 1503),
  golden('A', 'asdd', 'KANAT', 3, 451, 454),
  golden('A', 'asdd', 'KANAT', 3, 1430, 1433),
  golden('A', 'asdd', 'ORTA', 3, 1416, 1416),
  golden('B', 'asdd', 'KASA', 0, 1000, 1000),
  golden('B', 'asdd', 'KASA', 0, 1500, 1500),
  golden('B', 'asdd', 'KANAT', 0, 451, 451),
  golden('B', 'asdd', 'KANAT', 0, 1430, 1430),
  golden('B', 'asdd', 'ORTA', 0, 1416, 1416),
  golden('C', 'asdd', 'KASA', 2, 1000, 1002),
  golden('C', 'asdd', 'KASA', 2, 1500, 1502),
  golden('C', 'asdd', 'KANAT', 2, 451, 453),
  golden('C', 'asdd', 'KANAT', 2, 1430, 1432),
  golden('C', 'asdd', 'ORTA', 2, 1416, 1416),
  golden('D', 'c5', 'KASA', 3, 1200, 1203),
  golden('D', 'c5', 'CITA', 3, 537, 540),
  golden('D', 'c5', 'CITA', 3, 1116, 1119),
  golden('D', 'c5', 'ORTA', 3, 1116, 1116),
  golden('E', 'c5', 'KASA', 0, 1200, 1200),
  golden('E', 'c5', 'CITA', 0, 537, 537),
  golden('E', 'c5', 'CITA', 0, 1116, 1116),
  golden('E', 'c5', 'ORTA', 0, 1116, 1116),
  golden('F', 'c5', 'KASA', 2, 1200, 1202),
  golden('F', 'c5', 'CITA', 2, 537, 539),
  golden('F', 'c5', 'CITA', 2, 1116, 1118),
  golden('F', 'c5', 'ORTA', 2, 1116, 1116),
];

function failClosed(
  id: string,
  label: string,
  overrides: Partial<DowinRequiredPartsWeldInput>,
  expectedReason: DowinRequiredPartsParityResult['reason']
): Fp024c13FailClosedCase {
  return {
    id,
    label,
    expectedReason,
    input: {
      profileSystem: FP024C12_SUPPORTED_PROFILE_SYSTEM,
      profileCode: FP024C13_PROFILE_CODES.KASA,
      sourceLayer: 'DESIGN_REPORT',
      targetLayer: 'REQUIRED_PARTS',
      leftAngleDeg: 45,
      rightAngleDeg: 45,
      weldingWasteMm: 3,
      designReportLengthMm: 1200,
      priorCompensationPath: 'NONE',
      ...overrides,
    },
  };
}

export const FP024C13_FAIL_CLOSED_CASES: readonly Fp024c13FailClosedCase[] = [
  failClosed('fc-weld-1', 'Weld 1', { weldingWasteMm: 1 }, 'UNSUPPORTED_WELD_VALUE'),
  failClosed('fc-weld-4', 'Weld 4', { weldingWasteMm: 4 }, 'UNSUPPORTED_WELD_VALUE'),
  failClosed('fc-weld-neg', 'negative Weld', { weldingWasteMm: -1 }, 'UNSUPPORTED_WELD_VALUE'),
  failClosed('fc-weld-nan', 'NaN Weld', { weldingWasteMm: Number.NaN }, 'UNSUPPORTED_WELD_VALUE'),
  failClosed('fc-45-90', '45/90', { leftAngleDeg: 45, rightAngleDeg: 90 }, 'UNSUPPORTED_ANGLE_PAIR'),
  failClosed('fc-90-45', '90/45', { leftAngleDeg: 90, rightAngleDeg: 45 }, 'UNSUPPORTED_ANGLE_PAIR'),
  failClosed('fc-missing-left', 'missing left', { leftAngleDeg: null }, 'MISSING_ANGLE_AUTHORITY'),
  failClosed('fc-missing-right', 'missing right', { rightAngleDeg: undefined }, 'MISSING_ANGLE_AUTHORITY'),
  failClosed('fc-30-30', '30/30', { leftAngleDeg: 30, rightAngleDeg: 30 }, 'UNSUPPORTED_ANGLE_PAIR'),
  failClosed(
    'fc-system',
    'unsupported system',
    { profileSystem: 'Deceuninck' },
    'UNSUPPORTED_SYSTEM'
  ),
  failClosed(
    'fc-profile',
    'unsupported profile',
    { profileCode: 'Deceuninck-UNKNOWN-70' },
    'UNSUPPORTED_PROFILE'
  ),
  failClosed('fc-alias', 'profile alias', { profileCode: 'KANAT-70' }, 'UNSUPPORTED_PROFILE'),
  failClosed('fc-packed', 'PACKED source', { sourceLayer: 'PACKED' }, 'UNSUPPORTED_SOURCE_LAYER'),
  failClosed('fc-machine', 'MACHINE source', { sourceLayer: 'MACHINE' }, 'UNSUPPORTED_SOURCE_LAYER'),
  failClosed(
    'fc-required-parts-source',
    'REQUIRED_PARTS source',
    { sourceLayer: 'REQUIRED_PARTS' },
    'UNSUPPORTED_SOURCE_LAYER'
  ),
  failClosed('fc-target', 'wrong target', { targetLayer: 'PACKED' }, 'UNSUPPORTED_TARGET_LAYER'),
];

function replayGolden(row: Fp024c13GoldenCase): Fp024c13GoldenReplayRow {
  const actual = computeDowinRequiredPartsFromDesignReport({
    profileSystem: FP024C12_SUPPORTED_PROFILE_SYSTEM,
    profileCode: row.profileCode,
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: row.leftAngleDeg,
    rightAngleDeg: row.rightAngleDeg,
    weldingWasteMm: row.weldingWasteMm,
    designReportLengthMm: row.designReportLengthMm,
    priorCompensationPath: 'NONE',
  });
  const actualMm = actual.requiredPartsLengthMm;
  const pass =
    actual.supported &&
    actual.sourceLayer === 'DESIGN_REPORT' &&
    actual.targetLayer === 'REQUIRED_PARTS' &&
    actualMm === row.expectedRequiredPartsMm;
  return {
    id: row.id,
    group: row.group,
    fixture: row.fixture,
    profileFamily: row.profileFamily,
    angles: `${row.leftAngleDeg}/${row.rightAngleDeg}`,
    weldingWasteMm: row.weldingWasteMm,
    designReportLengthMm: row.designReportLengthMm,
    expectedRequiredPartsMm: row.expectedRequiredPartsMm,
    actualRequiredPartsMm: actualMm,
    deltaMm: actualMm == null ? null : actualMm - row.expectedRequiredPartsMm,
    supported: actual.supported,
    reason: actual.reason,
    verdict: pass ? 'PASS' : 'FAIL',
  };
}

export function replayFp024c13FailClosed(row: Fp024c13FailClosedCase): {
  id: string;
  label: string;
  supported: boolean;
  authoritativeLengthMm: number | null;
  reason: DowinRequiredPartsParityResult['reason'];
  verdict: 'PASS' | 'FAIL';
} {
  const actual = computeDowinRequiredPartsFromDesignReport(row.input);
  const pass =
    actual.supported === false &&
    actual.requiredPartsLengthMm === null &&
    actual.reason === row.expectedReason;
  return {
    id: row.id,
    label: row.label,
    supported: actual.supported,
    authoritativeLengthMm: actual.requiredPartsLengthMm,
    reason: actual.reason,
    verdict: pass ? 'PASS' : 'FAIL',
  };
}

export function evaluateFp024c13GoldenReplay(): {
  status: 'PASS' | 'FAIL';
  supportedCaseCount: number;
  passedCount: number;
  mismatchCount: number;
  rows: Fp024c13GoldenReplayRow[];
  ortaNegativeControl: 'PASS' | 'ANGLE_SCOPE_REGRESSION';
  failClosed: {
    caseCount: number;
    passCount: number;
    failureCount: number;
    status: 'PASS' | 'FAIL';
    rows: ReturnType<typeof replayFp024c13FailClosed>[];
  };
  noFallback: {
    missingAngleDoesNotDefaultTo45: boolean;
    mixedAngleNotTreatedAsFortyFive: boolean;
    weldOneNotExtrapolated: boolean;
    substringSystemRejected: boolean;
    aliasProfileRejected: boolean;
    status: 'PASS' | 'FAIL';
  };
} {
  const rows = FP024C13_GOLDEN_CASES.map(replayGolden);
  const mismatchCount = rows.filter((row) => row.verdict === 'FAIL').length;
  const orta = rows.filter((row) => row.profileFamily === 'ORTA');
  const ortaOk = orta.every(
    (row) => row.verdict === 'PASS' && row.actualRequiredPartsMm === row.designReportLengthMm
  );
  const failClosedRows = FP024C13_FAIL_CLOSED_CASES.map(replayFp024c13FailClosed);
  const failClosedFailures = failClosedRows.filter((row) => row.verdict === 'FAIL').length;

  const missing = computeDowinRequiredPartsFromDesignReport({
    profileSystem: FP024C12_SUPPORTED_PROFILE_SYSTEM,
    profileCode: FP024C13_PROFILE_CODES.KASA,
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: null,
    rightAngleDeg: 45,
    weldingWasteMm: 3,
    designReportLengthMm: 1200,
  });
  const mixed = computeDowinRequiredPartsFromDesignReport({
    profileSystem: FP024C12_SUPPORTED_PROFILE_SYSTEM,
    profileCode: FP024C13_PROFILE_CODES.KASA,
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: 45,
    rightAngleDeg: 90,
    weldingWasteMm: 3,
    designReportLengthMm: 1200,
  });
  const weldOne = computeDowinRequiredPartsFromDesignReport({
    profileSystem: FP024C12_SUPPORTED_PROFILE_SYSTEM,
    profileCode: FP024C13_PROFILE_CODES.KASA,
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: 45,
    rightAngleDeg: 45,
    weldingWasteMm: 1,
    designReportLengthMm: 1200,
  });
  const substring = computeDowinRequiredPartsFromDesignReport({
    profileSystem: 'Deceuninck',
    profileCode: FP024C13_PROFILE_CODES.KASA,
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: 45,
    rightAngleDeg: 45,
    weldingWasteMm: 3,
    designReportLengthMm: 1200,
  });
  const alias = computeDowinRequiredPartsFromDesignReport({
    profileSystem: FP024C12_SUPPORTED_PROFILE_SYSTEM,
    profileCode: 'KANAT-70',
    sourceLayer: 'DESIGN_REPORT',
    targetLayer: 'REQUIRED_PARTS',
    leftAngleDeg: 45,
    rightAngleDeg: 45,
    weldingWasteMm: 3,
    designReportLengthMm: 451,
  });

  const noFallback = {
    missingAngleDoesNotDefaultTo45:
      missing.supported === false && missing.requiredPartsLengthMm !== 1203,
    mixedAngleNotTreatedAsFortyFive:
      mixed.supported === false && mixed.requiredPartsLengthMm !== 1203,
    weldOneNotExtrapolated: weldOne.supported === false && weldOne.requiredPartsLengthMm !== 1201,
    substringSystemRejected: substring.supported === false && substring.reason === 'UNSUPPORTED_SYSTEM',
    aliasProfileRejected: alias.supported === false && alias.reason === 'UNSUPPORTED_PROFILE',
    status: 'PASS' as 'PASS' | 'FAIL',
  };
  if (
    !noFallback.missingAngleDoesNotDefaultTo45 ||
    !noFallback.mixedAngleNotTreatedAsFortyFive ||
    !noFallback.weldOneNotExtrapolated ||
    !noFallback.substringSystemRejected ||
    !noFallback.aliasProfileRejected
  ) {
    noFallback.status = 'FAIL';
  }

  const goldenPass = mismatchCount === 0;
  const failClosedPass = failClosedFailures === 0;
  return {
    status: goldenPass && failClosedPass && ortaOk && noFallback.status === 'PASS' ? 'PASS' : 'FAIL',
    supportedCaseCount: rows.length,
    passedCount: rows.filter((row) => row.verdict === 'PASS').length,
    mismatchCount,
    rows,
    ortaNegativeControl: ortaOk ? 'PASS' : 'ANGLE_SCOPE_REGRESSION',
    failClosed: {
      caseCount: failClosedRows.length,
      passCount: failClosedRows.filter((row) => row.verdict === 'PASS').length,
      failureCount: failClosedFailures,
      status: failClosedPass ? 'PASS' : 'FAIL',
      rows: failClosedRows,
    },
    noFallback,
  };
}

export function fp024c13RowsForGroup(
  rows: readonly Fp024c13GoldenReplayRow[],
  group: Fp024c13GoldenGroup
): Fp024c13GoldenReplayRow[] {
  return rows.filter((row) => row.group === group);
}

export const FP024C13_SOURCE_LAYER: DowinParityLengthLayer = 'DESIGN_REPORT';
export const FP024C13_TARGET_LAYER: DowinParityLengthLayer = 'REQUIRED_PARTS';
