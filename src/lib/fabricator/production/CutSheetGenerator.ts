/**
 * CutSheetGenerator - Per-bar cutting instructions for workshop
 *
 * Provides both:
 * - generateCutSheets(): Functional API for ProductionCommand (PDF/print export)
 * - CutSheetGenerator.generate(): Class API for ProductionDocumentsPanel (CutSheetItem[])
 *
 * Phase 2: Production Documents (IMPROVEMENT_PLAN.md).
 */

import type { Cut, CuttingPlan } from '@/types/fabricator';
import type { CutSheetItem } from '@/store/workflowStore';

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
 * Generate printable cut sheets from cutting plans (for ProductionCommand PDF export).
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

/**
 * CutSheetGenerator - Transforms CuttingPlan[] into formatted cut sheet items.
 * These are per-bar cutting instructions for the workshop floor.
 *
 * @since Phase 1: Core Pipeline Wiring
 */
export class CutSheetGenerator {
  static generate(cuttingPlan: CuttingPlan[]): CutSheetItem[] {
    const sheets: CutSheetItem[] = [];
    let globalIndex = 0;

    for (let barIndex = 0; barIndex < cuttingPlan.length; barIndex++) {
      const plan = cuttingPlan[barIndex];
      const stockBarId = `BAR-${barIndex + 1}`;
      const stockBarLength = plan.stockLength || 6000;
      const profileRole = plan.profile?.profileRole || plan.profile?.type || plan.profile?.name || 'profile';
      let positionOnBar = 0;

      for (const cut of plan.cuts) {
        sheets.push({
          id: `CS-${++globalIndex}`,
          profileRole,
          profileName: plan.profile?.name || profileRole,
          length: cut.length,
          angle: cut.angle ?? 90,
          quantity: 1,
          stockBarId,
          stockBarLength,
          positionOnBar,
        });
        positionOnBar += cut.length + 4; // 4mm saw blade kerf
      }
    }

    return sheets;
  }
}
