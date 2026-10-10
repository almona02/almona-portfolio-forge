/**
 * Client-side mirror of server validate_optimization_evidence_payload.
 * AICS-001: deterministic structural checks only.
 *
 * schemaVersion >= 2 requires:
 * - kerf/trim bar-pack accounting (FP-023B: Σ(piece+kerf)+trim)
 * - requiredCuts design-ledger reconciliation (exact multiset)
 */

import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings';
import { barConsumedLengthMm } from '@/lib/fabricator/barPackAccounting';

export interface EvidenceCutSpec {
  cutId: string;
  profileId: string;
  length: number;
  angle?: number;
}

export interface OptimizationEvidencePayload {
  schema: 'almona.optimization-result';
  schemaVersion: number;
  materialUsage?: number;
  wastePercentage?: number;
  nestingEfficiency?: number;
  cutCount?: number;
  /** Saw kerf mm (required for schemaVersion >= 2). */
  kerfMm?: number;
  /** Bar-end trim mm (required for schemaVersion >= 2). */
  trimMm?: number;
  /** Authoritative design ledger — every required piece exactly once. */
  requiredCuts?: EvidenceCutSpec[];
  cuttingPlan: Array<{
    stockLength?: number;
    stockLengthMm?: number;
    kerfMm?: number;
    trimMm?: number;
    profile?: { id?: string; specifications?: { sawKerf?: number; barEndTrim?: number } };
    profileId?: string;
    cuts?: Array<{
      cutId?: string;
      componentId?: string;
      length?: number;
      angle?: number;
      occurrenceIndex?: number;
    }>;
  }>;
}

export type EvidenceValidationResult =
  | {
      ok: true;
      serverCutCount: number;
      placementCanonical: string;
      designCanonical: string;
      kerfMm: number;
      trimMm: number;
    }
  | { ok: false; error: string };

const LENGTH_TOLERANCE_MM = 0.001;

function cutKey(cut: EvidenceCutSpec): string {
  const angle = Number.isFinite(cut.angle) ? Number(cut.angle) : 0;
  return [cut.cutId, cut.profileId, Number(cut.length).toFixed(3), String(angle)].join(':');
}

export function canonicalizeRequiredCuts(required: EvidenceCutSpec[]): string {
  return [...required]
    .map((cut) => cutKey(cut))
    .sort()
    .join(';');
}

export function canonicalizeOptimizationPlacement(payload: OptimizationEvidencePayload): string {
  const kerf = Number(payload.kerfMm ?? PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm);
  const trim = Number(payload.trimMm ?? PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm);
  const parts = (payload.cuttingPlan ?? []).map((plan) => {
    const stock = String(plan.stockLength ?? plan.stockLengthMm ?? '');
    const profile = plan.profile?.id ?? plan.profileId ?? '';
    const cuts = [...(plan.cuts ?? [])]
      .map((cut, index) =>
        [
          cut.cutId ?? cut.componentId ?? String(index),
          String(cut.length ?? ''),
          String(cut.angle ?? 0),
        ].join(':'),
      )
      .sort();
    return [profile, stock, `kerf=${kerf}`, `trim=${trim}`, cuts.join(',')].join('|');
  });
  return parts.sort().join(';');
}

function resolveBarKerfTrim(
  payload: OptimizationEvidencePayload,
  plan: OptimizationEvidencePayload['cuttingPlan'][number],
): { kerfMm: number; trimMm: number } | { error: string } {
  // Plan/profile overrides are non-authoritative; only payload machining settings apply.
  if (
    plan.kerfMm != null ||
    plan.trimMm != null ||
    plan.profile?.specifications?.sawKerf != null ||
    plan.profile?.specifications?.barEndTrim != null
  ) {
    return {
      error:
        'cuttingPlan must not override kerfMm/trimMm (use approved payload machining settings)',
    };
  }
  const kerf = Number(payload.kerfMm);
  const trim = Number(payload.trimMm);
  if (!Number.isFinite(kerf) || kerf < 0) {
    return { error: 'kerfMm must be a non-negative number' };
  }
  if (!Number.isFinite(trim) || trim < 0) {
    return { error: 'trimMm must be a non-negative number' };
  }
  return { kerfMm: kerf, trimMm: trim };
}

function placedCutsFromPlan(
  payload: OptimizationEvidencePayload,
): EvidenceCutSpec[] | { error: string } {
  const placed: EvidenceCutSpec[] = [];
  for (let i = 0; i < payload.cuttingPlan.length; i += 1) {
    const plan = payload.cuttingPlan[i];
    const profileId = plan.profile?.id ?? plan.profileId ?? '';
    if (!profileId) {
      return { error: `cuttingPlan[${i}] profile id required` };
    }
    for (let j = 0; j < (plan.cuts ?? []).length; j += 1) {
      const cut = plan.cuts![j];
      const cutId = (cut.cutId ?? cut.componentId ?? '').trim();
      if (!cutId) {
        return { error: `cuttingPlan[${i}].cuts[${j}] cutId required` };
      }
      const length = Number(cut.length ?? NaN);
      if (!Number.isFinite(length) || length <= 0) {
        return { error: `cuttingPlan[${i}].cuts[${j}] length missing or non-positive` };
      }
      placed.push({
        cutId,
        profileId,
        length,
        angle: Number.isFinite(cut.angle) ? Number(cut.angle) : 0,
      });
    }
  }
  return placed;
}

