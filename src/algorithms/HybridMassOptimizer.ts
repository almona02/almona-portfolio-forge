/**
 * Hybrid Mass Production Optimizer
 * Combines cross-project genetic algorithm with remnant-first optimization
 * Designed for large-scale mass production scenarios
 */

import {
  WindowUnit,
  CuttingPlan,
  Cut,
  Profile,
  MassProductionOptimizationRequest,
} from '@/types/fabricator';
import { remnantManager, RemnantMatch } from '@/lib/inventory/RemnantManager';
import { GeneticOptimizer } from './geneticOptimization';

export interface HybridOptimizationResult {
  unifiedCuttingPlan: CuttingPlan[];
  remnantMatches: RemnantMatch[];
  baselineWaste: number;
  optimizedWaste: number;
  wasteReduction: number;
  remnantUtilization: number;
  totalSavings: number;
  optimizationStrategy: string;
  crossProjectRemnantsUsed: string[];
}

export class HybridMassOptimizer {
  /**
   * Optimize across multiple projects with hybrid approach
   */
  async optimizeMassProduction(
    projects: WindowUnit[],
    request: MassProductionOptimizationRequest
  ): Promise<HybridOptimizationResult> {
    // Step 1: Aggregate all cuts across projects by profile
    const cutsByProfile = this.aggregateCutsByProfile(projects);

    // Step 2: Get available remnants (cross-project if enabled)
    const availableRemnants = await this.getAvailableRemnants(
      request.crossProjectRemnantPool
    );

    // Step 3: Match remnants to cuts (remnant-first strategy)
    const remnantMatches = await this.matchRemnantsToCuts(
      cutsByProfile,
      availableRemnants,
      request
    );

    // Step 4: Optimize remaining cuts with genetic algorithm
    const remainingCuts = this.getRemainingCuts(cutsByProfile, remnantMatches);
    const optimizedPlans = await this.optimizeWithGenetic(
      remainingCuts,
      request
    );

    // Step 5: Calculate metrics
    const baselineWaste = this.calculateBaselineWaste(projects);
    const optimizedWaste = this.calculateOptimizedWaste(
      optimizedPlans,
      remnantMatches
    );
    const wasteReduction = baselineWaste - optimizedWaste;
    const remnantUtilization = this.calculateRemnantUtilization(remnantMatches);
    const totalSavings = this.calculateTotalSavings(remnantMatches, wasteReduction);

    return {
      unifiedCuttingPlan: optimizedPlans,
      remnantMatches,
      baselineWaste,
      optimizedWaste,
      wasteReduction,
      remnantUtilization,
      totalSavings,
      optimizationStrategy: request.optimizationStrategy,
      crossProjectRemnantsUsed: remnantMatches.map((m) => m.remnant.id),
    };
  }

  /**
   * Aggregate cuts from all projects grouped by profile
   */
  private aggregateCutsByProfile(
    projects: WindowUnit[]
  ): Map<string, { profile: Profile; cuts: Cut[] }> {
    const cutsByProfile = new Map<string, { profile: Profile; cuts: Cut[] }>();

    for (const project of projects) {
      if (!project.optimization?.cuttingPlan) continue;

      for (const plan of project.optimization.cuttingPlan) {
        const profileId = plan.profile.id;
        if (!cutsByProfile.has(profileId)) {
          cutsByProfile.set(profileId, {
            profile: plan.profile,
            cuts: [],
          });
        }

        const entry = cutsByProfile.get(profileId)!;
        entry.cuts.push(...plan.cuts);
      }
    }

    return cutsByProfile;
  }

  /**
   * Get available remnants (workshop-wide if cross-project enabled)
   */
  private async getAvailableRemnants(
    _crossProject: boolean
  ): Promise<Map<string, any[]>> {
    // TODO: Implement actual remnant fetching from database
    // For now, return empty map
    return new Map();
  }

