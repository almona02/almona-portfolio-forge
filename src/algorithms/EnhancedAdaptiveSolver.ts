  /**
   * Enhanced Adaptive Solver with Runtime Optimization
   * Features:
   * - Real-time pre-solver for instant feedback
   * - Progressive optimization (start fast, refine in background)
   * - Rule-based algorithm selection (deterministic, no ML)
   * - Caching of optimization results
   */

import {
  Profile,
  OptimizationResult,
  AdaptiveSolverConfig,
} from '@/types/fabricator';
import { AdaptiveSolver, JobComplexity, CuttingJob } from './adaptiveSolver';
import { algorithmSelector } from '@/lib/fabricator/AlgorithmSelector';

export interface OptimizationCache {
  key: string;
  result: OptimizationResult;
  timestamp: number;
  complexity: JobComplexity;
}

export interface ProgressiveOptimizationState {
  initialResult: OptimizationResult;
  refinedResult?: OptimizationResult;
  isRefining: boolean;
  refinementProgress: number;
}

export class EnhancedAdaptiveSolver extends AdaptiveSolver {
  private cache: Map<string, OptimizationCache> = new Map();
  private maxCacheSize: number = 100;
  private cacheExpiryMs: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config: AdaptiveSolverConfig) {
    super(config);
  }

  /**
   * Solve with enhanced features: pre-solver, progressive optimization, ML prediction, caching
   */
  async solveEnhanced(
    job: CuttingJob,
    profiles: Profile[],
    options: {
      onProgress?: (progress: number, result?: OptimizationResult) => void;
      enableRealtimePresolver?: boolean;
      enableProgressiveOptimization?: boolean;
    } = {}
  ): Promise<OptimizationResult> {
    const startTime = performance.now();

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedResult(job, profiles);
      if (cached) {
        if (options.onProgress) {
          options.onProgress(100, cached);
        }
        return cached;
      }
    }

    // Analyze complexity
    const complexity = this.analyzeComplexity(job, profiles);

    // Real-time pre-solver for instant feedback
    if (options.enableRealtimePresolver !== false && this.config.enableRealtimePresolver !== false) {
      const presolverResult = await this.realTimePresolver(job, profiles, complexity);
      if (options.onProgress) {
        options.onProgress(30, presolverResult);
      }

      // If time constraint is realtime, return immediately
      if (this.config.timeConstraint === 'realtime') {
        this.cacheResult(job, profiles, presolverResult, complexity);
        return presolverResult;
      }
    }

    // Select algorithm using deterministic rules
    const algorithm = this.selectAlgorithmByRule(complexity);

    // Progressive optimization: start with fast solution, refine in background
    if (options.enableProgressiveOptimization !== false && this.config.enableProgressiveOptimization !== false) {
      return this.progressiveOptimization(
        job,
        profiles,
        algorithm,
        complexity,
        options.onProgress
      );
    }

    // Standard optimization
    const cuttingPlan = await this.executeOptimization(job, profiles, algorithm, complexity);
    const duration = performance.now() - startTime;
    const result = this.calculateOptimizationResult(
      cuttingPlan,
      profiles,
      duration
    );

    // Note: No ML training data collection needed for rule-based selection
    // Algorithm selection is deterministic and does not require training

    // Cache result
    if (this.config.enableCaching) {
      this.cacheResult(job, profiles, result, complexity);
    }

    if (options.onProgress) {
      options.onProgress(100, result);
    }

    return result;
  }

  /**
   * Real-time pre-solver: Greedy algorithm for instant feedback (<2s for <50 cuts)
   */
  private async realTimePresolver(
    job: CuttingJob,
    profiles: Profile[],
    complexity: JobComplexity
  ): Promise<OptimizationResult> {
    const startTime = performance.now();

    // Use greedy for pre-solver (fastest)
    const cuttingPlan = await this.executeOptimization(
      job,
      profiles,
      'greedy',
      complexity
    );

    const duration = performance.now() - startTime;
    const result = this.calculateOptimizationResult(cuttingPlan, profiles, duration);

    return result;
  }

  /**
   * Progressive optimization: Start with fast solution, refine in background
   */
  private async progressiveOptimization(
    job: CuttingJob,
    profiles: Profile[],
    initialAlgorithm: 'greedy' | 'linear' | 'genetic',
    complexity: JobComplexity,
    onProgress?: (progress: number, result?: OptimizationResult) => void
  ): Promise<OptimizationResult> {
    // Step 1: Get initial fast solution
    const initialStartTime = performance.now();
    const initialPlan = await this.executeOptimization(
      job,
      profiles,
      initialAlgorithm,
      complexity
    );
    const initialResult = this.calculateOptimizationResult(
      initialPlan,
      profiles,
      performance.now() - initialStartTime
    );

    if (onProgress) {
      onProgress(50, initialResult);
    }

    // Step 2: Refine in background if complexity warrants it
    if (complexity.complexityScore > 30 && initialAlgorithm !== 'genetic') {
      // Refine with better algorithm in background
      const refinedAlgorithm = this.selectRefinementAlgorithm(initialAlgorithm, complexity);
      
      if (refinedAlgorithm !== initialAlgorithm) {
        // Run refinement asynchronously
        this.refineInBackground(
          job,
          profiles,
          refinedAlgorithm,
          complexity,
          initialResult,
          onProgress
        ).catch((error) => {
          console.warn('Background refinement failed:', error);
        });
      }
    }

    // Return initial result immediately
    return initialResult;
  }

  /**
   * Refine optimization in background
   */
  private async refineInBackground(
    job: CuttingJob,
    profiles: Profile[],
    algorithm: 'greedy' | 'linear' | 'genetic',
    complexity: JobComplexity,
    initialResult: OptimizationResult,
    onProgress?: (progress: number, result?: OptimizationResult) => void
  ): Promise<void> {
    try {
      const refinedStartTime = performance.now();
      const refinedPlan = await this.executeOptimization(
        job,
        profiles,
        algorithm,
        complexity
      );
      const refinedResult = this.calculateOptimizationResult(
        refinedPlan,
        profiles,
        performance.now() - refinedStartTime
      );

      // Only update if refined result is better
      if (refinedResult.wastePercentage < initialResult.wastePercentage) {
        if (onProgress) {
          onProgress(100, refinedResult);
        }

        // Update cache with refined result
        if (this.config.enableCaching) {
          const cacheKey = this.generateCacheKey(job, profiles);
          const cached = this.cache.get(cacheKey);
          if (cached) {
            cached.result = refinedResult;
            cached.timestamp = Date.now();
          }
        }
      }
    } catch (error) {
      console.warn('Background refinement error:', error);
    }
  }

  /**
   * Select algorithm using deterministic rules
   * 
   * Constitutional Compliance: Tier 3 (Protected Determinism)
   * No ML, no AI, no predictions - just transparent, auditable rules.
   */
  private selectAlgorithmByRule(
    complexity: JobComplexity
  ): 'greedy' | 'linear' | 'genetic' {
    // Use rule-based selection (deterministic, constitutional)
    const selection = algorithmSelector.selectByRule(complexity);
    
    // Validate selection for constitutional compliance
    const validation = algorithmSelector.validateSelection(selection);
    if (!validation.isValid) {
      console.warn('Algorithm selection validation failed:', validation.errors);
      // Fall back to standard algorithm selection
      return this.selectAlgorithm(complexity);
    }
    
    return selection.algorithm;
  }

  /**
   * Select refinement algorithm based on initial algorithm and complexity
   */
  private selectRefinementAlgorithm(
    initial: 'greedy' | 'linear' | 'genetic',
    complexity: JobComplexity
  ): 'greedy' | 'linear' | 'genetic' {
    if (initial === 'greedy') {
      return complexity.totalCuts < this.config.complexityThresholds.medium ? 'linear' : 'genetic';
    } else if (initial === 'linear') {
      return 'genetic';
    }
    return initial; // Already using best algorithm
  }

  /**
   * Generate cache key from job and profiles
   */
  private generateCacheKey(job: CuttingJob, profiles: Profile[]): string {
    const componentIds = job.components.map(c => c.id).sort().join(',');
    const profileIds = profiles.map(p => p.id).sort().join(',');
    return `${componentIds}:${profileIds}:${job.defaultStockLength || 6000}`;
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(
    job: CuttingJob,
    profiles: Profile[]
  ): OptimizationResult | null {
    const key = this.generateCacheKey(job, profiles);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiry
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache optimization result
   */
  private cacheResult(
    job: CuttingJob,
    profiles: Profile[],
    result: OptimizationResult,
    complexity: JobComplexity
  ): void {
    const key = this.generateCacheKey(job, profiles);

    // Implement LRU cache: remove oldest if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      complexity,
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheExpiryMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get algorithm selection rules (for transparency and auditability)
   * 
   * Constitutional Compliance: All rules are visible and auditable.
   */
  getAlgorithmSelectionRules() {
    return algorithmSelector.getRules();
  }
}

