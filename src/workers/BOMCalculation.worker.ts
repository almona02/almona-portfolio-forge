import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import type { AccessoryItem } from '../lib/fabricator/bom/AccessoriesBOMCalculator';
import { CostCalculator } from '../lib/fabricator/bom/CostCalculator';
import { EgyptianPatternOptimizer } from '../lib/fabricator/bom/EgyptianPatternOptimizer';
import { GlassBOMCalculator } from '../lib/fabricator/bom/GlassBOMCalculator';
import { HardwareBOMCalculator } from '../lib/fabricator/bom/HardwareBOMCalculator';
import { ProfileBOMCalculator } from '../lib/fabricator/bom/ProfileBOMCalculator';

interface BOMMessageData {
  jobId: string;
  windowUnit: WindowUnit;
  pattern: EgyptianPattern;
  systemPack: SystemPack;
}

// Initialize Calculators
const profileCalculator = new ProfileBOMCalculator();
const glassCalculator = new GlassBOMCalculator();
const hardwareCalculator = new HardwareBOMCalculator();
const costCalculator = new CostCalculator();

self.onmessage = async (e: MessageEvent<BOMMessageData>) => {
  const { jobId, windowUnit, pattern, systemPack } = e.data;

  try {
    // 1. Calculate Profiles
    const profiles = await profileCalculator.calculateProfileBOM(windowUnit, pattern, systemPack);

    // 2. Calculate Glazing
    const glazing = await glassCalculator.calculateGlassBOM(windowUnit, pattern);

    // 3. Calculate Hardware
    const hardware = await hardwareCalculator.calculateHardwareBOM(windowUnit, pattern, systemPack);

    // 4. Calculate Accessories (Placeholder or from Pattern)
    const accessories: AccessoryItem[] = [];

    // 5. Calculate Cost (sync method)
    const cost = costCalculator.calculateAccurateCost(
        profiles,
        hardware,
        glazing,
        accessories,
        windowUnit
    );

    // 6. Egyptian Pattern Optimization (Phase 2/3)
    const optimizedPlan = null;
    const egyptianPatternId = EgyptianPatternOptimizer.detectEgyptianPattern({
        grid: windowUnit.grid,
        dimensions: { width: windowUnit.overallWidth, height: windowUnit.overallHeight },
        systemPackId: windowUnit.systemPackId
    });

    if (egyptianPatternId) {
        // In the future, this will return the full cutting plan
        // optimizedPlan = await EgyptianPatternOptimizer.getPrecomputedPlan(egyptianPatternId, ...);
    }

    // Send Result
    self.postMessage({
      jobId,
      status: 'success',
      result: {
        profiles,
        glazing,
        hardware,
        cost,
        egyptianPatternId, // Pass the detected pattern ID
        optimization: {
             materialUsage: 0, // Placeholder for Phase 3
             wastePercentage: 0,
             estimatedProductionTime: 0,
             cuttingPlan: [],
             nestingEfficiency: 0,
             costBreakdown: cost,
             ...(optimizedPlan || {}) // Spread optimized plan if available
        }
      }
    });

  } catch (error) {
    self.postMessage({
      jobId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown BOM calculation error'
    });
  }
};
