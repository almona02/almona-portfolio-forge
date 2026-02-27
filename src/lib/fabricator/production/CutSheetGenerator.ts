/**
 * CutSheetGenerator - Per-bar cutting instructions for workshop
 *
 * Transforms CuttingPlan[] into printable cut sheets (per-bar instructions).
 * Phase 2: Production Documents (IMPROVEMENT_PLAN.md).
 *
 * Output: Structured data for PDF/print export.
 */

import type { CuttingPlan, Cut } from '@/types/fabricator';

export interface CutSheetBar {
  barIndex: number;
  profileName: string;
  profileId: string;
  stockLength: number;
  cuts: CutSheetCut[];
  wasteMm: number;
  utilizationPercent: number;
}

export interface CutSheetCut {
  sequence: number;
  lengthMm: number;
  angleDeg: number;
  componentId: string;
  componentType?: string;
  positionMm: number;
}

export interface CutSheet {
  orderNumber?: string;
  positionNumber?: string;
  generatedAt: string;
  bars: CutSheetBar[];
  totalBars: number;
  totalCuts: number;
  totalWasteMm: number;
}

/**
 * Generate printable cut sheets from cutting plans.
 */
export function generateCutSheets(
  cuttingPlans: CuttingPlan[],
  options?: { orderNumber?: string; positionNumber?: string }
): CutSheet {
  const bars: CutSheetBar[] = [];
  let totalCuts = 0;
  let totalWasteMm = 0;

  cuttingPlans.forEach((plan, planIndex) => {
    const stockLength = plan.stockLength || 6000;
    let currentPosition = 0;

    const cuts: CutSheetCut[] = plan.cuts.map((cut: Cut, cutIndex: number) => {
      const cutSheetCut: CutSheetCut = {
        sequence: cutIndex + 1,
        lengthMm: cut.length,
        angleDeg: cut.angle ?? 0,
        componentId: cut.componentId ?? `cut-${cutIndex + 1}`,
        componentType: cut.componentType,
        positionMm: currentPosition,
      };
      currentPosition += cut.length;
      return cutSheetCut;
    });

    const wasteMm = Math.max(0, stockLength - currentPosition);
    const utilizationPercent =
      stockLength > 0 ? ((currentPosition / stockLength) * 100) : 0;

    totalCuts += cuts.length;
    totalWasteMm += wasteMm;

    bars.push({
      barIndex: planIndex + 1,
      profileName: plan.profile?.name ?? plan.profile?.id ?? 'Unknown',
      profileId: plan.profile?.id ?? `profile-${planIndex}`,
      stockLength,
      cuts,
      wasteMm,
      utilizationPercent,
    });
  });

  return {
    orderNumber: options?.orderNumber,
    positionNumber: options?.positionNumber,
    generatedAt: new Date().toISOString(),
    bars,
    totalBars: bars.length,
    totalCuts,
    totalWasteMm,
  };
}
