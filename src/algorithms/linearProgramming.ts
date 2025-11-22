/**
 * Linear Programming Optimization
 * Uses mathematical optimization for cost and waste minimization
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export interface LPConfig {
  objective: 'minimize_waste' | 'minimize_cost' | 'minimize_time' | 'multi_objective';
  weights?: {
    waste?: number;
    cost?: number;
    time?: number;
  };
}

export interface LPVariable {
  name: string;
  value: number;
  coefficient: number;
}

export class LinearProgrammingOptimizer {
  private config: LPConfig;
  private stockLength: number;
  private cuts: Cut[];
  private profile: Profile;

  constructor(
    cuts: Cut[],
    profile: Profile,
    stockLength: number = 6000,
    config?: LPConfig
  ) {
    this.cuts = cuts;
    this.profile = profile;
    this.stockLength = stockLength;
    this.config = config || { objective: 'minimize_waste' };
  }

  /**
   * Optimize using linear programming approach
   * Uses simplified LP formulation for bin packing
   */
  optimize(): CuttingPlan[] {
    // Group cuts by length for pattern generation
    const cutGroups = this.groupCutsByLength();
    
    // Generate cutting patterns
    const patterns = this.generateCuttingPatterns(cutGroups);
    
    // Solve LP problem (simplified greedy approach)
    const selectedPatterns = this.solveLP(patterns);
    
    // Convert patterns to cutting plans
    return this.patternsToCuttingPlans(selectedPatterns);
  }

  /**
   * Group cuts by similar length
   */
  private groupCutsByLength(): Map<number, Cut[]> {
    const groups = new Map<number, Cut[]>();
    
    for (const cut of this.cuts) {
      const roundedLength = Math.round(cut.length / 10) * 10; // Round to 10mm
      if (!groups.has(roundedLength)) {
        groups.set(roundedLength, []);
      }
      groups.get(roundedLength)!.push(cut);
    }
    
    return groups;
  }

  /**
   * Generate cutting patterns (combinations of cuts that fit in stock)
   */
  private generateCuttingPatterns(cutGroups: Map<number, Cut[]>): Array<{
    cuts: Cut[];
    waste: number;
    utilization: number;
    cost: number;
  }> {
    const patterns: Array<{
      cuts: Cut[];
      waste: number;
      utilization: number;
      cost: number;
    }> = [];
    
    const lengths = Array.from(cutGroups.keys()).sort((a, b) => b - a);
    
    // Generate patterns using greedy approach
    for (let i = 0; i < lengths.length; i++) {
      const length1 = lengths[i];
      const cuts1 = cutGroups.get(length1)!;
      
      // Single cut pattern
      for (const cut of cuts1) {
        const waste = this.stockLength - cut.length;
        patterns.push({
          cuts: [cut],
          waste,
          utilization: (cut.length / this.stockLength) * 100,
          cost: this.calculatePatternCost([cut], waste),
        });
      }
      
      // Two cut patterns
      for (let j = i; j < lengths.length; j++) {
        const length2 = lengths[j];
        const cuts2 = cutGroups.get(length2)!;
        
        for (const cut1 of cuts1) {
          for (const cut2 of cuts2) {
            if (cut1.id === cut2.id) continue;
            
            const totalLength = cut1.length + cut2.length;
            if (totalLength <= this.stockLength) {
              const waste = this.stockLength - totalLength;
              patterns.push({
                cuts: [cut1, cut2],
                waste,
                utilization: (totalLength / this.stockLength) * 100,
                cost: this.calculatePatternCost([cut1, cut2], waste),
              });
            }
          }
        }
      }
      
      // Three cut patterns (limited to avoid explosion)
      if (i < 5) { // Limit to first 5 lengths
        for (let j = i; j < Math.min(i + 3, lengths.length); j++) {
          const length2 = lengths[j];
          const cuts2 = cutGroups.get(length2)!;
          
          for (let k = j; k < Math.min(j + 3, lengths.length); k++) {
            const length3 = lengths[k];
            const cuts3 = cutGroups.get(length3)!;
            
            for (const cut1 of cuts1.slice(0, 3)) {
              for (const cut2 of cuts2.slice(0, 3)) {
                for (const cut3 of cuts3.slice(0, 3)) {
                  if (cut1.id === cut2.id || cut1.id === cut3.id || cut2.id === cut3.id) continue;
                  
                  const totalLength = cut1.length + cut2.length + cut3.length;
                  if (totalLength <= this.stockLength) {
                    const waste = this.stockLength - totalLength;
                    patterns.push({
                      cuts: [cut1, cut2, cut3],
                      waste,
                      utilization: (totalLength / this.stockLength) * 100,
                      cost: this.calculatePatternCost([cut1, cut2, cut3], waste),
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return patterns;
  }

  /**
   * Calculate pattern cost based on objective
   */
  private calculatePatternCost(cuts: Cut[], waste: number): number {
    const weights = this.config.weights || {};
    
    let cost = 0;
    
    if (this.config.objective === 'minimize_waste' || this.config.objective === 'multi_objective') {
      cost += waste * (weights.waste || 1);
    }
    
    if (this.config.objective === 'minimize_cost' || this.config.objective === 'multi_objective') {
      const materialCost = cuts.reduce((sum, cut) => {
        return sum + (cut.length / 1000) * this.profile.costPerMeter;
      }, 0);
      cost += materialCost * (weights.cost || 1);
    }
    
    if (this.config.objective === 'minimize_time' || this.config.objective === 'multi_objective') {
      const cuttingTime = cuts.length * 0.1; // 0.1 min per cut
      cost += cuttingTime * (weights.time || 1);
    }
    
    return cost;
  }

  /**
   * Solve LP problem (simplified greedy selection)
   */
  private solveLP(patterns: Array<{
    cuts: Cut[];
    waste: number;
    utilization: number;
    cost: number;
  }>): Array<{
    cuts: Cut[];
    waste: number;
    utilization: number;
    cost: number;
  }> {
    // Sort patterns by objective
    const sortedPatterns = [...patterns].sort((a, b) => {
      switch (this.config.objective) {
        case 'minimize_waste':
          return a.waste - b.waste;
        case 'minimize_cost':
          return a.cost - b.cost;
        case 'minimize_time':
          return a.cuts.length - b.cuts.length;
        case 'multi_objective':
        default:
          return a.cost - b.cost;
      }
    });
    
    // Greedy selection: select patterns that cover all cuts
    const selectedPatterns: typeof patterns = [];
    const usedCuts = new Set<string>();
    const cutCounts = new Map<string, number>();
    
    // Count required cuts
    for (const cut of this.cuts) {
      cutCounts.set(cut.componentId, (cutCounts.get(cut.componentId) || 0) + 1);
    }
    
    // Select patterns
    for (const pattern of sortedPatterns) {
      // Check if pattern uses any needed cuts
      let hasNeededCuts = false;
      for (const cut of pattern.cuts) {
        const needed = cutCounts.get(cut.componentId) || 0;
        const used = Array.from(usedCuts).filter(id => id === cut.componentId).length;
        if (needed > used) {
          hasNeededCuts = true;
          break;
        }
      }
      
      if (hasNeededCuts) {
        selectedPatterns.push(pattern);
        for (const cut of pattern.cuts) {
          usedCuts.add(cut.componentId);
        }
      }
    }
    
    return selectedPatterns;
  }

  /**
   * Convert patterns to cutting plans
   */
  private patternsToCuttingPlans(patterns: Array<{
    cuts: Cut[];
    waste: number;
    utilization: number;
    cost: number;
  }>): CuttingPlan[] {
    return patterns.map(pattern => ({
      profile: this.profile,
      stockLength: this.stockLength,
      cuts: pattern.cuts,
      totalWaste: pattern.waste,
      utilization: Number(pattern.utilization.toFixed(2)),
    }));
  }
}

