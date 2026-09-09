/**
 * FP-023B — Canonical bar-pack consumption (AICS-001 Tier 3)
 *
 * Physical Yilmaz chop-saw process (single-head or double-head packing a bar):
 * each finished piece is cut off the remaining stock. The blade removes
 * SawThickness once per piece. Optional TrimCut is reserved once per bar
 * (DoWin Settings.TrimCut). There is no extra “gap only between pieces”
 * model: the last piece still requires a saw pass.
 *
 * Licensed dealer audit (9 Sep 2026), DoWin factory Settings behaviour:
 *   Bar packing = Σ(piece + SawThickness) + TrimCut
 *
 * That is N kerfs for N pieces, plus TrimCut. Platform TrimCut is 0.
 *
 * This is independent of piece-length formulas (K-factor, Basma/Kaynak).
 *
 * @see docs/audits/DOWIN_VS_ALMONA_DEALER_AUDIT_2026-09-09.md
 * @see docs/audits/FP-023B-KERF-ACCOUNTING_2026-09-09.md
 */

export const BAR_PACK_KERF_RULE_ID = 'kerf_after_each_piece' as const;

export type BarPackKerfRuleId = typeof BAR_PACK_KERF_RULE_ID;

export interface BarPackSettings {
  sawKerfMm: number;
  trimCutMm: number;
}

const LENGTH_PRECISION = 10;

function roundMm(valueMm: number): number {
  return Math.round(valueMm * LENGTH_PRECISION) / LENGTH_PRECISION;
}

export interface BarPackAccount {
  pieceCount: number;
  pieceLengthMm: number;
  kerfLossMm: number;
  trimCutMm: number;
  consumedMm: number;
  remnantMm: number;
  ruleId: BarPackKerfRuleId;
}

export function pieceSlotMm(pieceLengthMm: number, sawKerfMm: number): number {
  return pieceLengthMm + sawKerfMm;
}

export function kerfLossOnBarMm(pieceCount: number, sawKerfMm: number): number {
  if (pieceCount <= 0) return 0;
  return pieceCount * sawKerfMm;
}

export function barConsumedLengthMm(
  cutLengthsMm: number[],
  settings: BarPackSettings
): number {
  const n = cutLengthsMm.length;
  if (n === 0) return 0;
  const pieces = cutLengthsMm.reduce((sum, length) => sum + length, 0);
  return pieces + kerfLossOnBarMm(n, settings.sawKerfMm) + settings.trimCutMm;
}

export function barRemnantLengthMm(
  stockLengthMm: number,
  cutLengthsMm: number[],
  settings: BarPackSettings
): number {
  return roundMm(stockLengthMm - barConsumedLengthMm(cutLengthsMm, settings));
}

export function pieceStartPositionsMm(
  cutLengthsMm: number[],
  settings: BarPackSettings
): number[] {
  let position = cutLengthsMm.length > 0 ? settings.trimCutMm : 0;
  return cutLengthsMm.map((length) => {
    const start = position;
    position += pieceSlotMm(length, settings.sawKerfMm);
    return start;
  });
}

export function accountBarPack(
  stockLengthMm: number,
  cutLengthsMm: number[],
  settings: BarPackSettings
): BarPackAccount {
  const pieceCount = cutLengthsMm.length;
  const pieceLengthMm = cutLengthsMm.reduce((sum, length) => sum + length, 0);
  const kerfLossMm = kerfLossOnBarMm(pieceCount, settings.sawKerfMm);
  const trimCutMm = pieceCount > 0 ? settings.trimCutMm : 0;
  const consumedMm = pieceCount > 0 ? pieceLengthMm + kerfLossMm + trimCutMm : 0;
  return {
    pieceCount,
    pieceLengthMm,
    kerfLossMm,
    trimCutMm,
    consumedMm,
    remnantMm: roundMm(stockLengthMm - consumedMm),
    ruleId: BAR_PACK_KERF_RULE_ID,
  };
}
