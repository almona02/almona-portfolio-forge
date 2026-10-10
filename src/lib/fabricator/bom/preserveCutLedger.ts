/**
 * Canonical manufacturing cut-ledger preservation (AICS-001).
 *
 * Pricing / quantity saves may keep a non-empty ledger only when the design
 * fingerprint is unchanged. Design changes must supply a new ledger or
 * explicitly invalidate (clear) the ledger and optimization.
 *
 * Reconciliation uses exact profile/length/angle multiset parity, not counts alone.
 */

import type { WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';

/** Sync SHA-256 hex — browser-safe (no node:crypto; Vite client bundle). */
function sha256HexSync(text: string): string {
  const bytes = new TextEncoder().encode(text);
  // FIPS-180-4 SHA-256 (compact, deterministic; used for design fingerprints only).
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = bytes.length * 8;
  const withPad = bytes.length + 1 + 8;
  const blockCount = Math.ceil(withPad / 64);
  const buf = new Uint8Array(blockCount * 64);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(buf.length - 4, bitLen >>> 0, false);
  view.setUint32(buf.length - 8, Math.floor(bitLen / 0x100000000), false);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < blockCount; i += 1) {
    const off = i * 64;
    for (let t = 0; t < 16; t += 1) W[t] = view.getUint32(off + t * 4, false);
    for (let t = 16; t < 64; t += 1) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
}

export type DesignFingerprintInput = {
  overallWidth?: number | null;
  overallHeight?: number | null;
  type?: string | null;
  systemPackId?: string | null;
  presetId?: string | null;
  grid?: WindowGrid | Record<string, unknown> | null;
};

export type MergeLedgerForSaveInput = {
  incoming: readonly WindowComponent[] | null | undefined;
  existing: readonly WindowComponent[] | null | undefined;
  incomingDesignFingerprint: string;
  existingDesignFingerprint: string | null | undefined;
  /** Explicit operator/API clear — empties ledger even when fingerprint matches. */
  intentionalClear?: boolean;
};

export type MergeLedgerForSaveResult = {
  components: WindowComponent[];
  /** True when a previously saved ledger was dropped because design changed or clear was requested. */
  invalidated: boolean;
  /** Fingerprint to persist with the saved ledger (null when ledger empty). */
  designFingerprint: string | null;
  /** True when optimization evidence must be cleared on the pose. */
  clearOptimization: boolean;
};

function sortedKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortedKeys);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const v = (value as Record<string, unknown>)[key];
    if (v === undefined) continue;
    out[key] = sortedKeys(v);
  }
  return out;
}

function gridFingerprintSlice(grid: DesignFingerprintInput['grid']): unknown {
  if (!grid || typeof grid !== 'object') return null;
  const g = grid as WindowGrid & Record<string, unknown>;
  if (!(Number(g.cols) > 0) || !(Number(g.rows) > 0)) return null;
  return {
    cols: Number(g.cols),
    rows: Number(g.rows),
    colWidths: Array.isArray(g.colWidths) ? g.colWidths.map(Number) : null,
    rowHeights: Array.isArray(g.rowHeights) ? g.rowHeights.map(Number) : null,
    cells: Array.isArray(g.cells)
      ? g.cells.map((cell) => ({
          id: String(cell?.id ?? ''),
          row: Number(cell?.row),
          col: Number(cell?.col),
          type: String(cell?.type ?? ''),
        }))
      : [],
  };
}

/** Stable SHA-256 of design-defining pose fields (geometry, pack, grid, type, preset). */
export function designFingerprint(input: DesignFingerprintInput): string {
  const payload = {
    overallWidth: Number(input.overallWidth) || 0,
    overallHeight: Number(input.overallHeight) || 0,
    type: String(input.type ?? ''),
    systemPackId: String(input.systemPackId ?? ''),
    presetId: String(input.presetId ?? ''),
    grid: gridFingerprintSlice(input.grid),
  };
  return sha256HexSync(JSON.stringify(sortedKeys(payload)));
}

export function designFingerprintFromWindowUnit(
  unit: Pick<WindowUnit, 'overallWidth' | 'overallHeight' | 'type' | 'systemPackId' | 'presetId' | 'grid'>,
  gridOverride?: WindowGrid | Record<string, unknown> | null,
): string {
  return designFingerprint({
    overallWidth: unit.overallWidth,
    overallHeight: unit.overallHeight,
    type: unit.type,
    systemPackId: unit.systemPackId,
    presetId: unit.presetId,
    grid: gridOverride ?? unit.grid,
  });
}

export function countLedgerCuts(components: readonly WindowComponent[] | null | undefined): number {
  if (!Array.isArray(components) || components.length === 0) return 0;
  return components.reduce((sum, component) => sum + (component.cuttingLengths?.length ?? 0), 0);
}

/**
 * Exact cut multiset: profileId|length|angle (3 dp). Quantity is multiplicity.
 * Bound callers should include pose revision in error context, not in the key.
 */
