/**
 * Remnant-First Genetic Algorithm Optimizer
 * ---------------------------------------------------------------------------
 * Implements a sophisticated "remnant-first strategy" for the one-dimensional
 * cutting stock problem (1DCSP) using a hybrid approach:
 * 
 * 1. First, prioritize remnants using greedy matching
 * 2. Then, optimize remaining cuts with genetic algorithm
 * 
 * Based on research from:
 * - filipwodnicki/custo (GitHub)
 * - jasonrhansen/cut-optimizer-1d (GitHub)
 * - Scientific literature on 1DCSP with genetic algorithms
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';
import { Remnant, RemnantMatch } from './remnantManagement';

export interface RemnantFirstGAConfig {
  /** Population size for genetic algorithm */
  populationSize: number;
  /** Number of generations to evolve */
  generations: number;
  /** Mutation rate (0.0 to 1.0) */
  mutationRate: number;
  /** Crossover rate (0.0 to 1.0) */
  crossoverRate: number;
  /** Number of elite individuals to preserve */
  elitismCount: number;
  /** Tournament size for selection */
  tournamentSize: number;
  /** Minimum remnant utilization percentage to consider */
  minRemnantUtilization: number;
  /** Maximum waste percentage allowed for remnant usage */
  maxRemnantWastePercentage: number;
  /** Whether to prioritize remnants before GA */
  useRemnantFirst: boolean;
}

export interface StockBar {
  id: string;
  type: 'new' | 'remnant';
  length: number;
  cuts: Cut[];
  waste: number;
  utilization: number;
}

export interface Chromosome {
  /** Array of stock bars (genes) - each bar contains assigned cuts */
  stockBars: StockBar[];
  /** Total waste produced by this cutting plan */
  totalWaste: number;
  /** Total number of stock bars used */
  totalBars: number;
  /** Number of different cutting patterns (affects setup time) */
  patternCount: number;
  /** Fitness score (higher is better) */
  fitness: number;
}

export class RemnantFirstGeneticOptimizer {
  private config: RemnantFirstGAConfig;
  private cuts: Cut[];
  private profile: Profile;
  private stockLength: number;
  private availableRemnants: Remnant[];

  constructor(
    cuts: Cut[],
    profile: Profile,
    stockLength: number = 6000,
    availableRemnants: Remnant[] = [],
    config?: Partial<RemnantFirstGAConfig>
  ) {
    this.cuts = [...cuts];
    this.profile = profile;
    this.stockLength = stockLength;
    this.availableRemnants = availableRemnants.filter(
      (r) => r.profile.id === profile.id && r.status === 'available'
    );

    this.config = {
      populationSize: config?.populationSize || 100,
      generations: config?.generations || 50,
      mutationRate: config?.mutationRate || 0.12,
      crossoverRate: config?.crossoverRate || 0.8,
      elitismCount: config?.elitismCount || 5,
      tournamentSize: config?.tournamentSize || 5,
      minRemnantUtilization: config?.minRemnantUtilization || 70,
      maxRemnantWastePercentage: config?.maxRemnantWastePercentage || 30,
      useRemnantFirst: config?.useRemnantFirst !== false,
    };
  }

  /**
   * Main optimization method - implements remnant-first strategy
   */
  optimize(): {
    cuttingPlan: CuttingPlan[];
    remnantMatches: RemnantMatch[];
    metrics: {
      totalWaste: number;
      wasteReduction: number;
      remnantUtilization: number;
      totalSavings: number;
    };
  } {
    // Step 1: Remnant-First Strategy - prioritize remnants
    const { remnantMatches, remainingCuts } = this.prioritizeRemnants();

    // Step 2: Generate initial population for remaining cuts
    let population = this.initializePopulation(remainingCuts);

    // Step 3: Evaluate initial population
    population = this.evaluatePopulation(population);

    // Step 4: Evolve population for specified generations
    for (let generation = 0; generation < this.config.generations; generation++) {
      // Select parents using tournament selection
      const parents = this.selectParents(population);

      // Create offspring through crossover
      const offspring = this.crossover(parents);

      // Mutate offspring
      const mutated = this.mutate(offspring);

      // Evaluate new generation
      const evaluated = this.evaluatePopulation(mutated);

      // Apply elitism - preserve best individuals
      population = this.applyElitism(population, evaluated);

      // Sort by fitness (descending)
      population.sort((a, b) => b.fitness - a.fitness);

      // Early termination if no improvement
      if (generation > 10 && this.hasConverged(population)) {
        break;
      }
    }

    // Step 5: Convert best chromosome to cutting plans
    const bestChromosome = population[0];
    const cuttingPlan = this.chromosomeToCuttingPlans(bestChromosome);

    // Step 6: Calculate metrics
    const metrics = this.calculateMetrics(cuttingPlan, remnantMatches);

    return {
      cuttingPlan,
      remnantMatches,
      metrics,
    };
  }

