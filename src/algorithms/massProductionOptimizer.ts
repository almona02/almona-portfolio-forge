/**
 * Mass Production Optimizer
 * ---------------------------------------------------------------------------
 * Cross-project optimization engine that:
 * - Aggregates cutting requirements across many projects
 * - Re-optimizes cutting patterns in "mass production" mode
 * - Uses the centralized RemnantManager to consume remnants first
 * - Produces a UnifiedCuttingPlan with baseline vs mass-mode waste metrics
 *
 * This is designed to be orchestration logic on top of the existing
 * 1D profile optimizers (Genetic / LP / SA) and the DB-backed
 * `RemnantManager` in `src/lib/inventory/RemnantManager.ts`.
 *
 * NOTE:
 *  - Data fetching is injected via the ProjectLoader so this module
 *    stays independent of any specific backend or state store.
 *  - Callers are expected to pass projects that already have a
 *    single-project optimization result attached (baseline).
 */

import type {
  WindowUnit,
  OptimizationResult,
  CuttingPlan,
  Cut,
  Profile,
} from '@/types/fabricator';
import type { OptimizationOptions } from '@/integrations/cnc/CNCController';
import {
  remnantManager,
  type RemnantOptimizationResult,
} from '@/lib/inventory/RemnantManager';
import { GeneticOptimizer } from './geneticOptimization';

// ---------------------------------------------------------------------------
// Base Optimizer Abstraction
// ---------------------------------------------------------------------------

export interface OptimizationTiming {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
}

/**
 * Lightweight base optimizer for shared timing / logging behaviour.
 * Can be extended later to support telemetry, cancellation, etc.
 */
export abstract class BaseOptimizer<_TOptions = unknown> {
  readonly name: string;

  protected constructor(name: string) {
    this.name = name;
  }

  protected startTiming(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  protected finishTiming(start: number): OptimizationTiming {
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      startedAt: start,
      finishedAt: end,
      durationMs: end - start,
    };
  }

  // Every optimizer must expose a human-readable description of what it did.
  abstract getLastRunSummary(): string | null;
}

// ---------------------------------------------------------------------------
// Unified Cutting Plan Output Types
// ---------------------------------------------------------------------------

export interface ProjectWasteSummary {
  projectId: string;
  baselineWastePercentage: number;
  baselineTotalWaste: number;
  baselineTotalStockLength: number;
}

export interface RemnantUsageDetail {
  remnantId: string;
  sourceProjectId?: string;
  usedInProjectIds: string[];
  totalUsedLength: number;
  remnantLength: number;
  utilization: number; // 0-100
  wasteLength: number;
}

export interface RemnantUsageByProject {
  projectId: string;
  remnantCount: number;
  totalUsedLength: number;
}

export interface UnifiedCuttingPlan {
  /**
   * All projects that participated in this optimization run.
   */
  projectIds: string[];

  /**
   * Final cutting plan after mass-mode optimization + remnant usage.
   * This is what should be sent to machines / reports.
   */
  finalCuttingPlan: CuttingPlan[];

  /**
   * Optional intermediate plan before remnant optimization, useful
   * for diagnostics and benchmarking.
   */
  massModeCuttingPlan?: CuttingPlan[];

  /**
   * Waste metrics (all percentages are 0–100).
   */
  baselineWastePercentage: number;
  massModeWastePercentage: number;
  finalWastePercentage: number;
  improvementVsBaselinePercentage: number;

  /**
   * Baseline waste per project for validation / reporting.
   */
  projectWasteSummaries: ProjectWasteSummary[];

  /**
   * Detailed cross-project remnant usage information.
   */
  remnantUsage: {
    byRemnantId: RemnantUsageDetail[];
    byProjectId: Record<string, RemnantUsageByProject>;
    summary: {
      totalRemnantsUsed: number;
      totalRemnantLength: number;
      totalUsedLength: number;
      averageRemnantUtilization: number;
      remnantUtilizationFromManager: number;
    };
  };

  /**
   * Timing and configuration metadata for the run.
   */
  metadata: {
    generatedAt: string;
    timing: OptimizationTiming;
    options: OptimizationOptions;
  };
}

// ---------------------------------------------------------------------------
// Helper Types
// ---------------------------------------------------------------------------

export type ProjectLoader = (projectIds: string[]) => Promise<WindowUnit[]>;

