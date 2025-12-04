/**
 * Unified optimizer wrapper for cutting optimization.
 *
 * This is intentionally thin: it delegates to the existing
 * `smartOptimizeCutting` implementation in `pythonHeavyClient`
 * and simply annotates the result with routing metadata.
 *
 * Behaviour for existing callers that expect the `{ mode, python | local }`
 * shape is preserved – we just add a `routing` field.
 */

import {
  type HeavyOptimizationRequest,
  type HeavyOptimizationResponse,
  type LocalOptimizationResult,
  smartOptimizeCutting,
} from './pythonHeavyClient';

export type OptimizationRequest = HeavyOptimizationRequest;

export type OptimizationResult =
  | { mode: 'python'; python: HeavyOptimizationResponse }
  | { mode: 'local'; local: LocalOptimizationResult };

export interface RoutingInfo {
  engine: 'python' | 'local';
  reason: string;
  timestamp: string;
}

export type UnifiedOptimizationResult = OptimizationResult & {
  routing: RoutingInfo;
};

/**
 * Unified optimize entrypoint.
 *
 * - Uses the existing smartOptimizeCutting logic for routing between
 *   Python and local fallback.
 * - Adds a lightweight `routing` object describing which path was used.
 * - Does NOT change the underlying optimisation behaviour.
 */
export async function unifiedOptimize(
  req: OptimizationRequest,
): Promise<UnifiedOptimizationResult> {
  const totalCuts = req.cuts.reduce((sum, c) => sum + c.quantity, 0);
  const timestamp = new Date().toISOString();

  const baseResult = await smartOptimizeCutting(req);

  if (baseResult.mode === 'python') {
    return {
      ...baseResult,
      routing: {
        engine: 'python',
        reason:
          totalCuts >= 40
            ? 'Python backend used for heavy optimisation'
            : 'Python backend used via smart routing',
        timestamp,
      },
    };
  }

  return {
    ...baseResult,
    routing: {
      engine: 'local',
      reason:
        totalCuts < 40
          ? 'Local greedy optimiser used for small job'
          : 'Local greedy optimiser used as fallback',
      timestamp,
    },
  };
}