  /**
   * Step 1: Prioritize Remnants - Greedy approach
   * Sort required pieces by length (descending) and try to fit them into available remnants
   */
  private prioritizeRemnants(): {
    remnantMatches: RemnantMatch[];
    remainingCuts: Cut[];
  } {
    if (!this.config.useRemnantFirst || this.availableRemnants.length === 0) {
      return {
        remnantMatches: [],
        remainingCuts: this.cuts,
      };
    }

    const remnantMatches: RemnantMatch[] = [];
    const remainingCuts: Cut[] = [];
    const usedCutIds = new Set<string>();
    const usedRemnantIds = new Set<string>();

    // Sort cuts by length (descending) for better remnant matching
    const sortedCuts = [...this.cuts].sort((a, b) => b.length - a.length);

    // Sort remnants by length (descending) for better utilization
    const sortedRemnants = [...this.availableRemnants].sort(
      (a, b) => b.length - a.length
    );

    // Try to match each cut to a remnant
    for (const cut of sortedCuts) {
      if (usedCutIds.has(cut.componentId)) continue;

      let bestMatch: RemnantMatch | null = null;
      let bestUtilization = 0;

      for (const remnant of sortedRemnants) {
        if (usedRemnantIds.has(remnant.id)) continue;
        if (remnant.length < cut.length) continue;

        const waste = remnant.length - cut.length;
        const utilization = (cut.length / remnant.length) * 100;
        const wastePercentage = (waste / remnant.length) * 100;

        // Check if this match meets our criteria
        if (
          utilization >= this.config.minRemnantUtilization &&
          wastePercentage <= this.config.maxRemnantWastePercentage
        ) {
          if (utilization > bestUtilization) {
            bestUtilization = utilization;
            bestMatch = {
              remnant,
              cuts: [cut],
              utilization,
              waste,
              savings: cut.length * (this.profile.costPerMeter / 1000), // Simplified savings calculation
            };
          }
        }
      }

      if (bestMatch) {
        remnantMatches.push(bestMatch);
        usedCutIds.add(cut.componentId);
        usedRemnantIds.add(bestMatch.remnant.id);
      } else {
        remainingCuts.push(cut);
      }
    }

    return { remnantMatches, remainingCuts };
  }

  /**
   * Step 2: Initialize Population
   * Generate initial population using "First Fit Decreasing" heuristic
   */
  private initializePopulation(remainingCuts: Cut[]): Chromosome[] {
    const population: Chromosome[] = [];

    // Generate multiple initial solutions
    for (let i = 0; i < this.config.populationSize; i++) {
      // Shuffle cuts for diversity
      const shuffledCuts = this.shuffleArray([...remainingCuts]);

      const stockBars: StockBar[] = [];
      const assignedCutIds = new Set<string>();

      for (const cut of shuffledCuts) {
        if (assignedCutIds.has(cut.componentId)) continue;

        // Try to fit in existing stock bar
        let fitted = false;
        for (const bar of stockBars) {
          const totalUsed = bar.cuts.reduce((sum, c) => sum + c.length, 0);
          if (totalUsed + cut.length <= this.stockLength) {
            bar.cuts.push(cut);
            assignedCutIds.add(cut.componentId);
            fitted = true;
            break;
          }
        }

        // If no fit, create new stock bar
        if (!fitted) {
          stockBars.push({
            id: `bar-${stockBars.length}`,
            type: 'new',
            length: this.stockLength,
            cuts: [cut],
            waste: 0,
            utilization: 0,
          });
          assignedCutIds.add(cut.componentId);
        }
      }

      // Calculate waste and utilization for each bar
      for (const bar of stockBars) {
        const totalUsed = bar.cuts.reduce((sum, c) => sum + c.length, 0);
        bar.waste = bar.length - totalUsed;
        bar.utilization = (totalUsed / bar.length) * 100;
      }

      population.push({
        stockBars,
        totalWaste: 0,
        totalBars: stockBars.length,
        patternCount: stockBars.length,
        fitness: 0,
      });
    }

    return population;
  }

