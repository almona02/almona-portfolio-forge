import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Types for heavy cutting optimization against the Python backend.
 * These are intentionally generic so multiple components can reuse them.
 */

export type OptimizationObjective =
  | 'minimize_waste'
  | 'minimize_cost'
  | 'minimize_bars'
  | 'minimize_setup'
  | 'balanced';

export interface HeavyCutInput {
  id: string;
  lengthMm: number;
  quantity: number;
  priority?: number;
  profileId?: string;
  allowDefects?: boolean;
}

export interface HeavyStockInput {
  id: string;
  lengthMm: number;
  quantity: number;
  costPerUnit?: number;
  isRemnant?: boolean;
  profileId?: string;
}

export interface HeavyOptimizationRequest {
  cuts: HeavyCutInput[];
  stock: HeavyStockInput[];
  objective?: OptimizationObjective;
  kerfWidthMm?: number;
  minUsableRemnantMm?: number;
  timeLimitSeconds?: number;
  workshopId?: string;
  projectIds?: string[];
}

export interface HeavyOptimizationMetrics {
  total_waste_mm: number;
  total_cost: number;
  utilization_percent: number;
  patterns_count: number;
}

export interface HeavyOptimizationResponse {
  assignments: Array<{
    cut_id: string;
    bar_id: string;
    position: number;
    length: number;
  }>;
  bars_used: Record<string, number>;
  metrics: HeavyOptimizationMetrics;
  solve_time_ms: number;
  solver_status: string;
  computed_in: string;
  engine: string;
  egyptian_context: {
    workshop_id?: string | null;
    project_ids: string[];
    optimized_for_egypt: boolean;
    notes?: string;
  };
}

/**
 * Job status response from async endpoints
 */
export interface JobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  message?: string;
  result?: HeavyOptimizationResponse;
  error?: string;
  estimated_time_seconds?: number;
  completed_at?: string;
  processing_time_seconds?: number;
}

/**
 * Enqueue heavy cutting optimization job for async processing.
 * Returns immediately with job_id for status tracking.
 */
export async function enqueueCuttingOptimization(
  req: HeavyOptimizationRequest,
): Promise<{ job_id: string; estimated_time_seconds: number }> {
  const payload = {
    cuts: req.cuts.map((c) => ({
      id: c.id,
      length_mm: c.lengthMm,
      quantity: c.quantity,
      priority: c.priority ?? 1,
      profile_id: c.profileId ?? null,
      allow_defects: c.allowDefects ?? false,
    })),
    stock: req.stock.map((s) => ({
      id: s.id,
      length_mm: s.lengthMm,
      quantity: s.quantity,
      cost_per_unit: s.costPerUnit ?? 0,
      is_remnant: s.isRemnant ?? false,
      profile_id: s.profileId ?? null,
    })),
    objective: req.objective ?? 'balanced',
    kerf_width_mm: req.kerfWidthMm ?? 3,
    min_usable_remnant_mm: req.minUsableRemnantMm ?? 100,
    time_limit_seconds: req.timeLimitSeconds ?? 30,
    workshop_id: req.workshopId ?? null,
    project_ids: req.projectIds ?? [],
  };

  const res = await fetch('/api/v2/heavy/optimize/cutting', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text || `Failed to enqueue optimization job: HTTP ${res.status}`,
    );
  }

  const data = await res.json();
  return {
    job_id: data.job_id,
    estimated_time_seconds: data.estimated_time_seconds || 30
  };
}

/**
 * Check status of optimization job
 */
