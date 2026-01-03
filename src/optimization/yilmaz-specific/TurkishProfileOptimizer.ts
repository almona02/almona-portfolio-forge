/**
 * Turkish Profile Optimizer
 * Region-specific material patterns and optimization
 * Optimizes cutting plans for Turkish market profiles and patterns
 */

import type { TurkishProfile } from '@/localization/turkish/TurkishProfileDatabase';
import { Cut, CuttingPlan } from '@/types/fabricator';

export interface TurkishOptimizationOptions {
  prioritizeLocalSuppliers: boolean;
  considerLeadTimes: boolean;
  optimizeForTurkishStandards: boolean;
  minimizeSetupChanges: boolean;
  groupBySupplier: boolean;
}

export interface TurkishOptimizationResult {
  optimizedPlans: CuttingPlan[];
  supplierGroups: Map<string, CuttingPlan[]>;
  totalCost: number;
  totalWaste: number;
  efficiency: number;
  recommendations: string[];
  leadTimeImpact: number; // days
}

export class TurkishProfileOptimizer {
  private turkishProfiles: Map<string, TurkishProfile> = new Map();
  private standardLengths: number[] = [3000, 4000, 5000, 6000, 7000]; // Common Turkish stock lengths

  /**
   * Initialize with Turkish profiles
   */
  initializeProfiles(profiles: TurkishProfile[]): void {
    profiles.forEach(profile => {
      this.turkishProfiles.set(profile.id, profile);
    });
  }

  /**
   * Optimize cutting plan for Turkish market
   */
  optimize(
    cuttingPlans: CuttingPlan[],
    options: TurkishOptimizationOptions = {
      prioritizeLocalSuppliers: true,
      considerLeadTimes: true,
      optimizeForTurkishStandards: true,
      minimizeSetupChanges: true,
      groupBySupplier: true
    }
  ): TurkishOptimizationResult {
    // Group by supplier if requested
    const supplierGroups = options.groupBySupplier
      ? this.groupBySupplier(cuttingPlans)
      : new Map<string, CuttingPlan[]>([['default', cuttingPlans]]);

    // Optimize each group
    const optimizedPlans: CuttingPlan[] = [];
    let totalCost = 0;
    let totalWaste = 0;
    const recommendations: string[] = [];

    supplierGroups.forEach((plans, _supplierId) => {
      const optimized = this.optimizeGroup(plans, options);
      optimizedPlans.push(...optimized.plans);
      totalCost += optimized.cost;
      totalWaste += optimized.waste;
      recommendations.push(...optimized.recommendations);
    });

    // Calculate efficiency
    const efficiency = this.calculateEfficiency(optimizedPlans, totalWaste);

    // Calculate lead time impact
    const leadTimeImpact = options.considerLeadTimes
      ? this.calculateLeadTimeImpact(optimizedPlans)
      : 0;

    return {
      optimizedPlans,
      supplierGroups,
      totalCost,
      totalWaste,
      efficiency,
      recommendations,
      leadTimeImpact
    };
  }

  /**
   * Optimize a group of cutting plans
   */
  private optimizeGroup(
    plans: CuttingPlan[],
    options: TurkishOptimizationOptions
  ): { plans: CuttingPlan[]; cost: number; waste: number; recommendations: string[] } {
    const optimized: CuttingPlan[] = [];
    let totalCost = 0;
    let totalWaste = 0;
    const recommendations: string[] = [];

    // Group by profile to minimize setup changes
    const profileGroups = this.groupByProfile(plans);

    profileGroups.forEach((groupPlans, profileId) => {
      const profile = groupPlans[0].profile;
      const turkishProfile = this.turkishProfiles.get(profileId);

      // Use Turkish standard lengths if available
      const stockLength = options.optimizeForTurkishStandards && turkishProfile
        ? this.selectOptimalStockLength(groupPlans, turkishProfile)
        : groupPlans[0].stockLength;

      // Optimize cuts for Turkish patterns
      groupPlans.forEach(plan => {
        const optimizedPlan = this.optimizePlan(plan, stockLength, options);
        optimized.push(optimizedPlan);

        totalCost += this.calculatePlanCost(optimizedPlan);
        totalWaste += optimizedPlan.totalWaste;
      });

      // Recommendations for this profile
      if (turkishProfile) {
        if (turkishProfile.leadTime && turkishProfile.leadTime > 7) {
          recommendations.push(
            `Profile ${profile.name} has ${turkishProfile.leadTime} day lead time - consider ordering in advance`
          );
        }

        if (turkishProfile.moq && this.getTotalQuantity(groupPlans) < turkishProfile.moq) {
          recommendations.push(
            `Order quantity for ${profile.name} is below MOQ (${turkishProfile.moq}) - consider increasing order`
          );
        }
      }
    });

    return { plans: optimized, cost: totalCost, waste: totalWaste, recommendations };
  }