export interface MassProductionOptimizerConfig {
  /**
   * Function that loads WindowUnit projects given their IDs.
   * This allows MassProductionOptimizer to remain independent of
   * any particular backend (Supabase, REST, local store, etc.).
   */
  projectLoader: ProjectLoader;

  /**
   * Either the explicit userId for remnant operations, or a function
   * that can resolve it lazily (e.g. via Supabase auth).
   */
  userId: string | (() => Promise<string>);

  /**
   * Custom RemnantManager instance. Defaults to the shared singleton.
   */
  remnantManagerInstance?: typeof remnantManager;

  /**
   * Safety cap for number of projects in one mass-production run.
   * Default: 100.
   */
  maxProjects?: number;
}

interface WasteStats {
  totalWaste: number;
  totalStockLength: number;
  wastePercentage: number;
}

// ---------------------------------------------------------------------------
// MassProductionOptimizer Implementation
// ---------------------------------------------------------------------------

export class MassProductionOptimizer extends BaseOptimizer<OptimizationOptions> {
  private readonly projectLoader: ProjectLoader;
  private readonly getUserId: () => Promise<string>;
  private readonly remnantManager: typeof remnantManager;
  private readonly maxProjects: number;
  private lastRunSummary: string | null = null;

  constructor(config: MassProductionOptimizerConfig) {
    super('MassProductionOptimizer');

    this.projectLoader = config.projectLoader;
    this.remnantManager = config.remnantManagerInstance ?? remnantManager;
    this.maxProjects = config.maxProjects ?? 100;

    if (typeof config.userId === 'string') {
      const uid = config.userId;
      this.getUserId = async () => uid;
    } else {
      this.getUserId = config.userId;
    }
  }

  /**
   * Core entrypoint:
   * - Loads all requested projects
   * - Validates that each has a baseline single-project optimization
   * - Aggregates cuts across projects by profile
   * - Runs GA-based 1D optimization in mass mode
   * - Pushes the resulting cutting plan through RemnantManager.optimizeWithRemnants
   * - Returns a UnifiedCuttingPlan with baseline vs final waste metrics
   */
  async optimizeAcrossProjects(
    projectIds: string[],
    options: OptimizationOptions,
  ): Promise<UnifiedCuttingPlan> {
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      throw new Error('optimizeAcrossProjects requires at least one projectId');
    }

    if (projectIds.length > this.maxProjects) {
      throw new Error(
        `MassProductionOptimizer: requested ${projectIds.length} projects, ` +
          `which exceeds the configured maxProjects limit of ${this.maxProjects}.`,
      );
    }

    const startTime = this.startTiming();

