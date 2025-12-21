/**
 * ProductionOptimizer - Production-Grade Optimization Engine
 * 
 * Week 3 Task 3.3: Production Optimizer Implementation
 * 
 * Algorithm Strategy:
 * - Hybrid approach: Fast heuristic + genetic refinement
 * - Deterministic mode for testing consistency
 * - Memory-efficient processing
 * - Progress tracking with Arabic messages
 */

import type { Cut, OptimizationResult } from '@/types/fabricator';
import { getWorkflowProfiler, startTiming, endTiming } from '@/lib/performance/WorkflowProfiler';
import { getBaselineTracker } from '@/lib/performance/BaselineTracker';
import { trackAccuracyCheckpoint } from '@/lib/fabricator/AccuracyTracker';

export interface ProductionOptimizationOptions {
  strategy?: 'fast' | 'balanced' | 'optimal';
  deterministic?: boolean; // For testing consistency
  maxIterations?: number;
  targetUtilization?: number; // Target stock utilization percentage
  language?: 'en' | 'ar';
  onProgress?: (progress: OptimizationProgress) => void;
}

export interface OptimizationProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
  messageAr: string;
  currentIteration?: number;
  maxIterations?: number;
  currentUtilization?: number;
  bestUtilization?: number;
}

export interface ProductionOptimizationResult extends OptimizationResult {
  strategy: 'fast' | 'balanced' | 'optimal';
  iterations: number;
  executionTime: number;
  accuracy: number;
  deterministic: boolean;
  progress: OptimizationProgress[];
}

/**
 * ProductionOptimizer - Main optimization class
 */
export class ProductionOptimizer {
  private readonly FAST_STRATEGY_ITERATIONS = 10;
  private readonly BALANCED_STRATEGY_ITERATIONS = 50;
  private readonly OPTIMAL_STRATEGY_ITERATIONS = 200;
  private readonly TARGET_UTILIZATION = 95.0; // 95% target utilization
  private readonly ACCURACY_THRESHOLD = 99.8; // 99.8% accuracy target

  /**
   * Optimize cutting plan with production-grade algorithm
   */
  optimize(
    cuts: Cut[],
    stockLength: number = 6000,
    options: ProductionOptimizationOptions = {}
  ): ProductionOptimizationResult {
    const {
      strategy = 'balanced',
      deterministic = false,
      maxIterations,
      targetUtilization = this.TARGET_UTILIZATION,
      language = 'en',
      onProgress,
    } = options;

    const _profiler = getWorkflowProfiler();
    startTiming('optimization', 'Cutting Optimization');

    const progress: OptimizationProgress[] = [];
    const iterations = maxIterations || this.getIterationsForStrategy(strategy);

    try {
      // Report initial progress
      this.reportProgress(
        progress,
        onProgress,
        {
          stage: 'initialization',
          progress: 0,
          message: 'Initializing optimization...',
          messageAr: 'تهيئة التحسين...',
        },
        language
      );

      // Step 1: Fast heuristic (greedy) for initial solution
      const heuristicResult = this.fastHeuristicOptimization(
        cuts,
        stockLength,
        deterministic
      );

      this.reportProgress(
        progress,
        onProgress,
        {
          stage: 'heuristic',
          progress: 30,
          message: 'Fast heuristic optimization complete',
          messageAr: 'اكتمل التحسين السريع',
          currentUtilization: heuristicResult.utilization,
        },
        language
      );

      // Step 2: Genetic refinement (if strategy requires it)
      let finalResult: OptimizationResult;
      if (strategy === 'optimal' || strategy === 'balanced') {
        finalResult = this.geneticRefinement(
          cuts,
          stockLength,
          heuristicResult,
          iterations,
          deterministic,
          targetUtilization,
          (iteration, currentUtil, bestUtil) => {
            const progressPercent = 30 + (iteration / iterations) * 60;
            this.reportProgress(
              progress,
              onProgress,
              {
                stage: 'genetic_refinement',
                progress: progressPercent,
                message: `Refining solution (iteration ${iteration}/${iterations})...`,
                messageAr: `تحسين الحل (التكرار ${iteration}/${iterations})...`,
                currentIteration: iteration,
                maxIterations: iterations,
                currentUtilization: currentUtil,
                bestUtilization: bestUtil,
              },
              language
            );
          }
        );
      } else {
        finalResult = heuristicResult;
      }

      // Step 3: Validate and calculate accuracy
      const accuracy = this.calculateOptimizationAccuracy(finalResult, cuts);
      
      if (accuracy < this.ACCURACY_THRESHOLD) {
        throw new Error(
          `Optimization accuracy ${accuracy.toFixed(2)}% below ${this.ACCURACY_THRESHOLD}% threshold`
        );
      }

      // Step 4: Track accuracy checkpoint
      trackAccuracyCheckpoint(
        'optimization',
        { cuts, stockLength },
        finalResult,
        accuracy,
        { strategy, iterations, deterministic }
      );

      // Step 5: Record baseline
      const baselineTracker = getBaselineTracker();
      baselineTracker.recordBaseline(
        'optimization_utilization',
        finalResult.utilization,
        'Optimization Utilization'
      );
      baselineTracker.recordBaseline(
        'optimization_accuracy',
        accuracy,
        'Optimization Accuracy'
      );

      const endTime = endTiming('optimization');
      const executionTime = endTime?.duration || 0;

      this.reportProgress(
        progress,
        onProgress,
        {
          stage: 'complete',
          progress: 100,
          message: 'Optimization complete',
          messageAr: 'اكتمل التحسين',
          currentUtilization: finalResult.utilization,
          bestUtilization: finalResult.utilization,
        },
        language
      );

      return {
        ...finalResult,
        strategy,
        iterations,
        executionTime,
        accuracy,
        deterministic,
        progress,
      };

    } catch (error) {
      endTiming('optimization');
      throw error;
    }
  }

