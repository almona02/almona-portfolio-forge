/**
 * Admin hardener verification / override RPCs (fail-closed server-side).
 */

import { supabase } from '@/lib/supabase';

type RpcClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

const rpc = () => supabase as unknown as RpcClient;

export type HardenerCompatibilityCheck = {
  check: string;
  passed: boolean;
  detail?: string;
};

/** Full named compatibility-check set required server-side (#68). */
export const HARDENER_REQUIRED_COMPATIBILITY_CHECKS = [
  'system_profile',
  'material',
  'glass_thickness',
  'sash_dimensions',
  'sash_weight',
  'opening_type',
] as const;

export type HardenerRequiredCheckName =
  (typeof HARDENER_REQUIRED_COMPATIBILITY_CHECKS)[number];

export function assertFullHardenerCompatibilityChecks(
  checks: HardenerCompatibilityCheck[] | undefined,
): HardenerCompatibilityCheck[] {
  if (!checks?.length) {
    throw new Error('compatibility checks required (empty rejected)');
  }
  const byName = new Map(checks.map((c) => [c.check, c]));
  for (const name of HARDENER_REQUIRED_COMPATIBILITY_CHECKS) {
    const row = byName.get(name);
    if (!row || typeof row.passed !== 'boolean') {
      throw new Error(`compatibility check "${name}" required`);
    }
  }
  return HARDENER_REQUIRED_COMPATIBILITY_CHECKS.map((name) => byName.get(name)!);
}

export async function requestHardenerVerification(input: {
  positionId: string;
  expectedRevision: number;
  proposedHardenerCode: string;
  engineeringEvidence?: Record<string, unknown>;
  compatibilityChecks?: HardenerCompatibilityCheck[];
  missingEvidence?: string[];
  openingType?: string | null;
  material?: string | null;
  glassThicknessMm?: number | null;
  sashWidthMm?: number | null;
  sashHeightMm?: number | null;
  sashWeightKg?: number | null;
}): Promise<{ ok: true; proposalId: string } | { ok: false; error: string }> {
  let checks: HardenerCompatibilityCheck[];
  try {
    checks = assertFullHardenerCompatibilityChecks(input.compatibilityChecks);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'invalid checks' };
  }
  const evidence = input.engineeringEvidence ?? {};
  if (
    Object.keys(evidence).length < 2 ||
    (!(evidence.method || evidence.calc) || !(evidence.reference || evidence.source))
  ) {
    return { ok: false, error: 'engineering evidence incomplete (need method/reference fields)' };
  }
  const { data, error } = await rpc().rpc('request_fabricator_hardener_verification', {
    p_position_id: input.positionId,
    p_expected_revision: input.expectedRevision,
    p_proposed_hardener_code: input.proposedHardenerCode,
    p_engineering_evidence: evidence,
    p_compatibility_checks: checks,
    p_missing_evidence: input.missingEvidence ?? [],
    p_opening_type: input.openingType ?? null,
    p_material: input.material ?? null,
    p_glass_thickness_mm: input.glassThicknessMm ?? null,
    p_sash_width_mm: input.sashWidthMm ?? null,
    p_sash_height_mm: input.sashHeightMm ?? null,
    p_sash_weight_kg: input.sashWeightKg ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, proposalId: String(data) };
}

export async function adminReviewHardener(
  proposalId: string,
  decision: 'approve' | 'reject',
  notes?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await rpc().rpc('admin_review_fabricator_hardener', {
    p_proposal_id: proposalId,
    p_decision: decision,
    p_notes: notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminOverrideHardener(input: {
  proposalId: string;
  hardenerCode: string;
  reason: string;
  supportingEvidence: Record<string, unknown>;
  scope?: 'position' | 'project' | 'system_pack';
}): Promise<{ ok: true; overrideId: string } | { ok: false; error: string }> {
  const { data, error } = await rpc().rpc('admin_override_fabricator_hardener', {
    p_proposal_id: input.proposalId,
    p_hardener_code: input.hardenerCode,
    p_reason: input.reason,
    p_supporting_evidence: input.supportingEvidence,
    p_scope: input.scope ?? 'position',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, overrideId: String(data) };
}

export async function adminRevokeHardener(
  proposalId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await rpc().rpc('admin_revoke_fabricator_hardener', {
    p_proposal_id: proposalId,
    p_reason: reason,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listHardenerProposals(
  status = 'pending',
): Promise<{ ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string }> {
  const { data, error } = await rpc().rpc('admin_list_hardener_proposals', {
    p_status: status,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: Array.isArray(data) ? (data as Record<string, unknown>[]) : [] };
}
