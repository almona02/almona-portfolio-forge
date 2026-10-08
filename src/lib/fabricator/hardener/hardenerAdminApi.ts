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
  const { data, error } = await rpc().rpc('request_fabricator_hardener_verification', {
    p_position_id: input.positionId,
    p_expected_revision: input.expectedRevision,
    p_proposed_hardener_code: input.proposedHardenerCode,
    p_engineering_evidence: input.engineeringEvidence ?? {},
    p_compatibility_checks: input.compatibilityChecks ?? [],
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
