/**
 * FP-024A — External bar-pack reconciliation (diagnostic only).
 *
 * Does NOT change barPackAccounting production mathematics.
 * Non-zero unexplained delta ⇒ UNRECONCILED. No magicAllowanceMm.
 *
 * observedExternalOverheadMm =
 *   stock − externalRemaining − Σ(packedSegments) − canonicalKerf − canonicalTrim
 */

import {
  accountBarPack,
  type BarPackSettings,
} from '@/lib/fabricator/barPackAccounting';

export type ExternalBarReconciliationStatus = 'RECONCILED' | 'UNRECONCILED';

export interface ExternalBarPattern {
  id: string;
  profileCode: string;
  stockLengthMm: number;
  applicationCount: number;
  pieceExternalIds: readonly string[];
  packedSegmentMm: number[];
  remainingMm: number;
  reportedWastePercent?: number | null;
  reportedYieldPercent?: number | null;
}

export interface ExternalBarReconciliation extends ReturnType<typeof accountBarPack> {
  patternId: string;
  profileCode: string;
  stockLengthMm: number;
  applicationCount: number;
  externalRemainingMm: number;
  extraAfterLabelsMm: number;
  canonicalRemainingMm: number;
  externalObservedConsumedMm: number;
  unexplainedDeltaMm: number;
  status: ExternalBarReconciliationStatus;
}

export function reconcileExternalBarPattern(
  pattern: ExternalBarPattern,
  settings: BarPackSettings
): ExternalBarReconciliation {
  const account = accountBarPack(pattern.stockLengthMm, pattern.packedSegmentMm, settings);
  const pieceSum = pattern.packedSegmentMm.reduce((s, n) => s + n, 0);
  const extraAfterLabelsMm = round1(pattern.stockLengthMm - pattern.remainingMm - pieceSum);
  const unexplainedDeltaMm = round1(
    extraAfterLabelsMm - account.kerfLossMm - account.trimCutMm
  );
  return {
    ...account,
    patternId: pattern.id,
    profileCode: pattern.profileCode,
    stockLengthMm: pattern.stockLengthMm,
    applicationCount: pattern.applicationCount,
    externalRemainingMm: pattern.remainingMm,
    extraAfterLabelsMm,
    canonicalRemainingMm: account.remnantMm,
    externalObservedConsumedMm: round1(pattern.stockLengthMm - pattern.remainingMm),
    unexplainedDeltaMm,
    status: unexplainedDeltaMm === 0 ? 'RECONCILED' : 'UNRECONCILED',
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** asdd Optimization List remainders (9 Sep 2026). Diagnostic evidence only. */
export const DOWIN_ASDD_EXTERNAL_BAR_PATTERNS: readonly ExternalBarPattern[] = [
  {
    id: 'asdd-frame-kasa-6000',
    profileCode: 'Deceuninck-KASA-70',
    stockLengthMm: 6000,
    applicationCount: 1,
    pieceExternalIds: [
      'asdd.Frame.Top',
      'asdd.Frame.Bottom',
      'asdd.Frame.Left',
      'asdd.Frame.Right',
    ],
    packedSegmentMm: [1503, 1503, 1003, 1003],
    remainingMm: 965,
  },
  {
    id: 'asdd-sash-kanat-6000',
    profileCode: 'Deceuninck-KANAT-70',
    stockLengthMm: 6000,
    applicationCount: 2,
    pieceExternalIds: [
      'asdd.Left.Sash.Top',
      'asdd.Left.Sash.Bottom',
      'asdd.Left.Sash.Left',
      'asdd.Left.Sash.Right',
      'asdd.Right.Sash.Top',
      'asdd.Right.Sash.Bottom',
      'asdd.Right.Sash.Left',
      'asdd.Right.Sash.Right',
    ],
    packedSegmentMm: [1433, 1433, 454, 454],
    remainingMm: 2203,
  },
  {
    id: 'asdd-mullion-orta-6500',
    profileCode: 'Deceuninck-ORTA-KAYIT-70',
    stockLengthMm: 6500,
    applicationCount: 1,
    pieceExternalIds: ['asdd.Mullion.Vertical'],
    packedSegmentMm: [1416],
    remainingMm: 5080,
  },
  {
    id: 'asdd-bead-cita-6500-a',
    profileCode: 'Deceuninck-CITA-20',
    stockLengthMm: 6500,
    applicationCount: 1,
    pieceExternalIds: [],
    packedSegmentMm: [1313, 1313, 1313, 1313, 334, 334, 334],
    remainingMm: 206,
  },
  {
    id: 'asdd-bead-cita-6500-b',
    profileCode: 'Deceuninck-CITA-20',
    stockLengthMm: 6500,
    applicationCount: 1,
    pieceExternalIds: [],
    packedSegmentMm: [334],
    remainingMm: 6160,
  },
];