  /**
   * Step 3: Evaluate Population
   * Calculate fitness for each chromosome
   */
  private evaluatePopulation(population: Chromosome[]): Chromosome[] {
    return population.map((chromosome) => {
      // Calculate total waste
      const totalWaste = chromosome.stockBars.reduce(
        (sum, bar) => sum + bar.waste,
        0
      );

      // Count unique cutting patterns (bars with same cut combination)
      const patternSignatures = new Set<string>();
      for (const bar of chromosome.stockBars) {
        const signature = bar.cuts
          .map((c) => c.length)
          .sort((a, b) => a - b)
          .join(',');
        patternSignatures.add(signature);
      }

      chromosome.totalWaste = totalWaste;
      chromosome.totalBars = chromosome.stockBars.length;
      chromosome.patternCount = patternSignatures.size;

      // Fitness function: minimize waste, minimize patterns (setup time)
      // Higher fitness = better solution
      const wasteScore = 10000 / (1 + totalWaste); // Inverse of waste
      const patternScore = 1000 / (1 + patternSignatures.size); // Inverse of patterns
      chromosome.fitness = wasteScore + patternScore;

      return chromosome;
    });
  }

  /**
   * Step 4: Select Parents using Tournament Selection
   */
  private selectParents(population: Chromosome[]): Chromosome[] {
    const parents: Chromosome[] = [];

    while (parents.length < 2) {
      // Tournament selection
      const tournament: Chromosome[] = [];
      for (let i = 0; i < this.config.tournamentSize; i++) {
        const randomIndex = Math.floor(Math.random() * population.length);
        tournament.push(population[randomIndex]);
      }

      // Select best from tournament
      tournament.sort((a, b) => b.fitness - a.fitness);
      parents.push(tournament[0]);
    }

    return parents;
  }

  /**
   * Step 5: Crossover - Combine two parent plans
   */
  private crossover(parents: Chromosome[]): Chromosome[] {
    if (parents.length < 2) return parents;

    const [parent1, parent2] = parents;
    const offspring: Chromosome[] = [];

    if (Math.random() > this.config.crossoverRate) {
      // No crossover, return parents
      return parents;
    }

    // Single-point crossover: swap cutting patterns between parents
    const crossoverPoint = Math.floor(
      Math.random() * Math.min(parent1.stockBars.length, parent2.stockBars.length)
    );

    // Create offspring 1: first part from parent1, second from parent2
    const offspring1Bars = [
      ...parent1.stockBars.slice(0, crossoverPoint),
      ...parent2.stockBars.slice(crossoverPoint),
    ];

    // Create offspring 2: first part from parent2, second from parent1
    const offspring2Bars = [
      ...parent2.stockBars.slice(0, crossoverPoint),
      ...parent1.stockBars.slice(crossoverPoint),
    ];

    // Reconstruct valid chromosomes (ensure all cuts are included)
    offspring.push(this.reconstructChromosome(offspring1Bars));
    offspring.push(this.reconstructChromosome(offspring2Bars));

    return offspring;
  }

  /**
   * Step 6: Mutation - Introduce random changes
   */
  private mutate(offspring: Chromosome[]): Chromosome[] {
    return offspring.map((chromosome) => {
      if (Math.random() > this.config.mutationRate) {
        return chromosome;
      }

      // Mutation strategies
      const mutationType = Math.random();

      if (mutationType < 0.4) {
        // Swap two cuts between different stock bars
        return this.mutateSwapCuts(chromosome);
      } else if (mutationType < 0.8) {
        // Re-pack a high-waste stock bar more efficiently
        return this.mutateRepackBar(chromosome);
      } else {
        // Split a bar or merge two bars
        return this.mutateSplitMerge(chromosome);
      }
    });
  }

