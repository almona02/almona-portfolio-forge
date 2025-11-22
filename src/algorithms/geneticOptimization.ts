/**
 * Genetic Algorithm for Material Nesting Optimization
 * Uses evolutionary algorithms to find optimal cutting patterns
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
}

export interface Chromosome {
  genes: number[]; // Order of cuts
  fitness: number;
  cuttingPlan: CuttingPlan[];
  waste: number;
  utilization: number;
}

export class GeneticOptimizer {
  private config: GeneticConfig;
  private stockLength: number;
  private cuts: Cut[];
  private profile: Profile;

  constructor(
    cuts: Cut[],
    profile: Profile,
    stockLength: number = 6000,
    config?: Partial<GeneticConfig>
  ) {
    this.cuts = cuts;
    this.profile = profile;
    this.stockLength = stockLength;
    this.config = {
      populationSize: config?.populationSize || 100,
      generations: config?.generations || 50,
      mutationRate: config?.mutationRate || 0.1,
      crossoverRate: config?.crossoverRate || 0.8,
      elitismCount: config?.elitismCount || 5,
      tournamentSize: config?.tournamentSize || 5,
    };
  }

  /**
   * Run genetic algorithm optimization
   */
  optimize(): CuttingPlan[] {
    // Initialize population
    let population = this.initializePopulation();
    
    // Evaluate initial population
    population = this.evaluatePopulation(population);
    
    // Evolve for specified generations
    for (let generation = 0; generation < this.config.generations; generation++) {
      // Select parents
      const parents = this.selectParents(population);
      
      // Create offspring through crossover
      const offspring = this.crossover(parents);
      
      // Mutate offspring
      const mutated = this.mutate(offspring);
      
      // Evaluate new generation
      const evaluated = this.evaluatePopulation(mutated);
      
      // Apply elitism
      population = this.applyElitism(population, evaluated);
      
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);
    }
    
    // Return best solution
    return population[0].cuttingPlan;
  }

  /**
   * Initialize random population
   */
  private initializePopulation(): Chromosome[] {
    const population: Chromosome[] = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      // Create random permutation of cuts
      const genes = Array.from({ length: this.cuts.length }, (_, i) => i);
      this.shuffle(genes);
      
      population.push({
        genes,
        fitness: 0,
        cuttingPlan: [],
        waste: 0,
        utilization: 0,
      });
    }
    
    return population;
  }

  /**
   * Evaluate fitness of all chromosomes
   */
  private evaluatePopulation(population: Chromosome[]): Chromosome[] {
    return population.map(chromosome => {
      const cuttingPlan = this.decodeChromosome(chromosome.genes);
      const fitness = this.calculateFitness(cuttingPlan);
      
      const totalWaste = cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
      const avgUtilization = cuttingPlan.reduce((sum, plan) => sum + plan.utilization, 0) / cuttingPlan.length;
      
      return {
        ...chromosome,
        cuttingPlan,
        fitness,
        waste: totalWaste,
        utilization: avgUtilization,
      };
    });
  }

  /**
   * Decode chromosome to cutting plan
   */
  private decodeChromosome(genes: number[]): CuttingPlan[] {
    const plans: CuttingPlan[] = [];
    const used = new Set<number>();
    let currentPlan: Cut[] = [];
    let currentLength = 0;
    
    for (const gene of genes) {
      if (used.has(gene)) continue;
      
      const cut = this.cuts[gene];
      const cutLength = cut.length;
      
      if (currentLength + cutLength <= this.stockLength) {
        currentPlan.push(cut);
        currentLength += cutLength;
        used.add(gene);
      } else {
        // Start new plan
        if (currentPlan.length > 0) {
          plans.push(this.createCuttingPlan(currentPlan));
        }
        currentPlan = [cut];
        currentLength = cutLength;
        used.add(gene);
      }
    }
    
    // Add remaining plan
    if (currentPlan.length > 0) {
      plans.push(this.createCuttingPlan(currentPlan));
    }
    
    return plans;
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
   * Calculate fitness score (higher is better)
   */
  private calculateFitness(cuttingPlan: CuttingPlan[]): number {
    if (cuttingPlan.length === 0) return 0;
    
    const totalWaste = cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
    const avgUtilization = cuttingPlan.reduce((sum, plan) => sum + plan.utilization, 0) / cuttingPlan.length;
    const numPlans = cuttingPlan.length;
    
    // Fitness = high utilization - penalty for waste - penalty for number of plans
    const fitness = (avgUtilization * 100) - (totalWaste * 0.1) - (numPlans * 10);
    
    return Math.max(0, fitness);
  }

  /**
   * Select parents using tournament selection
   */
  private selectParents(population: Chromosome[]): Chromosome[] {
    const parents: Chromosome[] = [];
    
    while (parents.length < this.config.populationSize) {
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
   * Crossover two parents to create offspring
   */
  private crossover(parents: Chromosome[]): Chromosome[] {
    const offspring: Chromosome[] = [];
    
    for (let i = 0; i < parents.length; i += 2) {
      if (i + 1 >= parents.length) {
        offspring.push(parents[i]);
        break;
      }
      
      const parent1 = parents[i];
      const parent2 = parents[i + 1];
      
      if (Math.random() < this.config.crossoverRate) {
        // Order crossover (OX)
        const [child1, child2] = this.orderCrossover(parent1.genes, parent2.genes);
        offspring.push({ ...parent1, genes: child1 });
        offspring.push({ ...parent2, genes: child2 });
      } else {
        offspring.push(parent1);
        offspring.push(parent2);
      }
    }
    
    return offspring;
  }

  /**
   * Order crossover operator
   */
  private orderCrossover(parent1: number[], parent2: number[]): [number[], number[]] {
    const length = parent1.length;
    const start = Math.floor(Math.random() * length);
    const end = Math.floor(Math.random() * (length - start)) + start;
    
    // Create child1
    const child1 = [...parent1.slice(start, end + 1)];
    const remaining1 = parent2.filter(gene => !child1.includes(gene));
    child1.push(...remaining1);
    
    // Create child2
    const child2 = [...parent2.slice(start, end + 1)];
    const remaining2 = parent1.filter(gene => !child2.includes(gene));
    child2.push(...remaining2);
    
    return [child1, child2];
  }

  /**
   * Mutate chromosome
   */
  private mutate(offspring: Chromosome[]): Chromosome[] {
    return offspring.map(chromosome => {
      if (Math.random() < this.config.mutationRate) {
        // Swap mutation
        const genes = [...chromosome.genes];
        const i = Math.floor(Math.random() * genes.length);
        const j = Math.floor(Math.random() * genes.length);
        [genes[i], genes[j]] = [genes[j], genes[i]];
        
        return { ...chromosome, genes };
      }
      return chromosome;
    });
  }

  /**
   * Apply elitism - keep best chromosomes
   */
  private applyElitism(
    oldPopulation: Chromosome[],
    newPopulation: Chromosome[]
  ): Chromosome[] {
    const sortedOld = [...oldPopulation].sort((a, b) => b.fitness - a.fitness);
    const sortedNew = [...newPopulation].sort((a, b) => b.fitness - a.fitness);
    
    // Keep best from old population
    const elite = sortedOld.slice(0, this.config.elitismCount);
    
    // Replace worst in new population
    const result = [...sortedNew];
    result.splice(-this.config.elitismCount, this.config.elitismCount, ...elite);
    
    return result;
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