  /**
   * Fast heuristic optimization (greedy algorithm)
   */
  private fastHeuristicOptimization(
    cuts: Cut[],
    stockLength: number,
    _deterministic: boolean
  ): OptimizationResult {
    // Sort cuts by length (descending) for best-fit
    const sortedCuts = [...cuts].sort((a, b) => {
      const lengthA = (a as any).plannedLength || a.length || 0;
      const lengthB = (b as any).plannedLength || b.length || 0;
      return lengthB - lengthA;
    });

    const bars: Array<{
      cuts: Cut[];
      usedLength: number;
      remainingLength: number;
    }> = [];

    let currentBar = {
      cuts: [] as Cut[],
      usedLength: 0,
      remainingLength: stockLength,
    };

    // Simple first-fit decreasing algorithm
    for (const cut of sortedCuts) {
      const cutLength = (cut as any).plannedLength || cut.length || 0;
      const quantity = cut.quantity || 1;

      for (let q = 0; q < quantity; q++) {
        // Add kerf (4.2mm) except for last cut
        const kerf = q === quantity - 1 ? 0 : 4.2;
        const totalNeeded = cutLength + kerf;

        if (currentBar.remainingLength >= totalNeeded) {
          // Fits in current bar
          currentBar.cuts.push(cut);
          currentBar.usedLength += totalNeeded;
          currentBar.remainingLength -= totalNeeded;
        } else {
          // Start new bar
          bars.push(currentBar);
          currentBar = {
            cuts: [cut],
            usedLength: totalNeeded,
            remainingLength: stockLength - totalNeeded,
          };
        }
      }
    }

    // Add last bar
    if (currentBar.cuts.length > 0) {
      bars.push(currentBar);
    }

    // Calculate metrics
    const totalUsed = bars.reduce((sum, bar) => sum + bar.usedLength, 0);
    const totalMaterial = bars.length * stockLength;
    const utilization = totalMaterial > 0 ? (totalUsed / totalMaterial) * 100 : 0;
    const waste = totalMaterial - totalUsed;
    const wastePercentage = totalMaterial > 0 ? (waste / totalMaterial) * 100 : 0;

    return {
      bars: bars.map((bar, index) => ({
        id: `bar-${index + 1}`,
        cuts: bar.cuts,
        usedLength: bar.usedLength,
        remainingLength: bar.remainingLength,
        utilization: (bar.usedLength / stockLength) * 100,
      })),
      utilization,
      waste,
      wastePercentage,
      totalBars: bars.length,
    };
  }

