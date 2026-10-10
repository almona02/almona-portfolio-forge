/**
 * Persist server-stamped optimization evidence.
 * schemaVersion 2+: server derives design ledger; client must supply BOM (no placement fallback).
 * Kerf/trim/stock bound to approved authority manufacturingSettings.
 */

import { resolveManufacturingAuthority } from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { supabase } from '@/lib/supabase';
import type { OptimizationResult } from '@/types/fabricator';
import {
  approvedRuleContentFingerprint,
  authorityContentFingerprint,
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

/** BOM → requiredCuts using physicalCutForOccurrence identity (`id:index`). */
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
    cuttingPlan: result.cuttingPlan as OptimizationEvidencePayload['cuttingPlan'],
  };
}

/**
 * Calls SECURITY DEFINER record_fabricator_optimization_evidence.
 * Server re-derives design ledger from saved pose; client BOM is required for local gate only.
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

  const requiredCuts = requiredCutsFromBom(input.bom);
  if (requiredCuts.length === 0) {
    return { ok: false, error: 'Design ledger required: BOM cuttingLengths are missing.' };
  }

  let systemPackRevision: number;
  let ruleVersion: string;
  let kerfMm: number;
  let trimMm: number;
  let permittedStocks: number[];
  try {
    const authority = await resolveManufacturingAuthority(
      input.positionId,
      input.expectedRevision,
    );
    systemPackRevision = Number(authority.systemPack.revision);
    if (!authority.cuttingRules.length) {
      return { ok: false, error: 'Approved cutting rules are required for rule version.' };
    }

    const settings = authority.manufacturingSettings;
    if (
      !settings ||
      !Number.isFinite(settings.sawKerfMm) ||
      settings.sawKerfMm < 0 ||
      !Number.isFinite(settings.trimCutMm) ||
      settings.trimCutMm < 0
    ) {
      return {
        ok: false,
        error: 'Approved manufacturingSettings.sawKerfMm/trimCutMm are required.',
      };
    }
    kerfMm = settings.sawKerfMm;
    trimMm = settings.trimCutMm;
    permittedStocks = authority.profiles.map((p) => p.stockLengthMm).filter((s) => s > 0);
    if (permittedStocks.length === 0) {
      return { ok: false, error: 'Approved catalogue stock lengths are required.' };
    }

    for (const plan of input.optimizationResult.cuttingPlan ?? []) {
      const stock = Number(plan.stockLength);
      if (!permittedStocks.includes(stock)) {
        return { ok: false, error: 'cutting plan stock length is not in approved catalogue' };
      }
      const profileId = plan.profile?.id ?? '';
      if (!authority.profiles.some((p) => p.profileId === profileId)) {
        return { ok: false, error: 'cutting plan profile is not in approved catalogue' };
      }
    }

    const contentFp = await approvedRuleContentFingerprint(authority.cuttingRules);
    const authorityFp = await authorityContentFingerprint({
      manufacturingSettings: settings,
      permittedStockLengths: permittedStocks,
      cuttingRules: authority.cuttingRules,
    });
    const requested = input.ruleVersion?.trim() || '';
    if (requested && requested !== contentFp && requested !== authorityFp) {
      return {
        ok: false,
        error: 'rule version does not match approved cutting-rule content',
      };
    }
    ruleVersion = contentFp;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Manufacturing authority unavailable.',
    };
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

  // Prefer server-derived ledger fingerprint when RPC is available.
  const rpc = supabase as unknown as RpcClient;
  let designFingerprint = await sha256Hex(structural.designCanonical);
  try {
    const derived = await rpc.rpc('derive_required_cuts_from_position', {
      p_position_id: input.positionId,
      p_expected_revision: input.expectedRevision,
    });
    if (!derived.error && Array.isArray(derived.data) && derived.data.length > 0) {
      const serverLedger = derived.data as EvidenceCutSpec[];
      const serverValidate = validateOptimizationEvidencePayload(
        { ...evidencePayload, requiredCuts: serverLedger },
        cutCount,
      );
      if (!serverValidate.ok) {
        return { ok: false, error: serverValidate.error };
      }
      designFingerprint = await sha256Hex(serverValidate.designCanonical);
    }
  } catch {
    // Local/unit tests without RPC: BOM ledger remains the client gate; server re-derives on write.
  }

  const placementFingerprint = await sha256Hex(structural.placementCanonical);
  const ledgerFingerprint = `${designFingerprint}||${placementFingerprint}`;

  if (!ruleVersion || ['unspecified', 'unknown', 'n/a'].includes(ruleVersion.toLowerCase())) {
    return { ok: false, error: 'Authoritative rule version is required.' };
  }

  if (!Number.isInteger(systemPackRevision) || systemPackRevision < 1) {
    return { ok: false, error: 'Authority system pack revision is invalid.' };
  }

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
