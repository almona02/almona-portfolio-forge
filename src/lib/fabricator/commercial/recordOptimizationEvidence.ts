/**
 * Persist server-stamped optimization evidence.
 * schemaVersion 2+: server derives design ledger; client must supply BOM (no placement fallback).
 * Kerf/trim/stock bound to approved authority manufacturingSettings.
 */

import { resolveManufacturingAuthority } from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import { poseQuantityOf } from '@/lib/fabricator/optimization/physicalCutContract';
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
  /**
   * Pose / order quantity. Design BOM is always one window; evidence requiredCuts
   * is the multiset design × poseQuantity (shared cutId copies). Default 1.
   */
  poseQuantity?: number;
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

export const BOM_IDENTITY_REBUILD_HINT =
  'Rebuild the BOM from the saved design for this revision (BOM Review → Generate), then retry optimization.';

export type RequiredCutsFromBom =
  | { ok: true; cuts: EvidenceCutSpec[] }
  | { ok: false; error: string };

/**
 * BOM → requiredCuts using the preserved physicalCutForOccurrence identities
 * (`componentId:index`) carried on each grouped row.
 *
 * AICS-001 quantity contract (multiset copies):
 * - Design BOM is always one window (unique cutIds).
 * - poseQuantity repeats each occurrence N times with the **same** cutId so
 *   reconcileDesignLedger / derive_required_cuts_from_position stay aligned.
 * - Quantity is applied exactly once here — never invent identities from placements.
 *
 * Fail-closed: a row without aligned `cutIds` cannot be turned into a ledger.
 */
export function requiredCutsFromBom(
  bom: CompleteBOM | null,
  poseQuantity: number = 1,
): RequiredCutsFromBom {
  let quantity: number;
  try {
    quantity = poseQuantityOf({ quantity: poseQuantity });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Pose quantity must be a positive integer.',
    };
  }

  if (!bom?.profiles?.length) {
    return { ok: false, error: 'Design ledger required: BOM cuttingLengths are missing.' };
  }
  const designCuts: EvidenceCutSpec[] = [];
  const seen = new Set<string>();
  for (const profile of bom.profiles) {
    const profileId = profile.profileCode ?? profile.id ?? '';
    const lengths = profile.cuttingLengths ?? [];
    const angles = profile.angles ?? [];
    const rowLabel = profile.id ?? profileId;
    if (!lengths.length) continue;
    if (!Array.isArray(profile.cutIds) || profile.cutIds.length !== lengths.length) {
      return {
        ok: false,
        error: `BOM row ${rowLabel} has no cut occurrence identities (${lengths.length} cuts, ${profile.cutIds?.length ?? 0} ids). ${BOM_IDENTITY_REBUILD_HINT}`,
      };
    }
    for (let index = 0; index < lengths.length; index += 1) {
      const cutId = String(profile.cutIds[index] ?? '').trim();
      if (!cutId) {
        return { ok: false, error: `BOM row ${rowLabel} cut ${index} has an empty occurrence identity. ${BOM_IDENTITY_REBUILD_HINT}` };
      }
      if (seen.has(cutId)) {
        return { ok: false, error: `BOM lists cut occurrence ${cutId} more than once. ${BOM_IDENTITY_REBUILD_HINT}` };
      }
      seen.add(cutId);
      designCuts.push({
        cutId,
        profileId,
        length: Number(lengths[index]),
        angle: Number.isFinite(angles[index]) ? Number(angles[index]) : 0,
      });
    }
  }
  if (designCuts.length === 0) {
    return { ok: false, error: 'Design ledger required: BOM cuttingLengths are missing.' };
  }

  if (quantity === 1) return { ok: true, cuts: designCuts };

  const cuts: EvidenceCutSpec[] = [];
  for (let copy = 0; copy < quantity; copy += 1) {
    for (const cut of designCuts) cuts.push({ ...cut });
  }
  return { ok: true, cuts };
}

/**
 * The solver runs with the approved kerf/trim bound onto each profile's
 * specifications (Batch 2). The evidence contract carries kerf/trim once, at the
 * payload level, and rejects plan/profile overrides — so strip those keys here
 * while keeping everything the reload path needs (waste, utilization, cut identity).
 */
export function cuttingPlanForEvidence(
  plans: OptimizationResult['cuttingPlan'],
): OptimizationEvidencePayload['cuttingPlan'] {
  return plans.map((plan) => {
    const { kerfMm: _planKerf, trimMm: _planTrim, ...rest } = plan as typeof plan & { kerfMm?: unknown; trimMm?: unknown };
    const { sawKerf: _kerf, barEndTrim: _trim, ...specifications } = (plan.profile?.specifications ?? {}) as Record<string, unknown>;
    return {
      ...rest,
      profile: { ...plan.profile, specifications },
    } as OptimizationEvidencePayload['cuttingPlan'][number];
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
    displayResult: { costBreakdown: result.costBreakdown, estimatedProductionTime: result.estimatedProductionTime },
    materialUsage: result.materialUsage,
    wastePercentage: result.wastePercentage,
    nestingEfficiency: result.nestingEfficiency,
    cutCount,
    kerfMm,
    trimMm,
    requiredCuts,
    cuttingPlan: cuttingPlanForEvidence(result.cuttingPlan),
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

  const ledger = requiredCutsFromBom(input.bom, input.poseQuantity ?? 1);
  if (!ledger.ok) {
    return { ok: false, error: ledger.error };
  }
  const requiredCuts = ledger.cuts;

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
    permittedStocks = [...new Set(authority.profiles
      .filter((p) => p.evidenceStatus === 'approved')
      .map((p) => p.stockLengthMm).filter((s) => s > 0))];
    if (permittedStocks.length === 0) {
      return { ok: false, error: 'Approved catalogue stock lengths are required.' };
    }

    for (const plan of input.optimizationResult.cuttingPlan ?? []) {
      const stock = Number(plan.stockLength);
      if (!permittedStocks.includes(stock)) {
        return { ok: false, error: 'cutting plan stock length is not in approved catalogue' };
      }
      const profileId = plan.profile?.id ?? '';
      if (!authority.profiles.some((p) => p.profileId === profileId && p.evidenceStatus === 'approved')) {
        return { ok: false, error: 'cutting plan profile is not in approved catalogue' };
      }
      if (!authority.profiles.some((p) => p.profileId === profileId && p.evidenceStatus === 'approved' && p.stockLengthMm === stock)) {
        return { ok: false, error: 'cutting plan stock length is not approved for this profile' };
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
    return { ok: false, error: structural.error.startsWith('design ledger')
      ? `BOM ${structural.error}. The optimized cuts do not match the reviewed BOM ledger. ${BOM_IDENTITY_REBUILD_HINT}`
      : structural.error };
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
        // The reviewed BOM agreed with the placement but the server's ledger for this
        // saved revision does not. Say so explicitly — this is not a BOM rebuild case.
        return {
          ok: false,
          error: `Server ${serverValidate.error}. The saved position revision ${input.expectedRevision} on the server disagrees with the optimized cuts; reload the position and confirm the saved design (raw lengths, quantity) and server ledger derivation before retrying.`,
        };
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

  return { ok: true, positionId: ((data as string) ?? input.positionId) };
}
