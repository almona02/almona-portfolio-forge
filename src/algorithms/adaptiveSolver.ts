/**
 * Adaptive Solver
 * Orchestrates algorithm selection based on job complexity and time constraints.
 *
 * FP-016 Option B (AICS-001 Tier 3):
 * Manufacturing truth path uses only deterministic algorithms: greedy | linear.
 * Genetic optimization is advisory/search-only and is never selected for Tier-3 execution.
 */

import { calibrationManager } from '@/lib/calibration/CalibrationManager';
import {
  assertTier3ManufacturingAlgorithm,
  type Tier3ManufacturingAlgorithm,
} from '@/lib/fabricator/manufacturingAuthority';
import {
    AdaptiveSolverConfig,
    Cut,
    CuttingPlan,
    OptimizationResult,
    Profile,
    WindowComponent
} from '@/types/fabricator';
import { GreedyHeuristic } from './greedyHeuristic';
import { LinearProgrammingOptimizer } from './linearProgramming';

/** Tier-3 manufacturing algorithms only (deterministic). Genetic is excluded (FP-016 Option B). */
export type Tier3CuttingAlgorithm = Tier3ManufacturingAlgorithm;

export interface JobComplexity {
  totalCuts: number;
  uniqueProfiles: number;
  averageCutLength: number;
  maxCutLength: number;
  stockLengthConstraints: number[];
  complexityScore: number; // 0-100 scale
}

export interface CuttingJob {
  components: WindowComponent[];
  profiles: Profile[];
  defaultStockLength?: number;
  systemPackId?: string; // Optional system pack ID for calibration lookup
}

export class AdaptiveSolver {
  protected config: AdaptiveSolverConfig;

  constructor(config: AdaptiveSolverConfig) {
    this.config = config;
  }

  /**
   * Solve cutting optimization problem with adaptive algorithm selection
   */
  async solve(job: CuttingJob, profiles: Profile[]): Promise<OptimizationResult> {
    const startTime = performance.now();

    // INPUT VALIDATION
    if (!job.components || job.components.length === 0) {
      throw new Error('Invalid job: No components provided');
    }
    if (!profiles || profiles.length === 0) {
      throw new Error('Invalid job: No profiles provided');
    }

    try {
      // Analyze job complexity
      const complexity = this.analyzeComplexity(job, profiles);

      // Select algorithm based on complexity and config
      let algorithm = this.selectAlgorithm(complexity);
      
      // SAFEGUARD: For extremely large datasets, force greedy to avoid memory issues/timeouts
      if (complexity.totalCuts > 2000) {
        console.warn(`Massive dataset detected (${complexity.totalCuts} cuts). Forcing greedy algorithm for performance.`);
        algorithm = 'greedy';
      }

      // Execute optimization
      const cuttingPlan = await this.executeOptimization(
        job,
        profiles,
        algorithm,
        complexity
      );

      // Calculate optimization metrics
      const result = this.calculateOptimizationResult(
        cuttingPlan,
        profiles,
        performance.now() - startTime
      );

      return result;
    } catch (error) {
      // Fallback to greedy if primary algorithm fails
      console.warn('Primary algorithm failed, falling back to greedy:', error);
      return this.fallbackToGreedy(job, profiles, performance.now() - startTime);
    }
  }

  /**
   * Analyze job complexity to determine optimal algorithm
   */
  protected analyzeComplexity(job: CuttingJob, profiles: Profile[]): JobComplexity {
    // Collect all cuts from all components
    const allCuts: Cut[] = [];
    const profileMap = new Map<string, Profile>();
    const stockLengths = new Set<number>();

    for (const component of job.components) {
      const profile = profiles.find(p => p.id === component.profile.id);
      if (!profile) continue;

      profileMap.set(profile.id, profile);

      // Get stock length for this profile
      const stockLength = this.getStockLength(profile, job.defaultStockLength);
      stockLengths.add(stockLength);

      // Create cuts from component cutting lengths
      component.cuttingLengths.forEach((length, index) => {
        const angle = component.angles[index] || 90;
        const allowance = profile.cuttingAllowance || 0;
        const rawLength = length + allowance;

        allCuts.push({
          length: rawLength,
          angle,
          componentId: component.id,
          componentType: component.type,
          waste: allowance,
        });
      });
    }

    const totalCuts = allCuts.length;
    const uniqueProfiles = profileMap.size;
    const cutLengths = allCuts.map(c => c.length);
    const averageCutLength = cutLengths.reduce((sum, len) => sum + len, 0) / totalCuts || 0;
    const maxCutLength = Math.max(...cutLengths, 0);

    // Calculate complexity score (0-100)
    // Factors: number of cuts, profile diversity, cut length variance
    const cutCountScore = Math.min((totalCuts / 1000) * 50, 50); // Max 50 points for cut count
    const profileDiversityScore = Math.min((uniqueProfiles / 10) * 25, 25); // Max 25 points for diversity
    const varianceScore = this.calculateVarianceScore(cutLengths, averageCutLength); // Max 25 points

    const complexityScore = cutCountScore + profileDiversityScore + varianceScore;

    return {
      totalCuts,
      uniqueProfiles,
      averageCutLength,
      maxCutLength,
      stockLengthConstraints: Array.from(stockLengths),
      complexityScore,
    };
  }

