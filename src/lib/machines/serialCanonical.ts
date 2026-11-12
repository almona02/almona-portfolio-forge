/**
 * Machine identity PR1 — serial normalization (Wonder v0.2 / supervisor).
 * Default canonical retains separators. Separator-insensitive form is advisory only.
 */

export const SERIAL_NORMALIZATION_VERSION = 'v1_retain_separators' as const;

/** Display/raw trim only — never invent values. */
export function preserveRawSerial(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Default match key: uppercase + trim; separators kept. */
export function serialCanonicalV1(raw: string | null | undefined): string | null {
  const preserved = preserveRawSerial(raw);
  return preserved == null ? null : preserved.toUpperCase();
}

/**
 * Separator-insensitive form for review-candidate flagging only.
 * MUST NOT assert identity or auto-link records.
 */
export function serialSeparatorInsensitiveV1(raw: string | null | undefined): string | null {
  const canon = serialCanonicalV1(raw);
  if (canon == null) return null;
  return canon.replace(/[\s\-/._]+/g, '');
}

export function wouldFlagSeparatorInsensitiveReview(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ca = serialCanonicalV1(a);
  const cb = serialCanonicalV1(b);
  if (!ca || !cb || ca === cb) return false;
  const sa = serialSeparatorInsensitiveV1(a);
  const sb = serialSeparatorInsensitiveV1(b);
  return Boolean(sa && sb && sa === sb);
}
