import type { CuttingPlan } from '@/types/fabricator';
import type { CutSheetItem } from '@/store/workflowStore';

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