  /**
   * Select Tier-3 manufacturing algorithm (greedy | linear only).
   * Genetic is never returned — FP-016 Option B / AICS-001.
   */
  protected selectAlgorithm(complexity: JobComplexity): Tier3CuttingAlgorithm {
    // preferredAlgorithm: genetic is advisory-only → ignore for Tier-3 execution
    if (this.config.preferredAlgorithm === 'genetic') {
      console.warn(
        '[AICS-001 / FP-016] preferredAlgorithm=genetic is advisory-only; selecting Tier-3 deterministic algorithm instead.',
      );
    } else if (this.config.preferredAlgorithm === 'greedy') {
      return 'greedy';
    } else if (this.config.preferredAlgorithm === 'linear') {
      // Prefer linear only when cut count is within a safe band for LP
      if (complexity.totalCuts < this.config.complexityThresholds.medium) {
        return 'linear';
      }
      console.warn(
        '[AICS-001] preferredAlgorithm=linear skipped for large cut counts; using greedy.',
      );
      return 'greedy';
    }

    if (complexity.totalCuts < this.config.complexityThresholds.simple) {
      return 'greedy';
    }
    if (complexity.totalCuts < this.config.complexityThresholds.medium) {
      return 'linear';
    }
    // Complex jobs: deterministic greedy (scales safely). Genetic is advisory-only (FP-016).
    return 'greedy';
  }

  /**
   * Execute optimization with selected Tier-3 algorithm
   */
  protected async executeOptimization(
    job: CuttingJob,
    profiles: Profile[],
    algorithm: Tier3CuttingAlgorithm | string,
    _complexity: JobComplexity
  ): Promise<CuttingPlan[]> {
    // Fail closed: genetic / advisory must never execute as manufacturing truth
    assertTier3ManufacturingAlgorithm(algorithm, 'AdaptiveSolver.executeOptimization');

    await Promise.resolve();
    const allPlans: CuttingPlan[] = [];

    // Group components by profile for optimization
    const componentsByProfile = new Map<string, WindowComponent[]>();
    for (const component of job.components) {
      const profileId = component.profile.id;
      if (!componentsByProfile.has(profileId)) {
        componentsByProfile.set(profileId, []);
      }
      componentsByProfile.get(profileId)!.push(component);
    }

    // Optimize each profile group separately
    for (const [profileId, components] of componentsByProfile.entries()) {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) continue;

      // Collect all cuts for this profile
      // Calculate cuts with allowances and calibrations (matching generateCuttingPlan logic)
      const cuts: Cut[] = [];
      
      // Get system pack ID from job or from profile
      const specs = profile.specifications as { systemPackId?: string } | undefined;
      const systemPackId = job.systemPackId || specs?.systemPackId || '';

      // Get active calibration for this profile and system pack
      const calibration = systemPackId 
        ? calibrationManager.getActiveCalibration(profile, systemPackId)
        : null;

      for (const component of components) {
        const specs = profile.specifications || {};
        const isMiter45 =
          specs.cuttingType === 'miter_45' || specs.optimizedFor45Degree === true;

        component.cuttingLengths.forEach((length, index) => {
          const baseAngle = component.angles[index] || 90;
          const angle = isMiter45 ? 45 : baseAngle;

          // Extra logic for frame profiles with decorative/border frames
          const isBorderFrame =
            (profile.type === 'frame' ||
              specs.egyptFrameType === 'sliding' ||
              specs.egyptFrameType === 'casement') &&
            specs.egyptBorderIncluded === 'with';

          // Base allowance comes from profile.cuttingAllowance.
          // If this is a frame with border, we add an extra, per-profile border allowance
          const borderExtraAllowance = isBorderFrame
            ? (specs.borderExtraAllowanceMm as number | undefined) ?? 5
            : 0;
          const allowance = profile.cuttingAllowance + borderExtraAllowance;

          let rawLength = length + allowance;

          // Apply calibration modifiers if available
          rawLength = calibrationManager.applyCalibration(rawLength, calibration);

          cuts.push({
            length: rawLength,
            angle,
            componentId: component.id,
            cutId: `${component.id}:${index}`,
            occurrenceIndex: index,
            componentType: (specs.profileRole as string | undefined) || component.type,
            waste: allowance,
          });
        });
      }

      if (cuts.length === 0) continue;

      const stockLength = this.getStockLength(profile, job.defaultStockLength);

      // Execute selected algorithm (Tier-3: greedy | linear only — asserted above)
      let profilePlans: CuttingPlan[];

      switch (algorithm) {
        case 'linear': {
          const lpOptimizer = new LinearProgrammingOptimizer(cuts, profile, stockLength);
          profilePlans = lpOptimizer.optimize();
          break;
        }
        case 'greedy':
        default: {
          const greedyOptimizer = new GreedyHeuristic(cuts, profile, stockLength);
          profilePlans = greedyOptimizer.optimize();
          break;
        }
      }

      allPlans.push(...profilePlans);
    }

