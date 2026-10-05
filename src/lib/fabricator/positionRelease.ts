/**
 * UP-18 — Freeze qualified BOM / stock / optimization for a position revision.
 * AICS-001: deterministic fingerprints only; no ML; human completes production.
 */

import { supabase } from '@/lib/supabase';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type {
  StockReservationEvidence,
  WorkflowIdentity,
} from '@/store/workflowStore';
import type { OptimizationResult } from '@/types/fabricator';

export interface PositionReleaseAcknowledgement {
  releaseId: string;
  projectId: string;
  positionId: string;
  source: 'v1' | 'v2';
  revision: number;
  bomFingerprint: string;
  stockFingerprint: string;
  optimizationFingerprint: string;
  releasedAt: string;
}

export function fingerprintBom(bom: CompleteBOM | null): string {
  if (!bom) return '';
  const profiles = (bom.profiles ?? [])
    .map((p) => `${p.id ?? p.profileCode ?? ''}:${p.length ?? 0}:${p.quantity ?? 1}`)
    .sort()
    .join('|');
  const hardware = (bom.hardware ?? [])
    .map((h) => `${h.id ?? h.supplierCode ?? ''}:${h.quantity ?? 1}`)
    .sort()
    .join('|');
  return `bom:${profiles};hw:${hardware}`;
}

export function fingerprintStock(reservation: StockReservationEvidence | null): string {
  if (!reservation) return '';
  const meters = Object.entries(reservation.metersByProfile ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, m]) => `${id}:${m}`)
    .join('|');
  return `stock:${reservation.profileIds.slice().sort().join(',')};m:${meters};ok:${reservation.availabilityOk ? 1 : 0}`;
}

export function fingerprintOptimization(result: OptimizationResult | null): string {
  if (!result) return '';
  const cuts = (result.cuttingPlan ?? [])
    .flatMap((plan) =>
      (plan.cuts ?? []).map(
        (cut) =>
          `${cut.cutId ?? cut.componentId ?? ''}:${cut.length ?? 0}:${plan.stockLength ?? 0}`,
      ),
    )
    .sort()
    .join('|');
  return `opt:${cuts};waste:${result.wastePercentage ?? 0};usage:${result.materialUsage ?? 0}`;
}

export function buildExpectedProductQr(positionId: string, revision: number): string {
  return `ALMONA_${positionId}_R${revision}`;
}

export async function freezePositionRelease(input: {
  identity: WorkflowIdentity;
  bom: CompleteBOM | null;
  stockReservation: StockReservationEvidence | null;
  optimizationResult: OptimizationResult | null;
}): Promise<PositionReleaseAcknowledgement> {
  const { identity, bom, stockReservation, optimizationResult } = input;
  if (!identity.ownerUserId || !identity.projectId || !identity.positionId) {
    throw new Error('Workflow identity is required to freeze a release.');
  }
  if (!Number.isInteger(identity.revision) || identity.revision < 1) {
    throw new Error('Positive revision required for release.');
  }
  if (!stockReservation || !workflowIdentityMatchesLocal(stockReservation.identity, identity)) {
    throw new Error('Stock acknowledgement must match the release identity.');
  }
  if (!stockReservation.availabilityOk) {
    throw new Error('Stock must be available before release freeze.');
  }

  const bomFingerprint = fingerprintBom(bom);
  const stockFingerprint = fingerprintStock(stockReservation);
  const optimizationFingerprint = fingerprintOptimization(optimizationResult);
  if (!bomFingerprint || !optimizationFingerprint) {
    throw new Error('Qualified BOM and optimization are required to freeze a release.');
  }

  const row = {
    owner_user_id: identity.ownerUserId,
    project_id: identity.projectId,
    position_id: identity.positionId,
    position_source: identity.source,
    revision: identity.revision,
    bom_fingerprint: bomFingerprint,
    stock_fingerprint: stockFingerprint,
    optimization_fingerprint: optimizationFingerprint,
    release_payload: {
      productQr: buildExpectedProductQr(identity.positionId, identity.revision),
      stockProfileIds: stockReservation.profileIds,
      reservedAt: stockReservation.reservedAt,
    },
  };

  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from('fabricator_position_releases')
    .select(
      'id, project_id, position_id, position_source, revision, bom_fingerprint, stock_fingerprint, optimization_fingerprint, released_at',
    )
    .eq('position_id', identity.positionId)
    .eq('position_source', identity.source)
    .eq('revision', identity.revision)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to check existing release: ${existingError.message}`);
  }

  if (existing?.id) {
    if (
      String(existing.bom_fingerprint) !== bomFingerprint ||
      String(existing.stock_fingerprint) !== stockFingerprint ||
      String(existing.optimization_fingerprint) !== optimizationFingerprint
    ) {
      throw new Error(
        'A release already exists for this revision with different fingerprints. Bump revision before re-releasing.',
      );
    }
    return mapReleaseRow(existing);
  }

  const { data, error } = await db
    .from('fabricator_position_releases')
    .insert(row)
    .select(
      'id, project_id, position_id, position_source, revision, bom_fingerprint, stock_fingerprint, optimization_fingerprint, released_at',
    )
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Release freeze failed.');
  }

  return mapReleaseRow(data);
}

export async function getLatestPositionRelease(
  positionId: string,
  revision: number,
): Promise<PositionReleaseAcknowledgement | null> {
  if (!positionId || !Number.isInteger(revision) || revision < 1) return null;
  const db = supabase as any;
  const { data, error } = await db
    .from('fabricator_position_releases')
    .select(
      'id, project_id, position_id, position_source, revision, bom_fingerprint, stock_fingerprint, optimization_fingerprint, released_at',
    )
    .eq('position_id', positionId)
    .eq('revision', revision)
    .order('released_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to reload position release: ${error.message}`);
  }
  if (!data?.id) return null;
  return mapReleaseRow(data);
}

function mapReleaseRow(data: Record<string, unknown>): PositionReleaseAcknowledgement {
  const source = data.position_source === 'v2' ? 'v2' : 'v1';
  return {
    releaseId: String(data.id),
    projectId: String(data.project_id),
    positionId: String(data.position_id),
    source,
    revision: Number(data.revision),
    bomFingerprint: String(data.bom_fingerprint),
    stockFingerprint: String(data.stock_fingerprint),
    optimizationFingerprint: String(data.optimization_fingerprint),
    releasedAt: String(data.released_at),
  };
}

function workflowIdentityMatchesLocal(
  actual: WorkflowIdentity,
  expected: WorkflowIdentity,
): boolean {
  return (
    actual.ownerUserId === expected.ownerUserId &&
    actual.projectId === expected.projectId &&
    actual.positionId === expected.positionId &&
    actual.source === expected.source &&
    actual.revision === expected.revision
  );
}