  /**
   * Match remnants to cuts using remnant-first strategy
   */
  private async matchRemnantsToCuts(
    cutsByProfile: Map<string, { profile: Profile; cuts: Cut[] }>,
    availableRemnants: Map<string, any[]>,
    _request: MassProductionOptimizationRequest
  ): Promise<RemnantMatch[]> {
    const matches: RemnantMatch[] = [];

    for (const [profileId, { profile, cuts }] of cutsByProfile.entries()) {
      const _remnants = availableRemnants.get(profileId) || [];

      // Find matches for this profile
      const profileMatches = await remnantManager.findRemnantMatches(
        cuts,
        profile,
        profile.material,
        {
          useRemnantsFirst: true,
          minUtilization: 70,
          maxWastePercentage: 30,
        }
      );

      matches.push(...profileMatches);
    }

    return matches;
  }

  /**
   * Get remaining cuts after remnant matching
   */
  private getRemainingCuts(
    cutsByProfile: Map<string, { profile: Profile; cuts: Cut[] }>,
    remnantMatches: RemnantMatch[]
  ): Map<string, { profile: Profile; cuts: Cut[] }> {
    const matchedCutIds = new Set(
      remnantMatches.flatMap((m) => m.cuts.map((c) => c.componentId))
    );

    const remaining = new Map<string, { profile: Profile; cuts: Cut[] }>();

    for (const [profileId, { profile, cuts }] of cutsByProfile.entries()) {
      const unmatchedCuts = cuts.filter(
        (c) => !matchedCutIds.has(c.componentId)
      );

      if (unmatchedCuts.length > 0) {
        remaining.set(profileId, {
          profile,
          cuts: unmatchedCuts,
        });
      }
    }

    return remaining;
  }

  /**
   * Optimize remaining cuts with genetic algorithm
   */
  private async optimizeWithGenetic(
    remainingCuts: Map<string, { profile: Profile; cuts: Cut[] }>,
    request: MassProductionOptimizationRequest
  ): Promise<CuttingPlan[]> {
    const allPlans: CuttingPlan[] = [];

    for (const [_profileId, { profile, cuts }] of remainingCuts.entries()) {
      const stockLength = request.constraints.maxStockLengthMm || 6000;

      // Use genetic algorithm for complex optimization
      const geneticOptimizer = new GeneticOptimizer(cuts, profile, stockLength, {
        populationSize: 100,
        generations: 50,
        mutationRate: 0.1,
        crossoverRate: 0.8,
      });

      const plans = geneticOptimizer.optimize();
      allPlans.push(...plans);
    }

    return allPlans;
  }

  /**
   * Calculate baseline waste from individual project optimizations
   */
  private calculateBaselineWaste(projects: WindowUnit[]): number {
    let totalWaste = 0;

    for (const project of projects) {
      if (!project.optimization?.cuttingPlan) continue;

      for (const plan of project.optimization.cuttingPlan) {
        totalWaste += plan.totalWaste;
      }
    }

    return totalWaste;
  }

  /**
   * Calculate optimized waste after mass production optimization
   */
  private calculateOptimizedWaste(
    plans: CuttingPlan[],
    remnantMatches: RemnantMatch[]
  ): number {
    const planWaste = plans.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const remnantWaste = remnantMatches.reduce((sum, match) => sum + match.waste, 0);

    return planWaste + remnantWaste;
  }

  /**
   * Calculate remnant utilization percentage
   */
  private calculateRemnantUtilization(remnantMatches: RemnantMatch[]): number {
    if (remnantMatches.length === 0) return 0;

    const totalRemnantLength = remnantMatches.reduce(
      (sum, m) => sum + m.remnant.length,
      0
    );
    const usedLength = remnantMatches.reduce(
      (sum, m) => sum + m.cuts.reduce((s, c) => s + c.length, 0),
      0
    );

    return totalRemnantLength > 0 ? (usedLength / totalRemnantLength) * 100 : 0;
  }

  /**
   * Calculate total savings from remnant usage and waste reduction
   */
  private calculateTotalSavings(
    remnantMatches: RemnantMatch[],
    wasteReduction: number
  ): number {
    const remnantSavings = remnantMatches.reduce(
      (sum, m) => sum + m.savings,
      0
    );

    // Estimate savings from waste reduction (assume average cost per meter)
    const wasteSavings = wasteReduction * 0.01; // Simplified calculation

    return remnantSavings + wasteSavings;
  }
}

// Export singleton instance
export const hybridMassOptimizer = new HybridMassOptimizer();

