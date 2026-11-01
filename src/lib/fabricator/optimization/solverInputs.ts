/**
 * Batch 2 — resolve what the Tier-3 cutting solver is allowed to assume.
 *
 * AICS-001 Tier 3: kerf, bar-end trim and stock lengths are approved manufacturing
 * authority values bound to the saved position revision — never pack defaults,
 * never a silent 6000 mm, never inferred from catalogue entries. Owned-stock
 * readiness is the operator's revision-bound acknowledgement (soft check); its
 * failure modes are reported as separate issues so a missing mapping is not
 * confused with a metre shortage or a stale acknowledgement.
 *
 * Simulation (inventory-free) is an explicit mode: it may use approved machining
 * settings but it is never production/CNC authority and must not unlock the
 * optimization step or record evidence.
 */

import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { fingerprintBom } from '@/lib/fabricator/positionRelease';
import type { StockReservationEvidence, WorkflowIdentity } from '@/store/workflowStore';
import { workflowIdentityMatches } from '@/store/workflowStore';
import type { Profile } from '@/types/fabricator';

export type OptimizationMode = 'production' | 'simulation';

export interface ApprovedAuthorityLike {
  readonly profiles: ReadonlyArray<{
    readonly profileId: string;
    readonly stockLengthMm: number;
    readonly evidenceStatus?: string;
  }>;
  readonly manufacturingSettings: { readonly sawKerfMm: number; readonly trimCutMm: number } | null | undefined;
}

export type SolverInputIssueCode =
  | 'SETTINGS_MISSING'
  | 'PROFILE_NOT_APPROVED'
  | 'STOCK_SELECTION_REQUIRED'
  | 'STOCK_NOT_APPROVED';

export interface SolverInputIssue {
  code: SolverInputIssueCode;
  profileId?: string;
  message: string;
  /** Approved stock lengths the operator may choose from (when a choice is required). */
  options?: number[];
}

export interface ApprovedStockBinding {
  stockLengthMm: number;
  /** Finite number of bars known to be available for this run; undefined = not tracked (metres-only ack). */
  availableBars?: number;
}

export type ResolvedSolverInputs =
  | {
      ok: true;
      kerfMm: number;
      trimMm: number;
      /** Design profiles re-bound to approved kerf/trim/stock (same ids, allowances untouched). */
      profiles: Profile[];
      stockByProfile: Record<string, ApprovedStockBinding>;
    }
  | { ok: false; issues: SolverInputIssue[] };

export function approvedStockOptions(authority: ApprovedAuthorityLike, profileId: string): number[] {
  return [...new Set(authority.profiles
    .filter((p) => p.profileId === profileId && p.evidenceStatus === 'approved' && Number.isFinite(p.stockLengthMm) && p.stockLengthMm > 0)
    .map((p) => p.stockLengthMm))].sort((a, b) => a - b);
}

/**
 * Bind the design's profiles to the approved authority.
 * - kerf/trim come from `manufacturingSettings` (required, non-negative)
 * - stock length must be approved for that profile; when several lengths are
 *   approved the operator must choose (no silent default)
 */
