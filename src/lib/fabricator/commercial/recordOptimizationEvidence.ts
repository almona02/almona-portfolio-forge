/**
 * #67 — Persist server-stamped optimization evidence (convert gate reads this, not client JSON).
 */

import { fingerprintBom } from '@/lib/fabricator/positionRelease';
import { resolveManufacturingAuthority } from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { supabase } from '@/lib/supabase';
import type { OptimizationResult } from '@/types/fabricator';
import {
  sha256Hex,
  validateOptimizationEvidencePayload,
  type OptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

export interface RecordOptimizationEvidenceInput {
  positionId: string;
  expectedRevision: number;
  designRevision: number;
  bom: CompleteBOM | null;
  optimizationResult: OptimizationResult;
  ruleVersion?: string | null;
}

export type RecordOptimizationEvidenceResult =
  | { ok: true; positionId: string }
  | { ok: false; error: string };

type RpcClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

function countCuts(result: OptimizationResult): number {
  return (result.cuttingPlan ?? []).reduce((sum, plan) => sum + (plan.cuts?.length ?? 0), 0);
}

function buildEvidencePayload(
  result: OptimizationResult,
  cutCount: number,
): OptimizationEvidencePayload {
  return {
    schema: 'almona.optimization-result',
    schemaVersion: 1,
    materialUsage: result.materialUsage,
    wastePercentage: result.wastePercentage,
    nestingEfficiency: result.nestingEfficiency,
    cutCount,
    cuttingPlan: result.cuttingPlan,
  };
}

/**
 * Calls SECURITY DEFINER record_fabricator_optimization_evidence.
 * Direct owner writes to positions_v2.optimization do not create convert-eligible evidence.
 */
export async function recordOptimizationEvidence(
  input: RecordOptimizationEvidenceInput,
): Promise<RecordOptimizationEvidenceResult> {
  if (!input.positionId) {
    return { ok: false, error: 'Position id is required.' };
  }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    return { ok: false, error: 'Positive expected revision is required.' };
  }
  if (!Number.isInteger(input.designRevision) || input.designRevision < 1) {
    return { ok: false, error: 'Positive design revision is required.' };
  }

  const cutCount = countCuts(input.optimizationResult);
  if (cutCount <= 0) {
    return { ok: false, error: 'Optimization produced no cuts to validate.' };
  }

  const evidencePayload = buildEvidencePayload(input.optimizationResult, cutCount);
  const structural = validateOptimizationEvidencePayload(evidencePayload, cutCount);
  if (!structural.ok) {
    return { ok: false, error: structural.error };
  }

  const placementFingerprint = await sha256Hex(structural.placementCanonical);
  const bomFp = fingerprintBom(input.bom);
  const ledgerFingerprint = [bomFp, placementFingerprint].filter(Boolean).join('||') || placementFingerprint;

  let systemPackRevision: number;
  let ruleVersion: string;
  try {
    const authority = await resolveManufacturingAuthority(
      input.positionId,
      input.expectedRevision,
    );
    systemPackRevision = Number(authority.systemPack.revision);
    ruleVersion =
      input.ruleVersion?.trim() ||
      input.bom?.qualification?.ruleVersion ||
      authority.cuttingRules.map((r) => `${r.ruleId}:r${r.revision}`).join('|') ||
      '';
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Manufacturing authority unavailable.',
    };
  }

  if (!ruleVersion || ['unspecified', 'unknown', 'n/a'].includes(ruleVersion.toLowerCase())) {
    return { ok: false, error: 'Authoritative rule version is required.' };
  }

  if (!Number.isInteger(systemPackRevision) || systemPackRevision < 1) {
    return { ok: false, error: 'Authority system pack revision is invalid.' };
  }

  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc('record_fabricator_optimization_evidence', {
    p_position_id: input.positionId,
    p_expected_revision: input.expectedRevision,
    p_design_revision: input.designRevision,
    p_ledger_fingerprint: ledgerFingerprint,
    p_system_pack_revision: systemPackRevision,
    p_rule_version: ruleVersion,
    p_cut_count: structural.serverCutCount,
    p_evidence_payload: evidencePayload,
  });

  if (error) {
    return { ok: false, error: error.message || 'Failed to record optimization evidence.' };
  }

  return { ok: true, positionId: String(data ?? input.positionId) };
}