    try {
      // ---------------------------------------------------------------------
      // 0. Load and validate projects
      // ---------------------------------------------------------------------

      const projects = await this.projectLoader(projectIds);
      if (!projects || projects.length === 0) {
        throw new Error('MassProductionOptimizer: projectLoader returned no projects.');
      }

      // Ensure all requested IDs were resolved
      const loadedIds = new Set(projects.map((p) => p.id));
      const missing = projectIds.filter((id) => !loadedIds.has(id));
      if (missing.length > 0) {
        throw new Error(
          `MassProductionOptimizer: projectLoader did not return projects for ids: ${missing.join(
            ', ',
          )}`,
        );
      }

      // -------------------------------------------------------------------
      // 1. Baseline stats from existing single-project optimizations
      // -------------------------------------------------------------------

      const projectWasteSummaries: ProjectWasteSummary[] = [];
      let baselineTotalWaste = 0;
      let baselineTotalStockLength = 0;

      for (const project of projects) {
        const optimization: OptimizationResult | null = project.optimization;
        if (
          !optimization ||
          !optimization.cuttingPlan ||
          optimization.cuttingPlan.length === 0
        ) {
          throw new Error(
            `MassProductionOptimizer: project "${project.id}" is missing baseline optimization. ` +
              'Run single-project optimization first.',
          );
        }

        const stats = this.computeWasteStats(optimization.cuttingPlan);
        baselineTotalWaste += stats.totalWaste;
        baselineTotalStockLength += stats.totalStockLength;

        projectWasteSummaries.push({
          projectId: project.id,
          baselineWastePercentage: stats.wastePercentage,
          baselineTotalWaste: stats.totalWaste,
          baselineTotalStockLength: stats.totalStockLength,
        });
      }

      const baselineWastePercentage =
        baselineTotalStockLength > 0 ? (baselineTotalWaste / baselineTotalStockLength) * 100 : 0;

      // -------------------------------------------------------------------
      // 2. Aggregate cuts across projects by profile & run GA in mass-mode
      // -------------------------------------------------------------------

      const {
        aggregatedPlans,
        componentToProjectMap,
      } = this.aggregateCutsAcrossProjects(projects);

      const massModePlans: CuttingPlan[] = [];

      for (const { profile, stockLength, cuts } of aggregatedPlans.values()) {
        if (cuts.length === 0) continue;

        // For mass-mode we keep GA configuration conservative to stay well
        // under the 2-minute SLA even for 50+ projects.
        const optimizer = new GeneticOptimizer(cuts, profile, stockLength, {
          populationSize: 60,
          generations: 40,
          mutationRate: 0.12,
          crossoverRate: 0.8,
          elitismCount: 5,
          tournamentSize: 5,
        });

        const optimizedForProfile = optimizer.optimize();
        massModePlans.push(...optimizedForProfile);
      }

      const massModeStats = this.computeWasteStats(massModePlans);

      // -------------------------------------------------------------------
      // 3. Push mass-mode plan through RemnantManager.optimizeWithRemnants
      // -------------------------------------------------------------------

      const userId = await this.getUserId();

      const remnantResult = await this.remnantManager.optimizeWithRemnants(
        userId,
        massModePlans,
        {
          useRemnantsFirst: options.allowRemnantUsage,
          // Bias utilisation/waste thresholds to align with MinimizeWaste preference.
          minUtilization: options.minimizeWaste ? 80 : 65,
          maxWastePercentage: options.minimizeWaste ? 18 : 30,
        },
      );

      const finalPlans = remnantResult.newStockRequired;
      const finalStats = this.computeWasteStats(finalPlans);

      // -------------------------------------------------------------------
      // 4. Build cross-project remnant usage tracking
      // -------------------------------------------------------------------

      const remnantUsageDetails = this.buildRemnantUsageDetails(
        remnantResult,
        componentToProjectMap,
      );

      const timing = this.finishTiming(startTime);

      const improvementVsBaseline =
        baselineWastePercentage > 0
          ? ((baselineWastePercentage - finalStats.wastePercentage) / baselineWastePercentage) * 100
          : 0;

      this.lastRunSummary =
        `MassProductionOptimizer completed for ${projectIds.length} project(s) in ` +
        `${timing.durationMs.toFixed(0)}ms. ` +
        `Baseline waste: ${baselineWastePercentage.toFixed(2)}%, ` +
        `mass-mode (pre-remnant): ${massModeStats.wastePercentage.toFixed(2)}%, ` +
        `final (with remnants): ${finalStats.wastePercentage.toFixed(2)}% ` +
        `(improvement vs baseline: ${improvementVsBaseline.toFixed(2)}%).`;

      const unifiedPlan: UnifiedCuttingPlan = {
        projectIds: [...projectIds],
        finalCuttingPlan: finalPlans,
        massModeCuttingPlan: massModePlans,
        baselineWastePercentage,
        massModeWastePercentage: massModeStats.wastePercentage,
        finalWastePercentage: finalStats.wastePercentage,
        improvementVsBaselinePercentage: improvementVsBaseline,
        projectWasteSummaries,
        remnantUsage: remnantUsageDetails,
        metadata: {
          generatedAt: new Date().toISOString(),
          timing,
          options,
        },
      };

      return unifiedPlan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // eslint-disable-next-line no-console
      console.error('[MassProductionOptimizer] optimizeAcrossProjects failed', {
        projectCount: projectIds.length,
        projectIdsSample: projectIds.slice(0, 10),
        message: err.message,
        stack: err.stack,
      });

      this.lastRunSummary = `MassProductionOptimizer failed for ${projectIds.length} project(s): ${err.message}`;

      throw err;
    }
  }

  getLastRunSummary(): string | null {
    return this.lastRunSummary;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private computeWasteStats(plans: CuttingPlan[]): WasteStats {
    let totalWaste = 0;
    let totalStockLength = 0;

    for (const plan of plans) {
      totalWaste += plan.totalWaste;
      totalStockLength += plan.stockLength;
    }

    const wastePercentage =
      totalStockLength > 0 ? (totalWaste / totalStockLength) * 100 : 0;

    return {
      totalWaste,
      totalStockLength,
      wastePercentage,
    };
  }

  /**
   * Aggregate all cuts across the provided projects, grouping by profile ID.
   * Also returns a map from componentId → projectId for cross-project
   * remnant usage tracking.
   */
  private aggregateCutsAcrossProjects(projects: WindowUnit[]): {
    aggregatedPlans: Map<
      string,
      {
        profile: Profile;
        stockLength: number;
        cuts: Cut[];
      }
    >;
    componentToProjectMap: Map<string, string>;
  } {
    const aggregatedPlans = new Map<
      string,
      {
        profile: Profile;
        stockLength: number;
        cuts: Cut[];
      }
    >();

    const componentToProjectMap = new Map<string, string>();

    // Global hard safety limit for profile stock length in mm.
    const MAX_STOCK_LENGTH_MM = 8000;

    for (const project of projects) {
      const optimization = project.optimization as OptimizationResult;

      for (const plan of optimization.cuttingPlan) {
        const profileId = plan.profile.id;
        const stockLength = Math.min(plan.stockLength, MAX_STOCK_LENGTH_MM);

        let entry = aggregatedPlans.get(profileId);
        if (!entry) {
          entry = {
            profile: plan.profile,
            stockLength,
            cuts: [],
          };
          aggregatedPlans.set(profileId, entry);
        }

        for (const cut of plan.cuts) {
          entry.cuts.push(cut);
          // Track which project this cut/component belongs to.
          if (!componentToProjectMap.has(cut.componentId)) {
            componentToProjectMap.set(cut.componentId, project.id);
          }
        }
      }
    }

    return { aggregatedPlans, componentToProjectMap };
  }

  /**
   * Convert RemnantManager's optimization result into rich cross-project
   * remnant usage analytics, keyed both by remnantId and by projectId.
   */
  private buildRemnantUsageDetails(
    remnantResult: RemnantOptimizationResult,
    componentToProjectMap: Map<string, string>,
  ): UnifiedCuttingPlan['remnantUsage'] {
    const byRemnantId: RemnantUsageDetail[] = [];
    const byProjectId: Record<string, RemnantUsageByProject> = {};

    let totalRemnantLength = 0;
    let totalUsedLength = 0;

    for (const match of remnantResult.usedRemnants) {
      const { remnant, cuts } = match;
      const totalCutLength = cuts.reduce((sum, c) => sum + c.length, 0);
      const utilization =
        remnant.length > 0 ? (totalCutLength / remnant.length) * 100 : 0;
      const wasteLength = Math.max(remnant.length - totalCutLength, 0);

      totalRemnantLength += remnant.length;
      totalUsedLength += totalCutLength;

      const usedInProjectIds = Array.from(
        new Set(
          cuts
            .map((c) => componentToProjectMap.get(c.componentId))
            .filter((id): id is string => Boolean(id)),
        ),
      );

      byRemnantId.push({
        remnantId: remnant.id,
        sourceProjectId: remnant.sourceProjectId,
        usedInProjectIds,
        totalUsedLength: totalCutLength,
        remnantLength: remnant.length,
        utilization,
        wasteLength,
      });

      for (const projectId of usedInProjectIds) {
        if (!byProjectId[projectId]) {
          byProjectId[projectId] = {
            projectId,
            remnantCount: 0,
            totalUsedLength: 0,
          };
        }
        byProjectId[projectId].remnantCount += 1;

        // Approximate allocation of used length to project:
        const projectCutLengthForThisRemnant = cuts
          .filter((c) => componentToProjectMap.get(c.componentId) === projectId)
          .reduce((sum, c) => sum + c.length, 0);

        byProjectId[projectId].totalUsedLength += projectCutLengthForThisRemnant;
      }
    }

    const averageRemnantUtilization =
      totalRemnantLength > 0 ? (totalUsedLength / totalRemnantLength) * 100 : 0;

    return {
      byRemnantId,
      byProjectId,
      summary: {
        totalRemnantsUsed: remnantResult.usedRemnants.length,
        totalRemnantLength,
        totalUsedLength,
        averageRemnantUtilization,
        remnantUtilizationFromManager: remnantResult.remnantUtilization,
      },
    };
  }
}