export function resolveApprovedSolverInputs(
  designProfiles: readonly Profile[],
  authority: ApprovedAuthorityLike,
  stockSelectionByProfile: Readonly<Record<string, number>> = {},
  availableBarsByProfile: Readonly<Record<string, number>> = {},
): ResolvedSolverInputs {
  const issues: SolverInputIssue[] = [];
  const settings = authority.manufacturingSettings;
  const kerfMm = Number(settings?.sawKerfMm);
  const trimMm = Number(settings?.trimCutMm);
  if (!settings || !Number.isFinite(kerfMm) || kerfMm < 0 || !Number.isFinite(trimMm) || trimMm < 0) {
    issues.push({ code: 'SETTINGS_MISSING', message: 'Approved manufacturingSettings.sawKerfMm/trimCutMm are required before optimization.' });
  }

  const stockByProfile: Record<string, ApprovedStockBinding> = {};
  const profiles: Profile[] = [];
  for (const profile of designProfiles) {
    const options = approvedStockOptions(authority, profile.id);
    if (options.length === 0) {
      issues.push({ code: 'PROFILE_NOT_APPROVED', profileId: profile.id, message: `Profile ${profile.id} has no approved catalogue stock length for this system pack revision.` });
      continue;
    }
    const selected = stockSelectionByProfile[profile.id];
    let stockLengthMm: number;
    if (selected !== undefined) {
      if (!options.includes(selected)) {
        issues.push({ code: 'STOCK_NOT_APPROVED', profileId: profile.id, options, message: `Stock length ${selected} mm is not approved for profile ${profile.id} (approved: ${options.join(', ')} mm).` });
        continue;
      }
      stockLengthMm = selected;
    } else if (options.length === 1) {
      stockLengthMm = options[0];
    } else {
      issues.push({ code: 'STOCK_SELECTION_REQUIRED', profileId: profile.id, options, message: `Choose the approved stock length for profile ${profile.id} (${options.join(', ')} mm).` });
      continue;
    }
    if (trimMm * 2 >= stockLengthMm) {
      issues.push({ code: 'STOCK_NOT_APPROVED', profileId: profile.id, options, message: `Approved bar-end trim ${trimMm} mm leaves no usable length on a ${stockLengthMm} mm bar for profile ${profile.id}.` });
      continue;
    }
    const availableBars = availableBarsByProfile[profile.id];
    stockByProfile[profile.id] = {
      stockLengthMm,
      ...(Number.isInteger(availableBars) && (availableBars as number) >= 0 ? { availableBars } : {}),
    };
    profiles.push({
      ...profile,
      barLength: stockLengthMm,
      specifications: {
        ...(profile.specifications ?? {}),
        stockLengthMm,
        sawKerf: kerfMm,
        barEndTrim: trimMm,
      },
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, kerfMm, trimMm, profiles, stockByProfile };
}

export type StockReadinessIssueCode =
  | 'STOCK_NOT_ACKNOWLEDGED'
  | 'STOCK_ACK_STALE_REVISION'
  | 'STOCK_ACK_STALE_BOM'
  | 'STOCK_MAPPING_MISSING'
  | 'STOCK_SHORTAGE';

export interface StockReadinessIssue {
  code: StockReadinessIssueCode;
  message: string;
}

export interface StockReadiness {
  ready: boolean;
  issues: StockReadinessIssue[];
}

/**
 * Revision-bound owned-stock readiness from the operator's acknowledgement.
 * Each failure mode is its own issue; none of them is inferred from catalogue data.
 */
export function assessStockReadiness(input: {
  stockReservation: StockReservationEvidence | null | undefined;
  workflowIdentity: WorkflowIdentity | null | undefined;
  bom: CompleteBOM | null | undefined;
}): StockReadiness {
  const issues: StockReadinessIssue[] = [];
  const ack = input.stockReservation;
  if (!ack) {
    issues.push({ code: 'STOCK_NOT_ACKNOWLEDGED', message: 'Acknowledge owned stock availability for this revision before production optimization.' });
    return { ready: false, issues };
  }
  if (!input.workflowIdentity || !workflowIdentityMatches(ack.identity, input.workflowIdentity)) {
    issues.push({
      code: 'STOCK_ACK_STALE_REVISION',
      message: `Stock acknowledgement is for revision R${ack.identity.revision}; the open position is R${input.workflowIdentity?.revision ?? '?'}. Re-acknowledge stock for the saved revision.`,
    });
  }
  const currentBomFingerprint = fingerprintBom(input.bom ?? null);
  if (!currentBomFingerprint || ack.bomFingerprint !== currentBomFingerprint) {
    issues.push({ code: 'STOCK_ACK_STALE_BOM', message: 'The BOM changed after stock was acknowledged. Re-acknowledge stock against the reviewed BOM.' });
  }
  if (!ack.profileIds.length || Object.keys(ack.metersByProfile).length === 0) {
    issues.push({ code: 'STOCK_MAPPING_MISSING', message: 'No catalogue profile is mapped to owned stock in this acknowledgement.' });
  }
  if (!ack.availabilityOk) {
    issues.push({ code: 'STOCK_SHORTAGE', message: 'Owned stock metres are short for this BOM. Resolve intake or run an inventory-free simulation (not production).' });
  }
  return { ready: issues.length === 0, issues };
}

export interface RemnantCandidate {
  id: string;
  profileId: string;
  lengthMm: number;
  createdAt: Date | string;
  expirationDate?: Date | string | null;
  status?: string;
}

export interface RemnantEligibilityOptions {
  minRemnantLengthMm: number;
  maxRemnantAgeDays: number;
  now?: Date;
}

export interface RemnantEligibility {
  eligible: RemnantCandidate[];
  excluded: Array<{ remnant: RemnantCandidate; reason: 'expired' | 'too_old' | 'too_short' | 'not_available' }>;
}

/**
 * Deterministic remnant filter for the operator's material constraints.
 * Note: remnant bars are not approved catalogue stock, so the Tier-3 solver does
 * not place production cuts on them under the current evidence contract; the
 * result is informational and must be labelled as such in the UI.
 */
export function filterEligibleRemnants(
  remnants: readonly RemnantCandidate[],
  options: RemnantEligibilityOptions,
): RemnantEligibility {
  const now = options.now ?? new Date();
  const maxAgeMs = options.maxRemnantAgeDays * 86_400_000;
  const eligible: RemnantCandidate[] = [];
  const excluded: RemnantEligibility['excluded'] = [];
  for (const remnant of remnants) {
    if (remnant.status && remnant.status !== 'available') {
      excluded.push({ remnant, reason: 'not_available' });
      continue;
    }
    const expires = remnant.expirationDate ? new Date(remnant.expirationDate) : null;
    if (expires && !Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
      excluded.push({ remnant, reason: 'expired' });
      continue;
    }
    const created = new Date(remnant.createdAt);
    if (Number.isNaN(created.getTime()) || now.getTime() - created.getTime() > maxAgeMs) {
      excluded.push({ remnant, reason: 'too_old' });
      continue;
    }
    if (!Number.isFinite(remnant.lengthMm) || remnant.lengthMm < options.minRemnantLengthMm) {
      excluded.push({ remnant, reason: 'too_short' });
      continue;
    }
    eligible.push(remnant);
  }
  return { eligible, excluded };
}

/** Bars consumed per profile from a solved plan — actual results, not slider estimates. */
export function barsByProfile(plans: ReadonlyArray<{ profile: { id: string }; stockLength: number }>): Record<string, { bars: number; stockLengthMm: number }> {
  const out: Record<string, { bars: number; stockLengthMm: number }> = {};
  for (const plan of plans) {
    const entry = out[plan.profile.id] ?? { bars: 0, stockLengthMm: plan.stockLength };
    entry.bars += 1;
    out[plan.profile.id] = entry;
  }
  return out;
}
