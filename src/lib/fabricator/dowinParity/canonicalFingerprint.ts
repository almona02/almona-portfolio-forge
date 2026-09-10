/**
 * FP-024C.1 — Canonical deterministic serialization (test/reference only).
 *
 * Not a manufacturing formula. Does not hash licensed binaries.
 * Timestamps, result IDs, and random UUIDs must not be passed in by callers
 * that are fingerprinting optimizer *input*.
 */

import { createHash } from 'node:crypto';

export class CanonicalEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalEvidenceError';
  }
}

/**
 * Stable JSON: sorted object keys, arrays keep order, null stays null.
 * Undefined keys are omitted. Undefined values are rejected (not coerced).
 */
export function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    throw new CanonicalEvidenceError('undefined is not evidence and must not be canonicalized');
  }
  if (value === null) return null;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (obj[key] === undefined) continue;
      sorted[key] = canonicalize(obj[key]);
    }
    return sorted;
  }
  throw new CanonicalEvidenceError(`unsupported evidence type: ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function fingerprintSha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}