  /**
   * Optimize individual cutting plan
   */
  private optimizePlan(
    plan: CuttingPlan,
    stockLength: number,
    _options: TurkishOptimizationOptions
  ): CuttingPlan {
    // Sort cuts by length (descending) for better nesting
    const sortedCuts = [...plan.cuts].sort((a, b) => b.length - a.length);

    // Group cuts that fit together on stock
    const optimizedCuts: Cut[] = [];
    let currentStock = stockLength;
    let currentWaste = 0;

    sortedCuts.forEach(cut => {
      if (cut.length <= currentStock) {
        optimizedCuts.push(cut);
        currentStock -= cut.length;
      } else {
        // Start new stock
        currentWaste += currentStock;
        currentStock = stockLength - cut.length;
        optimizedCuts.push(cut);
      }
    });

    // Add remaining waste
    currentWaste += currentStock;

    // Calculate utilization
    const totalCutLength = optimizedCuts.reduce((sum, cut) => sum + cut.length, 0);
    const utilization = (totalCutLength / (totalCutLength + currentWaste)) * 100;

    return {
      ...plan,
      stockLength,
      cuts: optimizedCuts,
      totalWaste: currentWaste,
      utilization
    };
  }

  /**
   * Select optimal stock length for Turkish market
   */
  private selectOptimalStockLength(
    plans: CuttingPlan[],
    _turkishProfile: TurkishProfile
  ): number {
    // Get all cut lengths
    const allCutLengths = plans.flatMap(plan => plan.cuts.map(cut => cut.length));
    const maxCut = Math.max(...allCutLengths);
    const _totalLength = allCutLengths.reduce((sum, len) => sum + len, 0);

    // Find best standard length
    let bestLength = this.standardLengths[0];
    let bestWaste = Infinity;

    this.standardLengths.forEach(length => {
      if (length < maxCut) {
        return; // Skip if too short
      }

      // Estimate waste with this stock length
      const estimatedWaste = this.estimateWaste(allCutLengths, length);

      if (estimatedWaste < bestWaste) {
        bestWaste = estimatedWaste;
        bestLength = length;
      }
    });

    return bestLength;
  }

  /**
   * Estimate waste for given cuts and stock length
   */
  private estimateWaste(cutLengths: number[], stockLength: number): number {
    const sorted = [...cutLengths].sort((a, b) => b - a);
    let waste = 0;
    let currentStock = stockLength;

    sorted.forEach(length => {
      if (length <= currentStock) {
        currentStock -= length;
      } else {
        waste += currentStock;
        currentStock = stockLength - length;
      }
    });

    waste += currentStock;
    return waste;
  }

  /**
   * Group plans by supplier
   */
  private groupBySupplier(plans: CuttingPlan[]): Map<string, CuttingPlan[]> {
    const groups = new Map<string, CuttingPlan[]>();

    plans.forEach(plan => {
      const turkishProfile = this.turkishProfiles.get(plan.profile.id);
      const supplierId = turkishProfile?.supplierId || 'unknown';

      if (!groups.has(supplierId)) {
        groups.set(supplierId, []);
      }
      groups.get(supplierId)!.push(plan);
    });

    return groups;
  }

  /**
   * Group plans by profile
   */
  private groupByProfile(plans: CuttingPlan[]): Map<string, CuttingPlan[]> {
    const groups = new Map<string, CuttingPlan[]>();

    plans.forEach(plan => {
      const profileId = plan.profile.id;
      if (!groups.has(profileId)) {
        groups.set(profileId, []);
      }
      groups.get(profileId)!.push(plan);
    });

    return groups;
  }

  /**
   * Calculate plan cost
   */
  private calculatePlanCost(plan: CuttingPlan): number {
    const totalLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    return (totalLength / 1000) * plan.profile.costPerMeter;
  }

  /**
   * Calculate efficiency
   */
  private calculateEfficiency(plans: CuttingPlan[], totalWaste: number): number {
    if (plans.length === 0) {
      return 0;
    }

    const totalMaterial = plans.reduce((sum, plan) => {
      return sum + plan.cuts.reduce((cutSum, cut) => cutSum + cut.length, 0);
    }, 0);

    const totalUsed = totalMaterial + totalWaste;
    return totalUsed > 0 ? (totalMaterial / totalUsed) * 100 : 0;
  }

  /**
   * Calculate lead time impact
   */
  private calculateLeadTimeImpact(plans: CuttingPlan[]): number {
    let maxLeadTime = 0;

    plans.forEach(plan => {
      const turkishProfile = this.turkishProfiles.get(plan.profile.id);
      if (turkishProfile?.leadTime) {
        maxLeadTime = Math.max(maxLeadTime, turkishProfile.leadTime);
      }
    });

    return maxLeadTime;
  }

  /**
   * Get total quantity for plans
   */
  private getTotalQuantity(plans: CuttingPlan[]): number {
    return plans.reduce((sum, plan) => {
      return sum + plan.cuts.reduce((cutSum, _cut) => cutSum + 1, 0);
    }, 0);
  }

  /**
   * Get Turkish profile
   */
  getTurkishProfile(profileId: string): TurkishProfile | undefined {
    return this.turkishProfiles.get(profileId);
  }

  /**
   * Add Turkish profile
   */
  addTurkishProfile(profile: TurkishProfile): void {
    this.turkishProfiles.set(profile.id, profile);
  }
}

