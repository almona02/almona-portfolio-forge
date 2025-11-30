/**
 * Optimization Presets
 * Pre-configured optimization strategies for different production scenarios
 */

export interface OptimizationStrategy {
  name: string;
  description: string;
  wasteReductionWeight: number; // 0-100
  remnantUsageWeight: number; // 0-100
  cutComplexityWeight: number; // 0-100
  productionSpeedWeight: number; // 0-100
}

export const OPTIMIZATION_PRESETS: Record<string, OptimizationStrategy> = {
  maximum_savings: {
    name: 'Maximum Material Savings',
    description: 'Prioritize waste reduction above all else. Best for expensive materials or tight budgets.',
    wasteReductionWeight: 90,
    remnantUsageWeight: 80,
    cutComplexityWeight: 30,
    productionSpeedWeight: 20,
  },
  fast_production: {
    name: 'Fast Production',
    description: 'Minimize number of cuts and setup time. Best for tight deadlines or high-volume production.',
    wasteReductionWeight: 40,
    remnantUsageWeight: 30,
    cutComplexityWeight: 20,
    productionSpeedWeight: 90,
  },
  remnant_reuse: {
    name: 'Remnant Reuse',
    description: 'Prioritize using existing remnants from previous jobs. Best for reducing inventory waste.',
    wasteReductionWeight: 60,
    remnantUsageWeight: 95,
    cutComplexityWeight: 50,
    productionSpeedWeight: 40,
  },
  balanced: {
    name: 'Balanced',
    description: 'Default balanced approach optimizing for efficiency across all factors.',
    wasteReductionWeight: 50,
    remnantUsageWeight: 50,
    cutComplexityWeight: 50,
    productionSpeedWeight: 50,
  },
  custom: {
    name: 'Custom',
    description: 'Fine-tune all parameters to match your specific needs.',
    wasteReductionWeight: 50,
    remnantUsageWeight: 50,
    cutComplexityWeight: 50,
    productionSpeedWeight: 50,
  },
};

export class OptimizationPresets {
  /**
   * Get preset by name
   */
  static getPreset(name: string): OptimizationStrategy {
    return OPTIMIZATION_PRESETS[name] || OPTIMIZATION_PRESETS.balanced;
  }

  /**
   * Get all preset names
   */
  static getPresetNames(): string[] {
    return Object.keys(OPTIMIZATION_PRESETS);
  }

  /**
   * Normalize weights to ensure they sum to a reasonable total
   * This helps prevent extreme configurations
   */
  static normalizeWeights(strategy: OptimizationStrategy): OptimizationStrategy {
    const total = strategy.wasteReductionWeight +
      strategy.remnantUsageWeight +
      strategy.cutComplexityWeight +
      strategy.productionSpeedWeight;

    // If total is too low or too high, normalize to 200 (balanced)
    if (total < 50 || total > 400) {
      const factor = 200 / total;
      return {
        ...strategy,
        wasteReductionWeight: Math.round(strategy.wasteReductionWeight * factor),
        remnantUsageWeight: Math.round(strategy.remnantUsageWeight * factor),
        cutComplexityWeight: Math.round(strategy.cutComplexityWeight * factor),
        productionSpeedWeight: Math.round(strategy.productionSpeedWeight * factor),
      };
    }

    return strategy;
  }

  /**
   * Calculate estimated impact of strategy
   */
  static estimateImpact(strategy: OptimizationStrategy): {
    estimatedWastePercentage: number;
    estimatedBarsUsed: number;
    estimatedOptimizationTime: number; // seconds
  } {
    // These are rough estimates based on weight distribution
    const wasteFactor = (100 - strategy.wasteReductionWeight) / 100;
    const speedFactor = (100 - strategy.productionSpeedWeight) / 100;
    const remnantFactor = (100 - strategy.remnantUsageWeight) / 100;

    return {
      estimatedWastePercentage: 5 + (wasteFactor * 15), // 5-20% range
      estimatedBarsUsed: Math.round(10 + (remnantFactor * 5)), // Example: 10-15 bars
      estimatedOptimizationTime: 2 + (speedFactor * 8), // 2-10 seconds
    };
  }
}

