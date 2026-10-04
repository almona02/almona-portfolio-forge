/**
 * FP-028 / T3 — Map free-text system recommendations to pack IDs.
 *
 * Fail closed: manufacturing must never invent a pack ID from marketing copy.
 * Exact pack-id match only (case-insensitive). No fuzzy aliases in Phase 0.
 */

export type SystemRecommendationErrorCode =
  | 'EMPTY_SYSTEM_RECOMMENDATION'
  | 'UNKNOWN_SYSTEM_PACK_ID';

export interface SystemRecommendationError {
  code: SystemRecommendationErrorCode;
  message: string;
  recommendation: string;
}

export type ResolveSystemRecommendationResult =
  | { ok: true; packId: string }
  | { ok: false; error: SystemRecommendationError };

/**
 * Resolve a preset systemRecommendation to a known SystemPack meta.id.
 */
export function resolveSystemRecommendationToPackId(
  recommendation: string | undefined | null,
  knownPackIds: readonly string[]
): ResolveSystemRecommendationResult {
  const raw = (recommendation ?? '').trim();
  if (!raw) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_SYSTEM_RECOMMENDATION',
        message: 'System recommendation is empty; no pack ID assigned.',
        recommendation: raw,
      },
    };
  }

  const normalized = raw.toLowerCase();
  const match = knownPackIds.find((id) => id.toLowerCase() === normalized);
  if (!match) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_SYSTEM_PACK_ID',
        message:
          `System recommendation "${raw}" is not a known SystemPack id; ` +
          'manufacturing pack was not assigned.',
        recommendation: raw,
      },
    };
  }

  return { ok: true, packId: match };
}
