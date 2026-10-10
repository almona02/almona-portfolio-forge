/**
 * Persist server-stamped optimization evidence (convert gate reads this, not client JSON).
 * schemaVersion 2: design-ledger reconciliation + kerf/trim accounting + authority-bound rules.
 */

import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings';
import { resolveManufacturingAuthority } from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { supabase } from '@/lib/supabase';
import type { OptimizationResult } from '@/types/fabricator';
import {
  approvedRuleContentFingerprint,
  canonicalApprovedRuleVersion,
  sha256Hex,
  validateOptimizationEvidencePayload,
  type EvidenceCutSpec,
  type OptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

export interface RecordOptimizationEvidenceInput {
  positionId: string;
  expectedRevision: number;
  designRevision: number;
  bom: CompleteBOM | null;
  optimizationResult: OptimizationResult;
  ruleVersion?: string | null;
  kerfMm?: number | null;
  trimMm?: number | null;
  /** Optional explicit design ledger; defaults to BOM cuttingLengths. */
  requiredCuts?: EvidenceCutSpec[] | null;
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

export function requiredCutsFromBom(bom: CompleteBOM | null): EvidenceCutSpec[] {
  if (!bom?.profiles?.length) return [];
  return bom.profiles.flatMap((profile) => {
    const profileId = profile.profileCode ?? profile.id ?? '';
    const lengths = profile.cuttingLengths ?? [];
    const angles = profile.angles ?? [];
    return lengths.map((length, index) => ({
      cutId: `${profile.id ?? profileId}:${index}`,
      profileId,
      length: Number(length),
      angle: Number.isFinite(angles[index]) ? Number(angles[index]) : 0,
    }));
  });
}

/** Fallback: treat placed cuts as the design ledger only when BOM has no cuts (tests). */
function requiredCutsFromPlacement(result: OptimizationResult): EvidenceCutSpec[] {
  return (result.cuttingPlan ?? []).flatMap((plan) =>
    (plan.cuts ?? []).map((cut, index) => ({
      cutId: cut.cutId ?? cut.componentId ?? `cut:${index}`,
      profileId: plan.profile?.id ?? '',
      length: Number(cut.length),
      angle: Number.isFinite(cut.angle) ? Number(cut.angle) : 0,
    })),
  );
}

function resolveKerfTrim(
  result: OptimizationResult,
  overrideKerf?: number | null,
  overrideTrim?: number | null,
): { kerfMm: number; trimMm: number } {
  const first = result.cuttingPlan?.[0];
  const kerf = Number(
    overrideKerf ??
      first?.profile?.specifications?.sawKerf ??
      PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm,
  );
  const trim = Number(
    overrideTrim ??
      first?.profile?.specifications?.barEndTrim ??
      PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm,
  );
  return { kerfMm: kerf, trimMm: trim };
}

function buildEvidencePayload(
  result: OptimizationResult,
  cutCount: number,
  requiredCuts: EvidenceCutSpec[],
  kerfMm: number,
  trimMm: number,
): OptimizationEvidencePayload {
  return {
    schema: 'almona.optimization-result',
    schemaVersion: 2,
    materialUsage: result.materialUsage,
    wastePercentage: result.wastePercentage,
    nestingEfficiency: result.nestingEfficiency,
    cutCount,
    kerfMm,
    trimMm,
    requiredCuts,
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

  const fromBom = requiredCutsFromBom(input.bom);
  const requiredCuts =
    input.requiredCuts?.length
      ? input.requiredCuts
      : fromBom.length > 0
        ? fromBom
        : requiredCutsFromPlacement(input.optimizationResult);

  if (requiredCuts.length === 0) {
    return { ok: false, error: 'Design ledger requiredCuts are required.' };
  }

  const { kerfMm, trimMm } = resolveKerfTrim(
    input.optimizationResult,
    input.kerfMm,
    input.trimMm,
  );
  if (!Number.isFinite(kerfMm) || kerfMm < 0 || !Number.isFinite(trimMm) || trimMm < 0) {
    return { ok: false, error: 'kerfMm/trimMm must be non-negative numbers.' };
  }

  const evidencePayload = buildEvidencePayload(
    input.optimizationResult,
    cutCount,
    requiredCuts,
    kerfMm,
    trimMm,
  );
  const structural = validateOptimizationEvidencePayload(evidencePayload, cutCount);
  if (!structural.ok) {
    return { ok: false, error: structural.error };
  }

  const placementFingerprint = await sha256Hex(structural.placementCanonical);
  const designFingerprint = await sha256Hex(structural.designCanonical);
  const ledgerFingerprint = `${designFingerprint}||${placementFingerprint}`;

  let systemPackRevision: number;
  let ruleVersion: string;
  try {
    const authority = await resolveManufacturingAuthority(
      input.positionId,
      input.expectedRevision,
    );
    systemPackRevision = Number(authority.systemPack.revision);
    if (!authority.cuttingRules.length) {
      return { ok: false, error: 'Approved cutting rules are required for rule version.' };
    }
    const authorityRuleVersion = canonicalApprovedRuleVersion(authority.cuttingRules);
    const contentFp = await approvedRuleContentFingerprint(authority.cuttingRules);
    const requested = input.ruleVersion?.trim() || '';
    // Accept only authority-derived label or content fingerprint — not free-form BOM labels.
    if (requested && requested !== authorityRuleVersion && requested !== contentFp) {
      return {
        ok: false,
        error: 'rule version does not match approved cutting-rule content',
      };
    }
    ruleVersion = authorityRuleVersion || contentFp;
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