    return allPlans;
  }

  /**
   * Calculate optimization result from cutting plans
   */
  protected calculateOptimizationResult(
    cuttingPlan: CuttingPlan[],
    _profiles: Profile[],
    _durationMs: number
  ): OptimizationResult {
    let totalMaterialCost = 0;
    let totalWaste = 0;
    let totalCutLength = 0;

    for (const plan of cuttingPlan) {
      const totalCutLengthInPlan = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
      totalCutLength += totalCutLengthInPlan;
      totalWaste += plan.totalWaste;

      // Calculate material cost
      const profile = plan.profile;
      const specs = profile.specifications || {};
      let effectiveCostPerMeter = profile.costPerMeter;

      if (
        profile.material === 'aluminum' &&
        typeof specs.costPerKg === 'number' &&
        typeof profile.weightPerMeter === 'number'
      ) {
        effectiveCostPerMeter = specs.costPerKg * profile.weightPerMeter;
      }

      totalMaterialCost += (totalCutLengthInPlan / 1000) * effectiveCostPerMeter;
    }

    const totalLength = totalCutLength + totalWaste;
    const wastePercentage = totalLength === 0 ? 0 : (totalWaste / totalLength) * 100;
    const nestingEfficiency = 100 - wastePercentage;

    // Estimate production time (rough calculation)
    const estimatedProductionTime = cuttingPlan.reduce(
      (sum, plan) => sum + plan.cuts.length * 2.5,
      0
    );

    const laborCost = totalMaterialCost * 0.3;
    const glazingCost = totalMaterialCost * 0.4;
    const hardwareCost = 0; // Hardware cost calculated by HardwareCalculator, not here

    return {
      materialUsage: totalMaterialCost,
      wastePercentage,
      estimatedProductionTime,
      cuttingPlan,
      nestingEfficiency,
      costBreakdown: {
        materialCost: totalMaterialCost,
        laborCost,
        hardwareCost,
        glazingCost,
        totalCost: totalMaterialCost + laborCost + hardwareCost + glazingCost,
      },
    };
  }

  /**
   * Fallback to greedy algorithm if primary fails
   */
  private async fallbackToGreedy(
    job: CuttingJob,
    profiles: Profile[],
    durationMs: number
  ): Promise<OptimizationResult> {
    await Promise.resolve();
    const allPlans: CuttingPlan[] = [];

    for (const component of job.components) {
      const profile = profiles.find(p => p.id === component.profile.id);
      if (!profile) continue;

      const cuts: Cut[] = [];
      component.cuttingLengths.forEach((length, index) => {
        const angle = component.angles[index] || 90;
        const allowance = profile.cuttingAllowance || 0;
        cuts.push({
          length: length + allowance,
          angle,
          componentId: component.id,
          componentType: component.type,
          waste: allowance,
        });
      });

      if (cuts.length === 0) continue;

      const stockLength = this.getStockLength(profile, job.defaultStockLength);
      const greedyOptimizer = new GreedyHeuristic(cuts, profile, stockLength);
      const plans = greedyOptimizer.optimize();
      allPlans.push(...plans);
    }

    return this.calculateOptimizationResult(allPlans, profiles, durationMs);
  }

  /**
   * Get stock length for a profile
   */
  private getStockLength(profile: Profile, defaultStockLength?: number): number {
    const MAX_STOCK_LENGTH_MM = 8000;
    
    const specs = profile.specifications as { stockLengthMm?: number } | undefined;
    if (typeof specs?.stockLengthMm === 'number') {
      return Math.min(specs.stockLengthMm, MAX_STOCK_LENGTH_MM);
    }
    
    return defaultStockLength || 6000;
  }

  /**
   * Calculate variance score for complexity analysis
   */
  private calculateVarianceScore(cutLengths: number[], average: number): number {
    if (cutLengths.length === 0) return 0;

    const variance = cutLengths.reduce((sum, len) => {
      const diff = len - average;
      return sum + diff * diff;
    }, 0) / cutLengths.length;

    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = average > 0 ? stdDev / average : 0;

    // Higher variance = more complex (max 25 points)
    return Math.min(coefficientOfVariation * 100, 25);
  }
}