function reconcileDesignLedger(
  required: EvidenceCutSpec[],
  placed: EvidenceCutSpec[],
): string | null {
  const requiredKeys = required.map(cutKey).sort();
  const placedKeys = placed.map(cutKey).sort();

  if (requiredKeys.length !== placedKeys.length) {
    return `design ledger cut count mismatch (required ${requiredKeys.length}, placed ${placedKeys.length})`;
  }

  const requiredCounts = new Map<string, number>();
  for (const key of requiredKeys) {
    requiredCounts.set(key, (requiredCounts.get(key) ?? 0) + 1);
  }
  const placedCounts = new Map<string, number>();
  for (const key of placedKeys) {
    placedCounts.set(key, (placedCounts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of requiredCounts) {
    const got = placedCounts.get(key) ?? 0;
    if (got === 0) {
      return `design ledger missing cut ${key}`;
    }
    if (got > count) {
      return `design ledger duplicate cut ${key}`;
    }
    if (got < count) {
      return `design ledger missing cut ${key}`;
    }
  }
  for (const [key, count] of placedCounts) {
    if (!requiredCounts.has(key)) {
      // Wrong size / substituted profile shows up as unknown placed key
      const [cutId, profileId, length] = key.split(':');
      const sameId = [...requiredCounts.keys()].find((r) => r.startsWith(`${cutId}:`));
      if (sameId) {
        const [, reqProfile, reqLength] = sameId.split(':');
        if (reqProfile !== profileId) {
          return `design ledger substituted profile for cut ${cutId}`;
        }
        if (reqLength !== length) {
          return `design ledger wrongly sized cut ${cutId}`;
        }
      }
      return `design ledger unexpected cut ${key}`;
    }
    if ((requiredCounts.get(key) ?? 0) !== count) {
      return `design ledger duplicate cut ${key}`;
    }
  }

  // Length tolerance cross-check (multiset already exact via toFixed(3))
  for (let i = 0; i < required.length; i += 1) {
    const req = required[i];
    const match = placed.find(
      (p) =>
        p.cutId === req.cutId &&
        p.profileId === req.profileId &&
        Math.abs(p.length - req.length) <= LENGTH_TOLERANCE_MM &&
        (p.angle ?? 0) === (req.angle ?? 0),
    );
    if (!match) {
      const sameId = placed.find((p) => p.cutId === req.cutId);
      if (sameId && Math.abs(sameId.length - req.length) > LENGTH_TOLERANCE_MM) {
        return `design ledger wrongly sized cut ${req.cutId}`;
      }
      if (sameId && sameId.profileId !== req.profileId) {
        return `design ledger substituted profile for cut ${req.cutId}`;
      }
    }
  }

  return null;
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
  if (!Number.isInteger(body.schemaVersion) || (body.schemaVersion ?? 0) < 2) {
    return { ok: false, error: 'evidence payload schemaVersion must be >= 2' };
  }
  if (!Array.isArray(body.cuttingPlan) || body.cuttingPlan.length === 0) {
    return { ok: false, error: 'evidence payload cuttingPlan required' };
  }
  if (!Array.isArray(body.requiredCuts) || body.requiredCuts.length === 0) {
    return { ok: false, error: 'evidence payload requiredCuts design ledger required' };
  }

  const payloadKerf = Number(body.kerfMm);
  const payloadTrim = Number(body.trimMm);
  if (!Number.isFinite(payloadKerf) || payloadKerf < 0) {
    return { ok: false, error: 'kerfMm must be a non-negative number' };
  }
  if (!Number.isFinite(payloadTrim) || payloadTrim < 0) {
    return { ok: false, error: 'trimMm must be a non-negative number' };
  }

  for (let r = 0; r < body.requiredCuts.length; r += 1) {
    const req = body.requiredCuts[r];
    if (!req?.cutId?.trim() || !req?.profileId?.trim()) {
      return { ok: false, error: `requiredCuts[${r}] cutId and profileId required` };
    }
    if (!Number.isFinite(req.length) || req.length <= 0) {
      return { ok: false, error: `requiredCuts[${r}] length must be positive` };
    }
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
    const settings = resolveBarKerfTrim(body as OptimizationEvidencePayload, plan);
    if ('error' in settings) {
      return { ok: false, error: settings.error };
    }
    const lengths: number[] = [];
    for (let j = 0; j < plan.cuts.length; j += 1) {
      const length = Number(plan.cuts[j]?.length ?? NaN);
      if (!Number.isFinite(length) || length <= 0) {
        return { ok: false, error: `cuttingPlan[${i}].cuts[${j}] length missing or non-positive` };
      }
      lengths.push(length);
      serverCutCount += 1;
    }
    const consumed = barConsumedLengthMm(lengths, {
      sawKerfMm: settings.kerfMm,
      trimCutMm: settings.trimMm,
    });
    if (consumed > stock + LENGTH_TOLERANCE_MM) {
      return {
        ok: false,
        error: `cuttingPlan[${i}] stock overrun (consumed ${consumed} mm > stock ${stock} mm including kerf/trim)`,
      };
    }
  }

  if (serverCutCount <= 0) {
    return { ok: false, error: 'no placed cuts in evidence payload' };
  }
  if (cutCount !== serverCutCount) {
    return { ok: false, error: `cut_count mismatch (client ${cutCount}, server ${serverCutCount})` };
  }

  const placed = placedCutsFromPlan(body as OptimizationEvidencePayload);
  if ('error' in placed) {
    return { ok: false, error: placed.error };
  }

  const reconcileError = reconcileDesignLedger(body.requiredCuts, placed);
  if (reconcileError) {
    return { ok: false, error: reconcileError };
  }

  const full = body as OptimizationEvidencePayload;
  const placementCanonical = canonicalizeOptimizationPlacement(full);
  if (placementCanonical.length < 8) {
    return { ok: false, error: 'placement canonicalization failed' };
  }
  const designCanonical = canonicalizeRequiredCuts(body.requiredCuts);
  if (designCanonical.length < 8) {
    return { ok: false, error: 'design ledger canonicalization failed' };
  }

  return {
    ok: true,
    serverCutCount,
    placementCanonical,
    designCanonical,
    kerfMm: payloadKerf,
    trimMm: payloadTrim,
  };
}

/** Async SHA-256 hex for placement / design binding (browser + node). */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}

/** Canonical rule-version label from approved authority cutting rules (content-bound). */
export function canonicalApprovedRuleVersion(
  rules: ReadonlyArray<{ approvalId?: string; ruleId: string; revision: number }>,
): string {
  return [...rules]
    .map((r) => `${r.approvalId ?? ''}:${r.ruleId}:r${r.revision}`)
    .sort()
    .join('|');
}

export type ApprovedRuleContent = {
  approvalId?: string;
  ruleId: string;
  revision: number;
  evidenceStatus?: string;
  deductions?: unknown;
  allowances?: unknown;
  applicability?: unknown;
};

/**
 * Mirror of PostgreSQL `jsonb::text` for fingerprint parity:
 * sorted object keys, space after `:` / `,`, JSON null → `null`.
 */
export function pgJsonbText(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'null';
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => pgJsonbText(item)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const body = keys
      .map(
        (key) =>
          `${JSON.stringify(key)}: ${pgJsonbText((value as Record<string, unknown>)[key])}`,
      )
      .join(', ');
    return `{${body}}`;
  }
  return 'null';
}

