/**
 * FP-024A — Three-layer cut-length semantics (AICS-001 Tier 3)
 *
 * DoWin's asdd export publishes three millimetre concepts for one physical piece:
 *   1. nominal / report     — Design Preview / assembly table (frame 1000)
 *   2. packed / compensated — optimization bar-graphic label (frame 1003)
 *   3. machine instruction   — DC-600 MDB LENGTH when that row exists
 *
 * Historical `Cut.length` is the planned/saw-oriented millimetre for packing.
 * Do not treat it as the design finished size. Do not fall back from packed
 * to nominal, or from machine to packed, merely because one field is missing.
 *
 * Do not alias endDeductionMm to trimCutMm.
 */

import type { Cut } from '@/types/fabricator';

export function nominalLengthMm(
  cut: Pick<Cut, 'reportedWeldedLengthMm' | 'nominalLengthMm'>
): number | null {
  return cut.nominalLengthMm ?? cut.reportedWeldedLengthMm ?? null;
}

export function packedSegmentLengthMm(cut: Pick<Cut, 'packedSegmentMm'>): number | null {
  return cut.packedSegmentMm ?? null;
}

export function machineInstructionLengthMm(
  cut: Pick<Cut, 'machineInstructionLengthMm'>
): number | null {
  return cut.machineInstructionLengthMm ?? null;
}

/** Historical packing length. Not an FP-024 machine-parity claim. */
export function physicalSawCutLengthMm(cut: Pick<Cut, 'length' | 'sawCutLengthMm'>): number {
  return cut.sawCutLengthMm ?? cut.length;
}

export function reportedWeldedLengthMm(
  cut: Pick<Cut, 'reportedWeldedLengthMm' | 'nominalLengthMm'>
): number | null {
  return nominalLengthMm(cut);
}
