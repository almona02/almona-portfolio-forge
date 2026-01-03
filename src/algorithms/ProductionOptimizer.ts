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

import { trackAccuracyCheckpoint } from '@/lib/fabricator/AccuracyTracker';
import { getBaselineTracker } from '@/lib/performance/BaselineTracker';
import { endTiming, getWorkflowProfiler, startTiming } from '@/lib/performance/WorkflowProfiler';
import type { Cut, CuttingPlan, OptimizationResult, Profile } from '@/types/fabricator';
import {
  ACCURACY_DECIMAL_PLACES,
  ACCURACY_THRESHOLD,
  DEFAULT_STOCK_LENGTH_MM,
  PERCENTAGE_MULTIPLIER,
  PROGRESS_PERCENTAGES,
  STANDARD_KERF_MM,
  STRATEGY_ITERATIONS,
  TARGET_UTILIZATION,
} from './productionOptimizerConstants';

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
  private readonly FAST_STRATEGY_ITERATIONS = STRATEGY_ITERATIONS.FAST;
  private readonly BALANCED_STRATEGY_ITERATIONS = STRATEGY_ITERATIONS.BALANCED;
  private readonly OPTIMAL_STRATEGY_ITERATIONS = STRATEGY_ITERATIONS.OPTIMAL;
  private readonly TARGET_UTILIZATION_VALUE = TARGET_UTILIZATION;
  private readonly ACCURACY_THRESHOLD_VALUE = ACCURACY_THRESHOLD;

  /**
   * Optimize cutting plan with production-grade algorithm
   * 
   * @param ydtStrategy - Optional YDT strategy to guide optimization
   */
  optimize(
    cuts: Cut[],
    stockLength: number = DEFAULT_STOCK_LENGTH_MM,
    options: ProductionOptimizationOptions & { ydtStrategy?: { strategy: string; constraints?: Record<string, any>; priorities?: string[] } } = {}
  ): ProductionOptimizationResult {
    const {
      strategy = 'balanced',
      deterministic = false,
      maxIterations,
      targetUtilization = this.TARGET_UTILIZATION_VALUE,
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
          progress: PROGRESS_PERCENTAGES.INITIALIZATION,
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
          progress: PROGRESS_PERCENTAGES.HEURISTIC_COMPLETE,
          message: 'Fast heuristic optimization complete',
          messageAr: 'اكتمل التحسين السريع',
          currentUtilization: heuristicResult.nestingEfficiency,
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
            const progressPercent = PROGRESS_PERCENTAGES.GENETIC_START + (iteration / iterations) * PROGRESS_PERCENTAGES.GENETIC_RANGE;
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
      
      if (accuracy < this.ACCURACY_THRESHOLD_VALUE) {
        throw new Error(
          `Optimization accuracy ${accuracy.toFixed(2)}% below ${this.ACCURACY_THRESHOLD_VALUE}% threshold`
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
        finalResult.nestingEfficiency,
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
          progress: PROGRESS_PERCENTAGES.COMPLETE,
          message: 'Optimization complete',
          messageAr: 'اكتمل التحسين',
          currentUtilization: finalResult.nestingEfficiency,
          bestUtilization: finalResult.nestingEfficiency,
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
    _deterministic: boolean,
    profile?: Profile
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
      // Note: Cut interface doesn't have quantity, so we process each cut once
      // If quantity is needed, cuts should be duplicated before calling this method

      // Calculate space needed: cut length + kerf (if there are already cuts in the bar)
      const hasExistingCuts = currentBar.cuts.length > 0;
      const kerfNeeded = hasExistingCuts ? STANDARD_KERF_MM : 0;
      const totalNeeded = cutLength + kerfNeeded;

      if (currentBar.remainingLength >= totalNeeded) {
        // Fits in current bar
        currentBar.cuts.push(cut);
        currentBar.usedLength += cutLength; // Only count actual cut length
        currentBar.remainingLength -= totalNeeded; // Account for both cut and kerf
      } else {
        // Start new bar
        if (currentBar.cuts.length > 0) {
          bars.push(currentBar);
        }
        currentBar = {
          cuts: [cut],
          usedLength: cutLength,
          remainingLength: stockLength - cutLength,
        };
      }
    }

    // Add last bar
    if (currentBar.cuts.length > 0) {
      bars.push(currentBar);
    }

    // Convert to CuttingPlan[] format
    const cuttingPlan: CuttingPlan[] = bars.map((bar) => {
      const totalWaste = bar.remainingLength;
      const totalUsed = bar.usedLength;
      const utilization = stockLength > 0 ? (totalUsed / stockLength) * PERCENTAGE_MULTIPLIER : 0;

      return {
        profile: profile || ({} as Profile), // Default profile if not provided
        stockLength,
        cuts: bar.cuts,
        totalWaste,
        utilization,
      };
    });

    // Calculate metrics for OptimizationResult
    const totalUsed = bars.reduce((sum, bar) => sum + bar.usedLength, 0);
    const totalMaterial = bars.length * stockLength;
    const totalWaste = totalMaterial - totalUsed;
    const wastePercentage = totalMaterial > 0 ? (totalWaste / totalMaterial) * PERCENTAGE_MULTIPLIER : 0;
    const nestingEfficiency = PERCENTAGE_MULTIPLIER - wastePercentage;

    // Estimate material cost (simplified - would need profile cost data)
    const materialUsage = profile
      ? (totalUsed / 1000) * (profile.costPerMeter || 0)
      : 0;

    // Estimate production time (rough calculation: 2.5 minutes per cut)
    const estimatedProductionTime = cuts.length * 2.5;

    return {
      materialUsage,
      wastePercentage,
      estimatedProductionTime,
      cuttingPlan,
      nestingEfficiency,
      costBreakdown: {
        materialCost: materialUsage,
        laborCost: materialUsage * 0.3,
        hardwareCost: 0,
        glazingCost: materialUsage * 0.4,
        totalCost: 0,
      },
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
    let bestUtilization = initialSolution.nestingEfficiency;

    // Genetic algorithm: mutate and improve
    for (let i = 0; i < iterations; i++) {
      // Create mutation of current solution
      const mutated = this.mutateSolution(cuts, stockLength, bestSolution, deterministic);

      // Accept if better (higher nesting efficiency = better)
      if (mutated.nestingEfficiency > bestUtilization) {
        bestSolution = mutated;
        bestUtilization = mutated.nestingEfficiency;
      }

      // Report progress
      if (onIteration) {
        onIteration(i + 1, mutated.nestingEfficiency, bestUtilization);
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
    _currentSolution: OptimizationResult,
    deterministic: boolean
  ): OptimizationResult {
    // Simple mutation: try different cut ordering
    const shuffledCuts = deterministic
      ? [...cuts] // Deterministic: no shuffle
      : this.shuffleArray([...cuts], deterministic); // Non-deterministic: shuffle

    // Extract profile from current solution's cutting plan if available
    const profile = _currentSolution.cuttingPlan[0]?.profile;

    // Re-optimize with shuffled cuts
    return this.fastHeuristicOptimization(shuffledCuts, stockLength, deterministic, profile);
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
      return sum + length; // Cut doesn't have quantity property
    }, 0);

    // Calculate total actual length used from cutting plans
    const totalActual = result.cuttingPlan.reduce((sum, plan) => {
      const planUsed = plan.cuts.reduce((planSum, cut) => planSum + cut.length, 0);
      return sum + planUsed;
    }, 0);

    // Calculate error
    const error = Math.abs(totalPlanned - totalActual);
    const accuracy = totalPlanned > 0
      ? PERCENTAGE_MULTIPLIER * (1 - (error / totalPlanned))
      : PERCENTAGE_MULTIPLIER;

    // Round to specified decimal places
    const multiplier = Math.pow(10, ACCURACY_DECIMAL_PLACES);
    return Math.round(accuracy * multiplier) / multiplier;
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
  stockLength: number = DEFAULT_STOCK_LENGTH_MM,
  options?: ProductionOptimizationOptions
): ProductionOptimizationResult {
  return getProductionOptimizer().optimize(cuts, stockLength, options);
}

