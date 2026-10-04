/**
 * FP-028 / A6 — Explicit millimetre ↔ micron helpers for Apex boundaries.
 * ProfileSpec.standardStockLength is mm; ComponentNode.fabricationData.stockLength is microns.
 */

/**
 * Convert approved stock length (mm) to microns.
 * Rejects missing/non-positive values — never invents 6000 mm.
 */
export function stockLengthMmToMicrons(stockLengthMm: number | undefined, role: string): number {
  if (!Number.isFinite(stockLengthMm) || (stockLengthMm as number) <= 0) {
    throw new Error(
      `Apex V2 blocked: missing approved ${role} standardStockLength in mm (FP-028 / A6).`
    );
  }
  return (stockLengthMm as number) * 1000;
}