export function ledgerCutMultiset(
  components: readonly WindowComponent[] | null | undefined,
): string[] {
  if (!Array.isArray(components) || components.length === 0) return [];
  const keys: string[] = [];
  for (const component of components) {
    const profileId = component.profile?.id;
    if (!profileId || !component.cuttingLengths?.length) continue;
    component.cuttingLengths.forEach((length, index) => {
      const angle = Number(component.angles?.[index] ?? 0);
      keys.push(
        [
          String(profileId),
          Number(length).toFixed(3),
          Number.isFinite(angle) ? String(angle) : '0',
        ].join('|'),
      );
    });
  }
  return keys.sort();
}

export function ledgerMultisetsEqual(
  a: readonly WindowComponent[] | null | undefined,
  b: readonly WindowComponent[] | null | undefined,
): boolean {
  const left = ledgerCutMultiset(a);
  const right = ledgerCutMultiset(b);
  if (left.length !== right.length) return false;
  return left.every((key, index) => key === right[index]);
}

/** Assert exact multiset parity; message includes pose revision when provided. */
export function assertLedgerMultisetParity(
  saved: readonly WindowComponent[] | null | undefined,
  expected: readonly WindowComponent[] | null | undefined,
  context: { poseLabel?: string; revision?: number | null },
): void {
  const left = ledgerCutMultiset(saved);
  const right = ledgerCutMultiset(expected);
  if (left.length === right.length && left.every((key, index) => key === right[index])) return;
  const label = context.poseLabel ?? 'Pose';
  const rev = Number.isInteger(context.revision) ? ` revision ${context.revision}` : '';
  const missing = right.filter((key) => !left.includes(key)).slice(0, 3);
  const extra = left.filter((key) => !right.includes(key)).slice(0, 3);
  throw new Error(
    `${label}${rev}: cut ledger multiset mismatch (saved ${left.length}, expected ${right.length}`
      + `${missing.length ? `; missing ${missing.join(',')}` : ''}`
      + `${extra.length ? `; extra ${extra.join(',')}` : ''}).`,
  );
}

export function wouldClearPersistedLedger(
  incoming: readonly WindowComponent[] | null | undefined,
  existing: readonly WindowComponent[] | null | undefined,
): boolean {
  return countLedgerCuts(incoming) === 0 && countLedgerCuts(existing) > 0;
}

/**
 * Preserve existing ledger only when design fingerprint is unchanged and the
 * caller did not intentionally clear. Design changes with an empty incoming
 * ledger invalidate components + optimization.
 */
export function mergeComponentsForSave(input: MergeLedgerForSaveInput): MergeLedgerForSaveResult {
  const incomingCuts = countLedgerCuts(input.incoming);
  const existingCuts = countLedgerCuts(input.existing);
  const fingerprintMatches =
    Boolean(input.existingDesignFingerprint)
    && input.incomingDesignFingerprint === input.existingDesignFingerprint;

  if (input.intentionalClear) {
    return {
      components: [],
      invalidated: existingCuts > 0,
      designFingerprint: null,
      clearOptimization: true,
    };
  }

  if (incomingCuts > 0) {
    const components = Array.isArray(input.incoming) ? [...input.incoming] : [];
    const designChanged = !fingerprintMatches && existingCuts > 0;
    return {
      components,
      invalidated: false,
      designFingerprint: input.incomingDesignFingerprint,
      clearOptimization: designChanged || !fingerprintMatches,
    };
  }

  if (existingCuts > 0 && fingerprintMatches) {
    return {
      components: Array.isArray(input.existing) ? [...input.existing] : [],
      invalidated: false,
      designFingerprint: input.existingDesignFingerprint ?? input.incomingDesignFingerprint,
      clearOptimization: false,
    };
  }

  if (existingCuts > 0 && !fingerprintMatches) {
    return {
      components: [],
      invalidated: true,
      designFingerprint: null,
      clearOptimization: true,
    };
  }

  return {
    components: Array.isArray(input.incoming) ? [...input.incoming] : [],
    invalidated: false,
    designFingerprint: null,
    clearOptimization: false,
  };
}

/** Keep selected_preset when the caller omits it (undefined), not when they clear it. */
export function mergeSelectedPresetForSave(
  incoming: string | null | undefined,
  existing: string | null | undefined,
): string | null {
  if (incoming !== undefined) return incoming;
  return existing ?? null;
}

export function readCutLedgerDesignFingerprint(
  positionMeta: Record<string, unknown> | null | undefined,
): string | null {
  const raw = positionMeta?.cutLedgerDesignFingerprint;
  return typeof raw === 'string' && raw.length >= 16 ? raw : null;
}

export function withCutLedgerMeta(
  positionMeta: Record<string, unknown> | null | undefined,
  designFingerprint: string | null,
): Record<string, unknown> {
  const next = { ...(positionMeta ?? {}) };
  if (designFingerprint) {
    next.cutLedgerDesignFingerprint = designFingerprint;
  } else {
    delete next.cutLedgerDesignFingerprint;
  }
  return next;
}