  /**
   * Genetic refinement algorithm
   */
  private geneticRefinement(
    cuts: Cut[],
    stockLength: number,
    initialSolution: OptimizationResult,
    iterations: number,
    deterministic: boolean,
    targetUtilization: number,
    onIteration?: (iteration: number, currentUtil: number, bestUtil: number) => void
  ): OptimizationResult {
    let bestSolution = initialSolution;
    let bestUtilization = initialSolution.utilization;

    // Genetic algorithm: mutate and improve
    for (let i = 0; i < iterations; i++) {
      // Create mutation of current solution
      const mutated = this.mutateSolution(cuts, stockLength, bestSolution, deterministic);

      // Accept if better
      if (mutated.utilization > bestUtilization) {
        bestSolution = mutated;
        bestUtilization = mutated.utilization;
      }

      // Report progress
      if (onIteration) {
        onIteration(i + 1, mutated.utilization, bestUtilization);
      }

      // Early termination if target reached
      if (bestUtilization >= targetUtilization) {
        break;
      }
    }

    return bestSolution;
  }

  /**
   * Mutate solution for genetic algorithm
   */
  private mutateSolution(
    cuts: Cut[],
    stockLength: number,
    currentSolution: OptimizationResult,
    deterministic: boolean
  ): OptimizationResult {
    // Simple mutation: try different cut ordering
    const shuffledCuts = deterministic
      ? [...cuts] // Deterministic: no shuffle
      : this.shuffleArray([...cuts], deterministic); // Non-deterministic: shuffle

    // Re-optimize with shuffled cuts
    return this.fastHeuristicOptimization(shuffledCuts, stockLength, deterministic);
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[], deterministic: boolean): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = deterministic
        ? i - 1 // Deterministic: reverse order
        : Math.floor(Math.random() * (i + 1)); // Non-deterministic: random
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Calculate optimization accuracy
   */
  private calculateOptimizationAccuracy(
    result: OptimizationResult,
    originalCuts: Cut[]
  ): number {
    // Calculate total planned length
    const totalPlanned = originalCuts.reduce((sum, cut) => {
      const length = (cut as any).plannedLength || cut.length || 0;
      return sum + (length * (cut.quantity || 1));
    }, 0);

    // Calculate total actual length used
    const totalActual = result.bars.reduce((sum, bar) => sum + bar.usedLength, 0);

    // Calculate error
    const error = Math.abs(totalPlanned - totalActual);
    const accuracy = totalPlanned > 0
      ? 100 * (1 - (error / totalPlanned))
      : 100.0;

    return Math.round(accuracy * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get iterations for strategy
   */
  private getIterationsForStrategy(strategy: 'fast' | 'balanced' | 'optimal'): number {
    switch (strategy) {
      case 'fast':
        return this.FAST_STRATEGY_ITERATIONS;
      case 'balanced':
        return this.BALANCED_STRATEGY_ITERATIONS;
      case 'optimal':
        return this.OPTIMAL_STRATEGY_ITERATIONS;
      default:
        return this.BALANCED_STRATEGY_ITERATIONS;
    }
  }

  /**
   * Report progress
   */
  private reportProgress(
    progress: OptimizationProgress[],
    onProgress: ((progress: OptimizationProgress) => void) | undefined,
    update: OptimizationProgress,
    _language: 'en' | 'ar'
  ): void {
    progress.push(update);
    if (onProgress) {
      onProgress(update);
    }
  }
}

/**
 * Export singleton instance
 */
let optimizerInstance: ProductionOptimizer | null = null;

export function getProductionOptimizer(): ProductionOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new ProductionOptimizer();
  }
  return optimizerInstance;
}

/**
 * Convenience function
 */
export function optimizeProduction(
  cuts: Cut[],
  stockLength: number = 6000,
  options?: ProductionOptimizationOptions
): ProductionOptimizationResult {
  return getProductionOptimizer().optimize(cuts, stockLength, options);
}

