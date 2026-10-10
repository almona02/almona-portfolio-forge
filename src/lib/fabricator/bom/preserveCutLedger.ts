/**
 * Canonical manufacturing cut-ledger preservation (AICS-001).
 *
 * Pricing / quantity saves may keep a non-empty ledger only when the design
 * fingerprint is unchanged. Design changes must supply a new ledger or
 * explicitly invalidate (clear) the ledger and optimization.
 *
 * Reconciliation uses exact profile/length/angle multiset parity, not counts alone.
 */

import { createHash } from 'node:crypto';
import type { WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';

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
  return createHash('sha256').update(JSON.stringify(sortedKeys(payload)), 'utf8').digest('hex');
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