  /**
   * Mutation: Swap cuts between bars
   */
  private mutateSwapCuts(chromosome: Chromosome): Chromosome {
    if (chromosome.stockBars.length < 2) return chromosome;

    const bar1Index = Math.floor(Math.random() * chromosome.stockBars.length);
    const bar2Index = Math.floor(Math.random() * chromosome.stockBars.length);

    if (bar1Index === bar2Index) return chromosome;

    const bar1 = chromosome.stockBars[bar1Index];
    const bar2 = chromosome.stockBars[bar2Index];

    if (bar1.cuts.length === 0 || bar2.cuts.length === 0) return chromosome;

    const cut1Index = Math.floor(Math.random() * bar1.cuts.length);
    const cut2Index = Math.floor(Math.random() * bar2.cuts.length);

    const cut1 = bar1.cuts[cut1Index];
    const cut2 = bar2.cuts[cut2Index];

    // Check if swap is feasible
    const bar1Total = bar1.cuts.reduce((sum, c) => sum + c.length, 0) - cut1.length + cut2.length;
    const bar2Total = bar2.cuts.reduce((sum, c) => sum + c.length, 0) - cut2.length + cut1.length;

    if (bar1Total <= this.stockLength && bar2Total <= this.stockLength) {
      // Perform swap
      bar1.cuts[cut1Index] = cut2;
      bar2.cuts[cut2Index] = cut1;

      // Recalculate waste and utilization
      bar1.waste = bar1.length - bar1Total;
      bar1.utilization = (bar1Total / bar1.length) * 100;
      bar2.waste = bar2.length - bar2Total;
      bar2.utilization = (bar2Total / bar2.length) * 100;
    }

    return chromosome;
  }

  /**
   * Mutation: Re-pack a high-waste bar
   */
  private mutateRepackBar(chromosome: Chromosome): Chromosome {
    // Find bar with highest waste
    const sortedBars = [...chromosome.stockBars].sort((a, b) => b.waste - a.waste);
    const highWasteBar = sortedBars[0];

    if (!highWasteBar || highWasteBar.waste < 100) return chromosome; // No significant waste

    // Try to redistribute cuts from this bar to other bars
    const cutsToRedistribute = [...highWasteBar.cuts];
    highWasteBar.cuts = [];

    for (const cut of cutsToRedistribute) {
      let fitted = false;

      // Try existing bars first
      for (const bar of chromosome.stockBars) {
        if (bar === highWasteBar) continue;

        const totalUsed = bar.cuts.reduce((sum, c) => sum + c.length, 0);
        if (totalUsed + cut.length <= this.stockLength) {
          bar.cuts.push(cut);
          fitted = true;
          break;
        }
      }

      // If no fit, put back in original bar
      if (!fitted) {
        highWasteBar.cuts.push(cut);
      }
    }

    // Recalculate waste
    for (const bar of chromosome.stockBars) {
      const totalUsed = bar.cuts.reduce((sum, c) => sum + c.length, 0);
      bar.waste = bar.length - totalUsed;
      bar.utilization = (totalUsed / bar.length) * 100;
    }

    return chromosome;
  }

  /**
   * Mutation: Split or merge bars
   */
  private mutateSplitMerge(chromosome: Chromosome): Chromosome {
    if (chromosome.stockBars.length === 0) return chromosome;

    if (Math.random() < 0.5 && chromosome.stockBars.length > 1) {
      // Merge two bars if possible
      const bar1 = chromosome.stockBars[0];
      const bar2 = chromosome.stockBars[1];

      const totalLength = bar1.cuts.reduce((sum, c) => sum + c.length, 0) +
                         bar2.cuts.reduce((sum, c) => sum + c.length, 0);

      if (totalLength <= this.stockLength) {
        bar1.cuts.push(...bar2.cuts);
        chromosome.stockBars.splice(1, 1);
        bar1.waste = bar1.length - totalLength;
        bar1.utilization = (totalLength / bar1.length) * 100;
      }
    } else {
      // Split a bar
      const barToSplit = chromosome.stockBars[0];
      if (barToSplit.cuts.length > 1) {
        const midPoint = Math.floor(barToSplit.cuts.length / 2);
        const newBar: StockBar = {
          id: `bar-${chromosome.stockBars.length}`,
          type: 'new',
          length: this.stockLength,
          cuts: barToSplit.cuts.slice(midPoint),
          waste: 0,
          utilization: 0,
        };

        barToSplit.cuts = barToSplit.cuts.slice(0, midPoint);

        // Recalculate
        const bar1Total = barToSplit.cuts.reduce((sum, c) => sum + c.length, 0);
        const bar2Total = newBar.cuts.reduce((sum, c) => sum + c.length, 0);

        barToSplit.waste = barToSplit.length - bar1Total;
        barToSplit.utilization = (bar1Total / barToSplit.length) * 100;
        newBar.waste = newBar.length - bar2Total;
        newBar.utilization = (bar2Total / newBar.length) * 100;

        chromosome.stockBars.push(newBar);
      }
    }

    return chromosome;
  }

