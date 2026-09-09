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
import {
  barRemnantLengthMm,
  pieceStartPositionsMm,
  resolveManufacturingSettings,
  type ManufacturingSettingsInput,
} from '@/lib/fabricator/ManufacturingSettings';

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
  /** Physical-cut identity when present on source Cut (FP-017) */
  cutId?: string;
  occurrenceIndex?: number;
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
  options?: { orderNumber?: string; positionNumber?: string } & ManufacturingSettingsInput
): CutSheet {
  const settings = resolveManufacturingSettings(options);
  const bars: CutSheetBar[] = [];
  let totalCuts = 0;
  let totalWasteMm = 0;

  cuttingPlans.forEach((plan, planIndex) => {
    const stockLength = plan.stockLength || 6000;
    const lengths = plan.cuts.map((cut) => cut.length);
    const starts = pieceStartPositionsMm(lengths, settings);

    const cuts: CutSheetCut[] = plan.cuts.map((cut: Cut, cutIndex: number) => ({
      sequence: cutIndex + 1,
      lengthMm: cut.length,
      angleDeg: cut.angle ?? 0,
      componentId: cut.componentId ?? `cut-${cutIndex + 1}`,
      cutId: cut.cutId,
      occurrenceIndex: cut.occurrenceIndex,
      componentType: cut.componentType,
      positionMm: starts[cutIndex],
    }));

    const wasteMm = Math.max(0, barRemnantLengthMm(stockLength, lengths, settings));
    const consumedMm = stockLength - wasteMm;
    const utilizationPercent =
      stockLength > 0 ? ((consumedMm / stockLength) * 100) : 0;

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
  static generate(
    cuttingPlan: CuttingPlan[],
    settingsInput: ManufacturingSettingsInput = {}
  ): CutSheetItem[] {
    const settings = resolveManufacturingSettings(settingsInput);
    const sheets: CutSheetItem[] = [];
    let globalIndex = 0;

    for (let barIndex = 0; barIndex < cuttingPlan.length; barIndex++) {
      const plan = cuttingPlan[barIndex];
      const stockBarId = `BAR-${barIndex + 1}`;
      const stockBarLength = plan.stockLength || 6000;
      const profileRole = plan.profile?.profileRole || plan.profile?.type || plan.profile?.name || 'profile';
      const starts = pieceStartPositionsMm(
        plan.cuts.map((cut) => cut.length),
        settings
      );

      for (let cutIndex = 0; cutIndex < plan.cuts.length; cutIndex++) {
        const cut = plan.cuts[cutIndex];
        sheets.push({
          id: `CS-${++globalIndex}`,
          profileRole,
          profileName: plan.profile?.name || profileRole,
          length: cut.length,
          angle: cut.angle ?? 90,
          quantity: 1,
          stockBarId,
          stockBarLength,
          positionOnBar: starts[cutIndex],
          cutId: cut.cutId,
          componentId: cut.componentId,
        });
      }
    }

    return sheets;
  }
}
