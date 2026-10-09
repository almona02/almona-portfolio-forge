/**
 * Client-side mirror of server validate_optimization_evidence_payload.
 * AICS-001: deterministic structural checks only.
 */

export interface OptimizationEvidencePayload {
  schema: 'almona.optimization-result';
  schemaVersion: number;
  materialUsage?: number;
  wastePercentage?: number;
  nestingEfficiency?: number;
  cutCount?: number;
  cuttingPlan: Array<{
    stockLength?: number;
    stockLengthMm?: number;
    profile?: { id?: string };
    profileId?: string;
    cuts?: Array<{ cutId?: string; componentId?: string; length?: number; angle?: number }>;
  }>;
}

export type EvidenceValidationResult =
  | { ok: true; serverCutCount: number; placementCanonical: string }
  | { ok: false; error: string };

export function canonicalizeOptimizationPlacement(payload: OptimizationEvidencePayload): string {
  const parts = (payload.cuttingPlan ?? []).map((plan) => {
    const stock = String(plan.stockLength ?? plan.stockLengthMm ?? '');
    const profile = plan.profile?.id ?? plan.profileId ?? '';
    const cuts = [...(plan.cuts ?? [])]
      .map((cut, index) =>
        [cut.cutId ?? cut.componentId ?? String(index), String(cut.length ?? ''), String(cut.angle ?? 0)].join(':'),
      )
      .sort();
    return [profile, stock, cuts.join(',')].join('|');
  });
  return parts.sort().join(';');
}

export function validateOptimizationEvidencePayload(
  payload: unknown,
  cutCount: number,
): EvidenceValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'evidence payload must be a JSON object' };
  }
  const body = payload as Partial<OptimizationEvidencePayload>;
  if (body.schema !== 'almona.optimization-result') {
    return { ok: false, error: 'evidence payload schema must be almona.optimization-result' };
  }
  if (!Number.isInteger(body.schemaVersion) || (body.schemaVersion ?? 0) < 1) {
    return { ok: false, error: 'evidence payload schemaVersion must be >= 1' };
  }
  if (!Array.isArray(body.cuttingPlan) || body.cuttingPlan.length === 0) {
    return { ok: false, error: 'evidence payload cuttingPlan required' };
  }

  let serverCutCount = 0;
  for (let i = 0; i < body.cuttingPlan.length; i += 1) {
    const plan = body.cuttingPlan[i];
    const stock = Number(plan.stockLength ?? plan.stockLengthMm ?? NaN);
    if (!Number.isFinite(stock) || stock <= 0) {
      return { ok: false, error: `cuttingPlan[${i}] stockLength must be positive` };
    }
    if (!Array.isArray(plan.cuts) || plan.cuts.length === 0) {
      return { ok: false, error: `cuttingPlan[${i}] has no placed cuts` };
    }
    let sum = 0;
    for (let j = 0; j < plan.cuts.length; j += 1) {
      const length = Number(plan.cuts[j]?.length ?? NaN);
      if (!Number.isFinite(length) || length <= 0) {
        return { ok: false, error: `cuttingPlan[${i}].cuts[${j}] length missing or non-positive` };
      }
      sum += length;
      serverCutCount += 1;
    }
    if (sum > stock) {
      return {
        ok: false,
        error: `cuttingPlan[${i}] stock overrun (placed ${sum} mm > stock ${stock} mm)`,
      };
    }
  }

  if (serverCutCount <= 0) {
    return { ok: false, error: 'no placed cuts in evidence payload' };
  }
  if (cutCount !== serverCutCount) {
    return { ok: false, error: `cut_count mismatch (client ${cutCount}, server ${serverCutCount})` };
  }

  const placementCanonical = canonicalizeOptimizationPlacement(body as OptimizationEvidencePayload);
  if (placementCanonical.length < 8) {
    return { ok: false, error: 'placement canonicalization failed' };
  }

  return { ok: true, serverCutCount, placementCanonical };
}

/** Async SHA-256 hex for placement binding (browser + node). */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node fallback for Vitest
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}