  /**
   * Apply Elitism - Preserve best individuals
   */
  private applyElitism(
    oldPopulation: Chromosome[],
    newPopulation: Chromosome[]
  ): Chromosome[] {
    const sortedOld = [...oldPopulation].sort((a, b) => b.fitness - a.fitness);
    const sortedNew = [...newPopulation].sort((a, b) => b.fitness - a.fitness);

    // Take elite from old population
    const elite = sortedOld.slice(0, this.config.elitismCount);

    // Take rest from new population
    const rest = sortedNew.slice(0, this.config.populationSize - this.config.elitismCount);

    return [...elite, ...rest];
  }

  /**
   * Check if population has converged
   */
  private hasConverged(population: Chromosome[]): boolean {
    if (population.length < 2) return false;

    const bestFitness = population[0].fitness;
    const avgFitness =
      population.reduce((sum, c) => sum + c.fitness, 0) / population.length;

    // Converged if best is close to average (less than 1% difference)
    return Math.abs(bestFitness - avgFitness) / bestFitness < 0.01;
  }

  /**
   * Reconstruct chromosome ensuring all cuts are included
   */
  private reconstructChromosome(bars: StockBar[]): Chromosome {
    // Collect all cuts
    const allCuts = bars.flatMap((bar) => bar.cuts);
    const cutIds = new Set(allCuts.map((c) => c.componentId));

    // Find missing cuts
    const missingCuts = this.cuts.filter((c) => !cutIds.has(c.componentId));

    // Add missing cuts to bars
    for (const cut of missingCuts) {
      let fitted = false;
      for (const bar of bars) {
        const totalUsed = bar.cuts.reduce((sum, c) => sum + c.length, 0);
        if (totalUsed + cut.length <= this.stockLength) {
          bar.cuts.push(cut);
          fitted = true;
          break;
        }
      }

      if (!fitted) {
        bars.push({
          id: `bar-${bars.length}`,
          type: 'new',
          length: this.stockLength,
          cuts: [cut],
          waste: this.stockLength - cut.length,
          utilization: (cut.length / this.stockLength) * 100,
        });
      }
    }

    // Recalculate waste for all bars
    for (const bar of bars) {
      const totalUsed = bar.cuts.reduce((sum, c) => sum + c.length, 0);
      bar.waste = bar.length - totalUsed;
      bar.utilization = (totalUsed / bar.length) * 100;
    }

    return {
      stockBars: bars,
      totalWaste: 0,
      totalBars: bars.length,
      patternCount: bars.length,
      fitness: 0,
    };
  }

  /**
   * Convert chromosome to cutting plans
   */
  private chromosomeToCuttingPlans(chromosome: Chromosome): CuttingPlan[] {
    return chromosome.stockBars.map((bar) => ({
      profile: this.profile,
      stockLength: bar.length,
      cuts: bar.cuts,
      totalWaste: bar.waste,
      utilization: bar.utilization,
      isRemnant: bar.type === 'remnant',
    }));
  }

  /**
   * Calculate optimization metrics
   */
  private calculateMetrics(
    cuttingPlan: CuttingPlan[],
    remnantMatches: RemnantMatch[]
  ): {
    totalWaste: number;
    wasteReduction: number;
    remnantUtilization: number;
    totalSavings: number;
  } {
    const planWaste = cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const remnantWaste = remnantMatches.reduce((sum, m) => sum + m.waste, 0);
    const totalWaste = planWaste + remnantWaste;

    // Calculate baseline waste (if all cuts used new stock)
    const baselineWaste = this.cuts.reduce((sum, cut) => {
      const barsNeeded = Math.ceil(cut.length / this.stockLength);
      const wastePerBar = this.stockLength - (cut.length % this.stockLength || this.stockLength);
      return sum + (barsNeeded - 1) * this.stockLength + wastePerBar;
    }, 0);

    const wasteReduction = baselineWaste - totalWaste;

    const remnantUtilization =
      remnantMatches.length > 0
        ? remnantMatches.reduce((sum, m) => sum + m.utilization, 0) / remnantMatches.length
        : 0;

    const totalSavings =
      remnantMatches.reduce((sum, m) => sum + m.savings, 0) +
      wasteReduction * (this.profile.costPerMeter / 1000);

    return {
      totalWaste,
      wasteReduction,
      remnantUtilization,
      totalSavings,
    };
  }

  /**
   * Utility: Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}


















































