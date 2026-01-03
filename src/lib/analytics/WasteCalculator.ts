/**
 * Waste Calculator
 * Simulates "manual" cutting plan to compare against optimized results
 */

import type { Cut, CuttingPlan, Profile } from '@/types/fabricator';

export interface ManualCuttingPlan {
  barsUsed: number;
  totalWaste: number;
  wastePercentage: number;
  cuts: Cut[];
}

/**
 * Simulate a manual cutting plan using simple greedy approach
 * This represents how a fabricator would cut without optimization
 */
export function calculateManualCuttingPlan(
  requiredCuts: Cut[],
  profiles: Profile[],
  defaultStockLength: number = 6000
): ManualCuttingPlan {
  // Group cuts by profile (using componentId as proxy since Cut doesn't have profileId)
  // In practice, cuts should be grouped by the profile they belong to from the cutting plan
  const cutsByProfile = new Map<string, Cut[]>();
  for (const cut of requiredCuts) {
    // Use componentId prefix or a default key - in real usage, this would come from CuttingPlan
    const profileKey = cut.componentId?.split('-')[0] || 'default';
    if (!cutsByProfile.has(profileKey)) {
      cutsByProfile.set(profileKey, []);
    }
    cutsByProfile.get(profileKey)!.push(cut);
  }

  let totalBarsUsed = 0;
  let totalWaste = 0;
  const allCuts: Cut[] = [];

  // Process each profile separately
  for (const [_profileId, cuts] of cutsByProfile.entries()) {
    // Sort cuts by length (descending) - simple greedy approach
    const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);

    let currentBarRemaining = defaultStockLength;
    let currentBarCuts: Cut[] = [];

    for (const cut of sortedCuts) {
      // Cuts don't have quantity - process each cut once
      // If current bar can't fit this cut, start a new bar
      if (currentBarRemaining < cut.length) {
        // Save waste from current bar
        if (currentBarRemaining > 200) {
          // Only count as waste if > 200mm (minimum usable remnant)
          totalWaste += currentBarRemaining;
        }

        // Start new bar
        totalBarsUsed++;
        currentBarRemaining = defaultStockLength;
        currentBarCuts = [];
      }

      // Add cut to current bar
      currentBarCuts.push(cut);
      allCuts.push(cut);
      currentBarRemaining -= cut.length;

      // If bar is getting full and next cut might not fit, start a new one (heuristic: if < 500mm remaining)
      if (currentBarRemaining < 500) {
        if (currentBarRemaining > 200) {
          totalWaste += currentBarRemaining;
        }
        totalBarsUsed++;
        currentBarRemaining = defaultStockLength;
        currentBarCuts = [];
      }
    }

    // Add remaining waste from last bar
    if (currentBarRemaining > 200) {
      totalWaste += currentBarRemaining;
    }
    if (currentBarCuts.length > 0) {
      totalBarsUsed++;
    }
  }

  const totalMaterialUsed = totalBarsUsed * defaultStockLength;
  const wastePercentage = totalMaterialUsed > 0 ? (totalWaste / totalMaterialUsed) * 100 : 0;

  return {
    barsUsed: totalBarsUsed,
    totalWaste,
    wastePercentage,
    cuts: allCuts,
  };
}

/**
 * Compare manual plan with optimized plan
 */
export interface WasteComparison {
  manual: {
    barsUsed: number;
    wastePercentage: number;
    totalWaste: number;
  };
  optimized: {
    barsUsed: number;
    wastePercentage: number;
    totalWaste: number;
  };
  savings: {
    barsSaved: number;
    wasteReduction: number;
    costSavings: number;
    costPerBar: number;
  };
}

export function compareWaste(
  manualPlan: ManualCuttingPlan,
  optimizedPlan: CuttingPlan[],
  costPerBar: number = 0
): WasteComparison {
  // Calculate optimized metrics
  const optimizedBarsUsed = optimizedPlan.length;
  const optimizedTotalWaste = optimizedPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
  const optimizedTotalMaterial = optimizedPlan.reduce(
    (sum, plan) => sum + plan.stockLength * plan.cuts.length,
    0
  );
  const optimizedWastePercentage =
    optimizedTotalMaterial > 0 ? (optimizedTotalWaste / optimizedTotalMaterial) * 100 : 0;

  // Calculate savings
  const barsSaved = manualPlan.barsUsed - optimizedBarsUsed;
  const wasteReduction = manualPlan.wastePercentage - optimizedWastePercentage;
  const costSavings = barsSaved * costPerBar;

  return {
    manual: {
      barsUsed: manualPlan.barsUsed,
      wastePercentage: manualPlan.wastePercentage,
      totalWaste: manualPlan.totalWaste,
    },
    optimized: {
      barsUsed: optimizedBarsUsed,
      wastePercentage: optimizedWastePercentage,
      totalWaste: optimizedTotalWaste,
    },
    savings: {
      barsSaved,
      wasteReduction,
      costSavings,
      costPerBar,
    },
  };
}

