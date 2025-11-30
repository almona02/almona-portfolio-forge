/**
 * Greedy Heuristic Optimizer
 * Fast, non-optimal solution for simple jobs (<50 cuts, <2s target)
 * Uses longest-first greedy algorithm for quick results
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export interface GreedyConfig {
  /** Sort strategy for cuts */
  sortStrategy?: 'longest_first' | 'shortest_first' | 'mixed';
}

export class GreedyHeuristic {
  private config: GreedyConfig;
  private stockLength: number;
  private cuts: Cut[];
  private profile: Profile;

  constructor(
    cuts: Cut[],
    profile: Profile,
    stockLength: number = 6000,
    config?: GreedyConfig
  ) {
    this.cuts = [...cuts]; // Create a copy to avoid mutating original
    this.profile = profile;
    this.stockLength = stockLength;
    this.config = config || { sortStrategy: 'longest_first' };
  }

  /**
   * Optimize using greedy heuristic approach
   * Fast algorithm that sorts cuts and packs them greedily
   */
  optimize(): CuttingPlan[] {
    // Sort cuts based on strategy
    const sortedCuts = this.sortCuts();

    const plans: CuttingPlan[] = [];
    const used = new Set<number>();
    let currentPlan: Cut[] = [];
    let currentLength = 0;

    // Greedy packing: try to fit largest cuts first
    for (let i = 0; i < sortedCuts.length; i++) {
      if (used.has(i)) continue;

      const cut = sortedCuts[i];
      const cutLength = cut.length;

      // If cut fits in current stock, add it
      if (currentLength + cutLength <= this.stockLength) {
        currentPlan.push(cut);
        currentLength += cutLength;
        used.add(i);
      } else {
        // Current stock is full, start a new one
        if (currentPlan.length > 0) {
          const totalWaste = this.stockLength - currentLength;
          const utilization = (currentLength / this.stockLength) * 100;

          plans.push({
            profile: this.profile,
            stockLength: this.stockLength,
            cuts: [...currentPlan],
            totalWaste,
            utilization,
          });
        }

        // Start new plan with current cut
        currentPlan = [cut];
        currentLength = cutLength;
        used.add(i);
      }
    }

    // Add the last plan if it has cuts
    if (currentPlan.length > 0) {
      const totalWaste = this.stockLength - currentLength;
      const utilization = (currentLength / this.stockLength) * 100;

      plans.push({
        profile: this.profile,
        stockLength: this.stockLength,
        cuts: currentPlan,
        totalWaste,
        utilization,
      });
    }

    // Try to improve by filling remaining space with smaller unused cuts
    return this.improveWithRemainingCuts(plans, sortedCuts, used);
  }

  /**
   * Sort cuts based on configured strategy
   */
  private sortCuts(): Cut[] {
    const sorted = [...this.cuts];

    switch (this.config.sortStrategy) {
      case 'longest_first':
        sorted.sort((a, b) => b.length - a.length);
        break;
      case 'shortest_first':
        sorted.sort((a, b) => a.length - b.length);
        break;
      case 'mixed':
        // Alternate between long and short for better packing
        sorted.sort((a, b) => b.length - a.length);
        const mixed: Cut[] = [];
        let left = 0;
        let right = sorted.length - 1;
        while (left <= right) {
          if (left === right) {
            mixed.push(sorted[left]);
            break;
          }
          mixed.push(sorted[left]);
          mixed.push(sorted[right]);
          left++;
          right--;
        }
        return mixed;
      default:
        sorted.sort((a, b) => b.length - a.length);
    }

    return sorted;
  }

  /**
   * Try to improve plans by filling remaining space with unused cuts
   */
  private improveWithRemainingCuts(
    plans: CuttingPlan[],
    sortedCuts: Cut[],
    used: Set<number>
  ): CuttingPlan[] {
    const unusedIndices = sortedCuts
      .map((_, idx) => idx)
      .filter(idx => !used.has(idx))
      .sort((a, b) => sortedCuts[b].length - sortedCuts[a].length); // Largest first

    // Try to fit unused cuts into existing plans
    for (const idx of unusedIndices) {
      const cut = sortedCuts[idx];
      let fitted = false;

      for (const plan of plans) {
        const currentLength = plan.cuts.reduce((sum, c) => sum + c.length, 0);
        const remainingSpace = this.stockLength - currentLength;

        if (cut.length <= remainingSpace) {
          plan.cuts.push(cut);
          plan.totalWaste = this.stockLength - (currentLength + cut.length);
          plan.utilization = ((currentLength + cut.length) / this.stockLength) * 100;
          used.add(idx);
          fitted = true;
          break;
        }
      }

      // If didn't fit, create a new plan
      if (!fitted) {
        const totalWaste = this.stockLength - cut.length;
        const utilization = (cut.length / this.stockLength) * 100;

        plans.push({
          profile: this.profile,
          stockLength: this.stockLength,
          cuts: [cut],
          totalWaste,
          utilization,
        });
        used.add(idx);
      }
    }

    return plans;
  }
}