/** SHA-256 of approved cutting-rule content (must match SQL approved_rule_content_fingerprint). */
export async function approvedRuleContentFingerprint(
  rules: ReadonlyArray<ApprovedRuleContent>,
): Promise<string> {
  // Match SQL: missing evidenceStatus is excluded (fail-closed), not treated as approved.
  const parts = rules
    .filter((r) => r.evidenceStatus === 'approved')
    .map((r) =>
      [
        r.approvalId ?? '',
        r.ruleId,
        String(r.revision ?? 0),
        'approved',
        pgJsonbText(r.deductions ?? null),
        pgJsonbText(r.allowances ?? null),
        pgJsonbText(r.applicability ?? null),
      ].join('|'),
    )
    .sort();
  const canonical = parts.join(';');
  if (canonical.length < 4) return '';
  return sha256Hex(canonical);
}

/** Fingerprint of approved machining settings + stocks + rule content (SQL parity). */
export async function authorityContentFingerprint(input: {
  manufacturingSettings: Record<string, unknown> | { sawKerfMm: number; trimCutMm: number };
  permittedStockLengths: number[];
  cuttingRules: ReadonlyArray<ApprovedRuleContent>;
}): Promise<string> {
  const rulesFp = await approvedRuleContentFingerprint(input.cuttingRules);
  const stocks = [...input.permittedStockLengths]
    .filter((s) => s > 0)
    .sort((a, b) => a - b)
    .join(',');
  // Mirror SQL: coalesce(authority->'manufacturingSettings', '{}')::text
  const settings = pgJsonbText(input.manufacturingSettings ?? {});
  const canonical = [settings, `stocks=${stocks}`, `rules=${rulesFp}`].join('||');
  return sha256Hex(canonical);
}
