/**
 * Adaptive Solver
 * Orchestrates algorithm selection based on job complexity and time constraints
 * Automatically selects the best algorithm: Greedy, Linear Programming, or Genetic
 */

import { 
  CuttingPlan, 
  Cut, 
  Profile, 
  OptimizationResult,
  AdaptiveSolverConfig,
  WindowComponent 
} from '@/types/fabricator';
import { GreedyHeuristic } from './greedyHeuristic';
import { LinearProgrammingOptimizer } from './linearProgramming';
import { GeneticOptimizer } from './geneticOptimization';
import { calibrationManager } from '@/lib/calibration/CalibrationManager';

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

    try {
      // Analyze job complexity
      const complexity = this.analyzeComplexity(job, profiles);

      // Select algorithm based on complexity and config
      const algorithm = this.selectAlgorithm(complexity);

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
   * Select optimal algorithm based on complexity and configuration
   */
  protected selectAlgorithm(complexity: JobComplexity): 'greedy' | 'linear' | 'genetic' {
    // If preferred algorithm is specified and complexity allows, use it
    if (this.config.preferredAlgorithm) {
      const preferred = this.config.preferredAlgorithm;
      
      // Validate preferred algorithm is suitable
      if (preferred === 'greedy' && complexity.totalCuts < this.config.complexityThresholds.medium) {
        return 'greedy';
      }
      if (preferred === 'linear' && complexity.totalCuts < this.config.complexityThresholds.medium) {
        return 'linear';
      }
      if (preferred === 'genetic') {
        return 'genetic';
      }
    }

    // Auto-select based on complexity thresholds
    if (complexity.totalCuts < this.config.complexityThresholds.simple) {
      return 'greedy';
    } else if (complexity.totalCuts < this.config.complexityThresholds.medium) {
      return 'linear';
    } else {
      return 'genetic';
    }
  }

  /**
   * Execute optimization with selected algorithm
   */
  protected async executeOptimization(
    job: CuttingJob,
    profiles: Profile[],
    algorithm: 'greedy' | 'linear' | 'genetic',
    complexity: JobComplexity
  ): Promise<CuttingPlan[]> {
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
      const systemPackId = job.systemPackId || 
                          (profile.specifications as any)?.systemPackId || 
                          '';

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
            componentType: (specs.profileRole as string | undefined) || component.type,
            waste: allowance,
          });
        });
      }

      if (cuts.length === 0) continue;

      const stockLength = this.getStockLength(profile, job.defaultStockLength);

      // Execute selected algorithm
      let profilePlans: CuttingPlan[];
      
      switch (algorithm) {
        case 'greedy':
          const greedyOptimizer = new GreedyHeuristic(cuts, profile, stockLength);
          profilePlans = greedyOptimizer.optimize();
          break;
        
        case 'linear':
          const lpOptimizer = new LinearProgrammingOptimizer(cuts, profile, stockLength);
          profilePlans = lpOptimizer.optimize();
          break;
        
        case 'genetic':
          const geneticOptimizer = new GeneticOptimizer(cuts, profile, stockLength);
          profilePlans = geneticOptimizer.optimize();
          break;
        
        default:
          // Fallback to greedy
          const fallbackOptimizer = new GreedyHeuristic(cuts, profile, stockLength);
          profilePlans = fallbackOptimizer.optimize();
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
    profiles: Profile[],
    durationMs: number
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

    return {
      materialUsage: totalMaterialCost,
      wastePercentage,
      estimatedProductionTime,
      cuttingPlan,
      nestingEfficiency,
      costBreakdown: {
        materialCost: totalMaterialCost,
        laborCost: totalMaterialCost * 0.3,
        hardwareCost: 0, // Will be calculated separately
        glazingCost: totalMaterialCost * 0.4,
        totalCost: 0, // Will be calculated after hardware cost
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
    
    if (typeof (profile.specifications as any)?.stockLengthMm === 'number') {
      return Math.min((profile.specifications as any).stockLengthMm, MAX_STOCK_LENGTH_MM);
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

