/**
 * Freshness gate for soft stock acknowledgement (distinct from a hard reservation).
 * Acceptance must use a freshly loaded authoritative snapshot — never React cache alone.
 */

import type { BomDemandReport } from './bomStockAvailability';
import { fingerprintStockVersions } from './loadOwnedPhysicalBarLots';
import {
  bindPhysicalBarsForDemand,
  type OwnedBarLot,
  type PhysicalBarBindResult,
} from './physicalOwnedBars';
import type { Profile } from '@/types/fabricator';
import type { StockReservationEvidence, WorkflowIdentity } from '@/store/workflowStore';

export type StockFreshnessDecision =
  | { ok: true; action: 'accept' }
  | { ok: false; action: 'block_refresh'; reason: string }
  | { ok: false; action: 'block_error'; reason: string };

/**
 * Compare the snapshot the operator reviewed with a freshly loaded authoritative one.
 * On drift: block and require review of refreshed availability (do not ack with old lots).
 */
export function decideStockAcknowledgementFreshness(input: {
  displayedFingerprint: string | null | undefined;
  freshOk: boolean;
  freshComplete: boolean;
  freshFingerprint: string;
  freshError?: string | null;
}): StockFreshnessDecision {
  if (!input.freshOk || !input.freshComplete) {
    return {
      ok: false,
      action: 'block_error',
      reason:
        input.freshError
        || 'Fresh physical-bar snapshot is incomplete or unavailable — cannot acknowledge stock.',
    };
  }
  if (!input.displayedFingerprint) {
    return {
      ok: false,
      action: 'block_error',
      reason: 'No displayed physical-bar snapshot fingerprint — reload inventory before acknowledging.',
    };
  }
  if (input.freshFingerprint !== input.displayedFingerprint) {
    return {
      ok: false,
      action: 'block_refresh',
      reason:
        'Owned stock versions changed since this inventory view was loaded. Review the refreshed availability, then acknowledge again.',
    };
  }
  return { ok: true, action: 'accept' };
}

/**
 * Build acknowledgement payload exclusively from the fresh snapshot (never stamp
 * stale lots with a newer version fingerprint).
 */
export function buildFreshStockAcknowledgement(input: {
  identity: WorkflowIdentity;
  bomFingerprint: string;
  report: BomDemandReport;
  freshLots: readonly OwnedBarLot[];
  freshInvalidatedProfileIds: readonly string[];
  freshStockVersionByProfile: Readonly<Record<string, number>>;
  freshFingerprint: string;
  ownedProfiles: readonly Profile[];
}): { ok: true; reservation: StockReservationEvidence; binding: PhysicalBarBindResult }
  | { ok: false; reason: string } {
  const expectedFp = fingerprintStockVersions(input.freshStockVersionByProfile);
  if (expectedFp !== input.freshFingerprint) {
    return {
      ok: false,
      reason: 'Fresh snapshot fingerprint does not match its stock versions — refusing acknowledgement.',
    };
  }

  const metersByProfile: Record<string, number> = {};
  for (const row of input.report.rows) {
    if (row.ownedProfileId) {
      metersByProfile[row.ownedProfileId] =
        (metersByProfile[row.ownedProfileId] ?? 0) + row.requiredMetres;
    }
  }

  const ownedById = new Map(input.ownedProfiles.map((p) => [p.id, p]));
  const binding = bindPhysicalBarsForDemand(
    input.report,
    input.freshLots,
    ownedById,
    { invalidatedProfileIds: input.freshInvalidatedProfileIds },
  );

  return {
    ok: true,
    binding,
    reservation: {
      identity: input.identity,
      profileIds: Array.from(new Set(Object.keys(metersByProfile))),
      metersByProfile,
      reservedAt: new Date().toISOString(),
      availabilityOk: input.report.availabilityOk,
      bomFingerprint: input.bomFingerprint,
      stockVersionByProfile: { ...input.freshStockVersionByProfile },
      barsByCatalogueLength: binding.barsByCatalogueLength,
      physicalBarBinding: binding.binding,
      physicalStockVersionFingerprint: input.freshFingerprint,
    },
  };
}

/** Production acceptance: ack fingerprint must match a freshly read version map. */
export function decideProductionStockFreshness(input: {
  acknowledgementFingerprint: string | null | undefined;
  currentVersions: Readonly<Record<string, number>> | null | undefined;
  currentVersionsError?: string | null;
}): StockFreshnessDecision {
  if (input.currentVersionsError) {
    return {
      ok: false,
      action: 'block_error',
      reason: input.currentVersionsError,
    };
  }
  if (!input.currentVersions) {
    return {
      ok: false,
      action: 'block_error',
      reason: 'Current owned stock versions are unavailable — production packing blocked.',
    };
  }
  if (!input.acknowledgementFingerprint) {
    return {
      ok: false,
      action: 'block_error',
      reason: 'Stock acknowledgement has no verified physical snapshot fingerprint.',
    };
  }
  const currentFp = fingerprintStockVersions(input.currentVersions);
  if (currentFp !== input.acknowledgementFingerprint) {
    return {
      ok: false,
      action: 'block_refresh',
      reason:
        'Owned stock versions advanced after acknowledgement — re-acknowledge stock before production packing.',
    };
  }
  return { ok: true, action: 'accept' };
}
