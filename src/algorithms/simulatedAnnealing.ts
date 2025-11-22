/**
 * Simulated Annealing for Global Optimization
 * Finds globally optimal cutting patterns using simulated annealing
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export interface AnnealingConfig {
  initialTemperature: number;
  coolingRate: number;
  minTemperature: number;
  iterationsPerTemp: number;
}

export interface Solution {
  cuttingPlan: CuttingPlan[];
  cost: number;
  waste: number;
  utilization: number;
}

export class SimulatedAnnealingOptimizer {
  private config: AnnealingConfig;
  private stockLength: number;
  private cuts: Cut[];
  private profile: Profile;

  constructor(
    cuts: Cut[],
    profile: Profile,
    stockLength: number = 6000,
    config?: Partial<AnnealingConfig>
  ) {
    this.cuts = cuts;
    this.profile = profile;
    this.stockLength = stockLength;
    this.config = {
      initialTemperature: config?.initialTemperature || 1000,
      coolingRate: config?.coolingRate || 0.95,
      minTemperature: config?.minTemperature || 0.1,
      iterationsPerTemp: config?.iterationsPerTemp || 100,
    };
  }

  /**
   * Run simulated annealing optimization
   */
  optimize(): CuttingPlan[] {
    // Initialize random solution
    let currentSolution = this.generateRandomSolution();
    let bestSolution = { ...currentSolution };
    
    let temperature = this.config.initialTemperature;
    
    while (temperature > this.config.minTemperature) {
      for (let i = 0; i < this.config.iterationsPerTemp; i++) {
        // Generate neighbor solution
        const neighbor = this.generateNeighbor(currentSolution);
        
        // Calculate cost difference
        const delta = neighbor.cost - currentSolution.cost;
        
        // Accept if better, or with probability if worse
        if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
          currentSolution = neighbor;
          
          // Update best if better
          if (currentSolution.cost < bestSolution.cost) {
            bestSolution = { ...currentSolution };
          }
        }
      }
      
      // Cool down
      temperature *= this.config.coolingRate;
    }
    
    return bestSolution.cuttingPlan;
  }

  /**
   * Generate random initial solution
   */
  private generateRandomSolution(): Solution {
    const shuffledCuts = [...this.cuts];
    this.shuffle(shuffledCuts);
    
    const cuttingPlan = this.packCuts(shuffledCuts);
    const cost = this.calculateCost(cuttingPlan);
    const waste = cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const utilization = cuttingPlan.reduce((sum, plan) => sum + plan.utilization, 0) / cuttingPlan.length;
    
    return {
      cuttingPlan,
      cost,
      waste,
      utilization,
    };
  }

  /**
   * Generate neighbor solution by swapping/inserting cuts
   */
  private generateNeighbor(current: Solution): Solution {
    // Create new cutting plan by modifying current
    const cuts = current.cuttingPlan.flatMap(plan => plan.cuts);
    
    // Randomly swap two cuts
    if (Math.random() < 0.5 && cuts.length > 1) {
      const i = Math.floor(Math.random() * cuts.length);
      const j = Math.floor(Math.random() * cuts.length);
      [cuts[i], cuts[j]] = [cuts[j], cuts[i]];
    } else {
      // Randomly reorder a section
      const start = Math.floor(Math.random() * cuts.length);
      const end = Math.floor(Math.random() * (cuts.length - start)) + start;
      const section = cuts.splice(start, end - start + 1);
      this.shuffle(section);
      cuts.splice(start, 0, ...section);
    }
    
    const cuttingPlan = this.packCuts(cuts);
    const cost = this.calculateCost(cuttingPlan);
    const waste = cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const utilization = cuttingPlan.reduce((sum, plan) => sum + plan.utilization, 0) / cuttingPlan.length;
    
    return {
      cuttingPlan,
      cost,
      waste,
      utilization,
    };
  }

  /**
   * Pack cuts into cutting plans (First Fit Decreasing)
   */
  private packCuts(cuts: Cut[]): CuttingPlan[] {
    const plans: CuttingPlan[] = [];
    const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);
    
    for (const cut of sortedCuts) {
      // Try to fit in existing plan
      let fitted = false;
      for (const plan of plans) {
        const currentLength = plan.cuts.reduce((sum, c) => sum + c.length, 0);
        if (currentLength + cut.length <= this.stockLength) {
          plan.cuts.push(cut);
          fitted = true;
          break;
        }
      }
      
      // Create new plan if doesn't fit
      if (!fitted) {
        plans.push(this.createCuttingPlan([cut]));
      }
    }
    
    // Recalculate waste and utilization
    return plans.map(plan => {
      const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
      const waste = this.stockLength - totalCutLength;
      const utilization = (totalCutLength / this.stockLength) * 100;
      
      return {
        ...plan,
        totalWaste: waste,
        utilization: Number(utilization.toFixed(2)),
      };
    });
  }

  /**
   * Create cutting plan from cuts
   */
  private createCuttingPlan(cuts: Cut[]): CuttingPlan {
    const totalCutLength = cuts.reduce((sum, cut) => sum + cut.length, 0);
    const waste = this.stockLength - totalCutLength;
    const utilization = (totalCutLength / this.stockLength) * 100;
    
    return {
      profile: this.profile,
      stockLength: this.stockLength,
      cuts,
      totalWaste: waste,
      utilization: Number(utilization.toFixed(2)),
    };
  }

  /**
   * Calculate cost (lower is better)
   * Cost = waste + penalty for number of plans
   */
  private calculateCost(cuttingPlan: CuttingPlan[]): number {
    if (cuttingPlan.length === 0) return Infinity;
    
    const totalWaste = cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const numPlans = cuttingPlan.length;
    
    // Cost = waste + penalty for using more stock pieces
    return totalWaste + (numPlans * 100);
  }

  /**
   * Shuffle array
   */
  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