export async function getOptimizationJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`/api/v2/heavy/job/${jobId}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Job ${jobId} not found`);
    }
    const text = await res.text();
    throw new Error(text || `Failed to get job status: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Wait for job completion using Supabase Realtime (recommended)
 * This provides instant updates without polling
 */
export async function waitForOptimizationJobRealtime(
  jobId: string,
  timeoutMs: number = 120000 // 2 minutes default
): Promise<HeavyOptimizationResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Subscribe to job status changes
    const subscription = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const job = payload.new;

          if (job.status === 'completed' && job.result_data) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(job.result_data);
          } else if (job.status === 'failed') {
            clearTimeout(timeout);
            subscription.unsubscribe();
            reject(new Error(job.error_message || 'Optimization job failed'));
          }
        }
      )
      .subscribe();

    // Check initial status
    getOptimizationJobStatus(jobId).then(status => {
      if (status.status === 'completed' && status.result) {
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve(status.result);
      } else if (status.status === 'failed') {
        clearTimeout(timeout);
        subscription.unsubscribe();
        reject(new Error(status.error || 'Optimization job failed'));
      }
    }).catch(err => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      reject(err);
    });
  });
}

/**
 * Poll for job completion with timeout (fallback method)
 * @deprecated Use waitForOptimizationJobRealtime instead for instant updates
 */
export async function waitForOptimizationJob(
  jobId: string,
  timeoutMs: number = 120000, // 2 minutes default
  pollIntervalMs: number = 2000 // poll every 2 seconds
): Promise<HeavyOptimizationResponse> {
  console.warn('waitForOptimizationJob is deprecated. Use waitForOptimizationJobRealtime for instant updates.');

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getOptimizationJobStatus(jobId);

    if (status.status === 'completed' && status.result) {
      return status.result;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Optimization job failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
}

/**
 * Legacy function for backward compatibility - now uses async flow
 * @deprecated Use enqueueCuttingOptimization + waitForOptimizationJob instead
 */
export async function optimizeCuttingHeavy(
  req: HeavyOptimizationRequest,
): Promise<HeavyOptimizationResponse> {
  console.warn('optimizeCuttingHeavy is deprecated. Use enqueueCuttingOptimization + waitForOptimizationJob for better UX.');

  const { job_id } = await enqueueCuttingOptimization(req);
  return await waitForOptimizationJob(job_id);
}

/**
 * Lightweight local greedy fallback for environments where the Python backend
 * is unreachable. This is intentionally simple and safe for browser execution.
 */
export interface LocalPlan {
  barId: string;
  barLength: number;
  cuts: HeavyCutInput[];
  usedLength: number;
  wasteLength: number;
  utilization: number;
  isRemnant: boolean;
}

export interface LocalOptimizationResult {
  plans: LocalPlan[];
  metrics: {
    totalWaste: number;
    totalCost: number;
    overallUtilization: number;
    stockPiecesUsed: number;
  };
}

export function runLocalGreedyFallback(
  cuts: HeavyCutInput[],
  stock: HeavyStockInput[],
): LocalOptimizationResult {
  const expandedCuts: HeavyCutInput[] = [];
  cuts.forEach((c) => {
    for (let i = 0; i < c.quantity; i += 1) {
      expandedCuts.push({ ...c, quantity: 1 });
    }
  });

  // Sort by length descending as a basic FFD heuristic
  expandedCuts.sort((a, b) => b.lengthMm - a.lengthMm);

  const plans: LocalPlan[] = [];
  const kerf = 3;

  const allBars: HeavyStockInput[] = [];
  stock.forEach((s) => {
    for (let i = 0; i < s.quantity; i += 1) {
      allBars.push({ ...s, id: `${s.id}#${i + 1}`, quantity: 1 });
    }
  });

  for (const bar of allBars) {
    const assigned: HeavyCutInput[] = [];
    let used = 0;

    for (const cut of expandedCuts) {
      if (cut.quantity === 0) continue;
      const required = cut.lengthMm + (assigned.length > 0 ? kerf : 0);
      if (used + required <= bar.lengthMm) {
        assigned.push(cut);
        used += required;
        // mark this instance as used by setting quantity to 0
        cut.quantity = 0;
      }
    }

    if (assigned.length > 0) {
      const waste = bar.lengthMm - used;
      const utilization = used / bar.lengthMm;
      plans.push({
        barId: bar.id,
        barLength: bar.lengthMm,
        cuts: assigned,
        usedLength: used,
        wasteLength: waste,
        utilization,
        isRemnant: !!bar.isRemnant,
      });
    }
  }

  const totalWaste = plans.reduce((sum, p) => sum + p.wasteLength, 0);
  const totalUsed = plans.reduce((sum, p) => sum + p.usedLength, 0);
  const totalStock = plans.reduce((sum, p) => sum + p.barLength, 0);
  const overallUtilization =
    totalStock > 0 ? (totalUsed / totalStock) * 100 : 0;
  const totalCost = plans.reduce((sum, p) => {
    const base = stock.find((s) => p.barId.startsWith(s.id));
    return sum + (base?.costPerUnit ?? 0);
  }, 0);

  return {
    plans,
    metrics: {
      totalWaste,
      totalCost,
      overallUtilization,
      stockPiecesUsed: plans.length,
    },
  };
}

/**
 * Smart router: decides whether to use Python backend or local fallback
 * based on workload size and backend availability.
 */
export async function smartOptimizeCutting(
  req: HeavyOptimizationRequest,
): Promise<
  | { mode: 'python'; python: HeavyOptimizationResponse }
  | { mode: 'local'; local: LocalOptimizationResult }
> {
  const totalCuts = req.cuts.reduce((sum, c) => sum + c.quantity, 0);

  // For tiny jobs, stay local to avoid roundtrip
  if (totalCuts < 40) {
    const local = runLocalGreedyFallback(req.cuts.map((c) => ({ ...c })), req.stock);
    return { mode: 'local', local };
  }

  // Try Python backend first
  try {
    const python = await optimizeCuttingHeavy(req);
    return { mode: 'python', python };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Python optimization failed';
    toast({
      title: 'Heavy optimization backend unavailable',
      description: `${message}. Falling back to browser-based optimizer.`,
      variant: 'destructive',
    });

    const local = runLocalGreedyFallback(req.cuts.map((c) => ({ ...c })), req.stock);
    return { mode: 'local', local };
  }
}


