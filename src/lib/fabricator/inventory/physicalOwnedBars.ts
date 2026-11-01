/**
 * Physical owned-bar inventory for production packing.
 * AICS-001: never certify floor(metres / barLength) as authoritative bar counts.
 *
 * Reconciliation rules:
 * - Transaction effects are applied from movement_type (not lot_metadata.status filters).
 * - Outbounds without lot ID deduct FIFO from same profile×length lots.
 * - Metres-only outbounds after physical intake invalidate that profile's binding.
 * - Unknown movement types invalidate — they never silently increase stock.
 */

import type { BomDemandReport } from './bomStockAvailability';
import { isTestStockProfile } from './testStock';
import type { Profile } from '@/types/fabricator';

export type PhysicalBarBindingStatus = 'physical' | 'unbound' | 'metres_only';

export interface OwnedBarLot {
  ownedProfileId: string;
  /** Stock length in millimetres (integer). */
  stockLengthMm: number;
  availableBars: number;
  reservedBars?: number;
  lotId?: string | null;
  status?: string;
  isTestStock?: boolean;
}

/** Movement rows that can establish physical bar composition. */
export interface PhysicalBarMovement {
  profileId: string;
  movementType: string;
  /** Signed bar count when intake was pieces/bars; null for metres-only. */
  barCount: number | null;
  /** Bar length in metres when known. */
  barLengthM: number | null;
  /**
   * Optional signed canonical metres (loader may retain for audit). Incomplete
   * adjustments still invalidate physical bindings — metres do not allocate bars.
   */
  canonicalMetres?: number | null;
  lotId?: string | null;
  /**
   * Optional annotation on the row. Must NOT gate whether the transaction applies.
   * Reservation/consumption are movement_type effects.
   */
  status?: string | null;
  isTestStock?: boolean;
  /** ISO timestamp — used for FIFO when present. */
  createdAt?: string | null;
  /**
   * For transfer events: peer profile id. Same-profile + known length is a
   * proven no-op; missing peer or cross-profile without paired evidence is ambiguous.
   */
  transferPeerProfileId?: string | null;
}

export interface PhysicalBarNetResult {
  lots: OwnedBarLot[];
  /** Profiles whose physical composition cannot be trusted for production. */
  invalidatedProfileIds: string[];
  reasons: string[];
}

export function physicalBarKey(profileOrCatalogueId: string, stockLengthMm: number): string {
  return `${profileOrCatalogueId}|${Math.round(stockLengthMm)}`;
}

export function parsePhysicalBarKey(key: string): { id: string; stockLengthMm: number } | null {
  const idx = key.lastIndexOf('|');
  if (idx <= 0) return null;
  const id = key.slice(0, idx);
  const stockLengthMm = Number(key.slice(idx + 1));
  if (!id || !Number.isInteger(stockLengthMm) || stockLengthMm <= 0) return null;
  return { id, stockLengthMm };
}

/** Align with stock_ledger RPC movement_type contract. */
function classifyMovement(type: string):
  | 'inbound'
  | 'outbound'
  | 'reserve'
  | 'release'
  | 'adjustment'
  | 'transfer'
  | 'unknown' {
  const t = type.toLowerCase().trim();
  if (['in', 'intake', 'purchase', 'opening', 'adjustment_in', 'return'].includes(t)) return 'inbound';
  if (['out', 'consume', 'consumption', 'sale', 'adjustment_out', 'scrap', 'production', 'remnant_used', 'damage', 'loss'].includes(t)) {
    return 'outbound';
  }
  if (t === 'reserve' || t === 'reservation') return 'reserve';
  if (t === 'release' || t === 'unreserve' || t === 'reservation_release') return 'release';
  if (t === 'adjustment') return 'adjustment';
  if (t === 'transfer') return 'transfer';
  return 'unknown';
}

function lotBucketKey(profileId: string, stockLengthMm: number, lotId: string | null | undefined): string {
  return `${physicalBarKey(profileId, stockLengthMm)}|lot:${lotId ?? '__pool__'}`;
}

interface LotState {
  ownedProfileId: string;
  stockLengthMm: number;
  lotId: string | null;
  availableBars: number;
  reservedBars: number;
  order: number;
}

function invalidate(
  set: Set<string>,
  reasons: string[],
  profileId: string,
  reason: string,
): void {
  set.add(profileId);
  reasons.push(reason);
}

/**
 * Net available bars by owned profile × length from the full movement ledger.
 * Returns invalidated profiles when composition cannot be established safely.
 */
export function netPhysicalBarsFromMovements(
  movements: readonly PhysicalBarMovement[],
): PhysicalBarNetResult {
  const lots = new Map<string, LotState>();
  const invalidated = new Set<string>();
  const reasons: string[] = [];
  let orderSeq = 0;

  const sorted = [...movements].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : NaN;
    const tb = b.createdAt ? Date.parse(b.createdAt) : NaN;
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    return 0;
  });

  const ensureLot = (profileId: string, stockLengthMm: number, lotId: string | null): LotState => {
    const key = lotBucketKey(profileId, stockLengthMm, lotId);
    let state = lots.get(key);
    if (!state) {
      state = {
        ownedProfileId: profileId,
        stockLengthMm,
        lotId,
        availableBars: 0,
        reservedBars: 0,
        order: orderSeq++,
      };
      lots.set(key, state);
    }
    return state;
  };

  const lotsForLength = (profileId: string, stockLengthMm: number): LotState[] =>
    Array.from(lots.values())
      .filter((l) => l.ownedProfileId === profileId && l.stockLengthMm === stockLengthMm)
      .sort((a, b) => a.order - b.order);

  const deductFifo = (profileId: string, stockLengthMm: number, qty: number, from: 'available' | 'reserved'): number => {
    let remaining = qty;
    for (const lot of lotsForLength(profileId, stockLengthMm)) {
      if (remaining <= 0) break;
      const field = from === 'available' ? 'availableBars' : 'reservedBars';
      const take = Math.min(lot[field], remaining);
      lot[field] -= take;
      remaining -= take;
    }
    return remaining;
  };

  const clearProfileLots = (profileId: string) => {
    for (const [key, lot] of lots) {
      if (lot.ownedProfileId === profileId) lots.delete(key);
    }
  };

  for (const m of sorted) {
    if (m.isTestStock) continue;
    const kind = classifyMovement(m.movementType);
    const hasBars =
      m.barCount != null
      && Number.isFinite(m.barCount)
      && Number.isInteger(m.barCount)
      && m.barLengthM != null
      && m.barLengthM > 0;

    // Metres-only (or non-integer bar) event — composition cannot be allocated by length.
    if (!hasBars) {
      if (
        kind === 'outbound'
        || kind === 'reserve'
        || kind === 'unknown'
        || kind === 'adjustment'
        || kind === 'transfer'
        || kind === 'release'
      ) {
        invalidate(
          invalidated,
          reasons,
          m.profileId,
          `${m.profileId}: metres-only or incomplete ${m.movementType || 'event'} (canonicalMetres=${m.canonicalMetres ?? 'n/a'}) — physical binding invalidated.`,
        );
        clearProfileLots(m.profileId);
      }
      // Metres-only inbound does not establish bars and does not by itself invalidate.
      continue;
    }

    if (invalidated.has(m.profileId)) continue;

    const stockLengthMm = Math.round(m.barLengthM! * 1000);
    if (stockLengthMm <= 0) {
      invalidate(invalidated, reasons, m.profileId, `${m.profileId}: invalid bar length.`);
      clearProfileLots(m.profileId);
      continue;
    }

    const count = m.barCount as number;
    if (count < 0 && kind !== 'adjustment') {
      invalidate(invalidated, reasons, m.profileId, `${m.profileId}: negative bar_count on ${m.movementType}.`);
      clearProfileLots(m.profileId);
      continue;
    }

    const lotId = m.lotId ?? null;

    if (kind === 'unknown') {
      invalidate(
        invalidated,
        reasons,
        m.profileId,
        `${m.profileId}: unknown movement type "${m.movementType}" — physical binding invalidated.`,
      );
      clearProfileLots(m.profileId);
      continue;
    }

    if (kind === 'transfer') {
      const peer = m.transferPeerProfileId ?? null;
      // Proven harmless: same-profile transfer with known physical length (no net change).
      if (peer && peer === m.profileId) {
        continue;
      }
      invalidate(
        invalidated,
        reasons,
        m.profileId,
        peer
          ? `${m.profileId}: cross-profile transfer to ${peer} without paired same-length evidence — physical binding invalidated.`
          : `${m.profileId}: ambiguous transfer without same-scope peer — physical binding invalidated.`,
      );
      clearProfileLots(m.profileId);
      continue;
    }

    if (kind === 'inbound') {
      const lot = ensureLot(m.profileId, stockLengthMm, lotId);
      lot.availableBars += Math.abs(count);
      continue;
    }

    if (kind === 'adjustment') {
      const lot = ensureLot(m.profileId, stockLengthMm, lotId);
      lot.availableBars += count; // signed
      if (lot.availableBars < 0) {
        const overflow = -lot.availableBars;
        lot.availableBars = 0;
        const rem = deductFifo(m.profileId, stockLengthMm, overflow, 'available');
        if (rem > 0) {
          invalidate(
            invalidated,
            reasons,
            m.profileId,
            `${m.profileId}: adjustment overdrew physical bars at ${stockLengthMm} mm.`,
          );
          clearProfileLots(m.profileId);
        }
      }
      continue;
    }

    if (kind === 'outbound') {
      const qty = Math.abs(count);
      if (lotId) {
        const lot = ensureLot(m.profileId, stockLengthMm, lotId);
        const take = Math.min(lot.availableBars, qty);
        lot.availableBars -= take;
        const rem = qty - take;
        if (rem > 0) {
          const still = deductFifo(m.profileId, stockLengthMm, rem, 'available');
          if (still > 0) {
            invalidate(
              invalidated,
              reasons,
              m.profileId,
              `${m.profileId}: consumption of ${qty} × ${stockLengthMm} mm exceeds physical lots.`,
            );
            clearProfileLots(m.profileId);
          }
        }
      } else {
        // Unassigned outbound: FIFO across lots of this profile×length (never discard negatives alone).
        const rem = deductFifo(m.profileId, stockLengthMm, qty, 'available');
        if (rem > 0) {
          invalidate(
            invalidated,
            reasons,
            m.profileId,
            `${m.profileId}: unassigned consumption of ${qty} × ${stockLengthMm} mm exceeds physical lots.`,
          );
          clearProfileLots(m.profileId);
        }
      }
      continue;
    }

    if (kind === 'reserve') {
      const qty = Math.abs(count);
      const target = lotId ? ensureLot(m.profileId, stockLengthMm, lotId) : null;
      let remaining = qty;
      if (target) {
        const take = Math.min(target.availableBars, remaining);
        target.availableBars -= take;
        target.reservedBars += take;
        remaining -= take;
      }
      if (remaining > 0) {
        // FIFO from other lots' available → credit reserved on pool
        for (const lot of lotsForLength(m.profileId, stockLengthMm)) {
          if (remaining <= 0) break;
          if (target && lot === target) continue;
          const take = Math.min(lot.availableBars, remaining);
          lot.availableBars -= take;
          lot.reservedBars += take;
          remaining -= take;
        }
      }
      if (remaining > 0) {
        invalidate(
          invalidated,
          reasons,
          m.profileId,
          `${m.profileId}: reservation of ${qty} × ${stockLengthMm} mm exceeds available bars.`,
        );
        clearProfileLots(m.profileId);
      }
      continue;
    }

    if (kind === 'release') {
      const qty = Math.abs(count);
      const target = lotId ? ensureLot(m.profileId, stockLengthMm, lotId) : null;
      let remaining = qty;
      if (target) {
        const take = Math.min(target.reservedBars, remaining);
        target.reservedBars -= take;
        target.availableBars += take;
        remaining -= take;
      }
      if (remaining > 0) {
        for (const lot of lotsForLength(m.profileId, stockLengthMm)) {
          if (remaining <= 0) break;
          if (target && lot === target) continue;
          const take = Math.min(lot.reservedBars, remaining);
          lot.reservedBars -= take;
          lot.availableBars += take;
          remaining -= take;
        }
      }
      if (remaining > 0) {
        invalidate(
          invalidated,
          reasons,
          m.profileId,
          `${m.profileId}: release of ${qty} × ${stockLengthMm} mm exceeds reserved bars.`,
        );
        clearProfileLots(m.profileId);
      }
    }
  }

  const out: OwnedBarLot[] = [];
  for (const lot of lots.values()) {
    if (invalidated.has(lot.ownedProfileId)) continue;
    if (lot.availableBars <= 0 && (lot.reservedBars ?? 0) <= 0) continue;
    if (!Number.isInteger(lot.availableBars) || lot.availableBars < 0) {
      invalidate(invalidated, reasons, lot.ownedProfileId, `${lot.ownedProfileId}: non-integer or negative available bars.`);
      continue;
    }
    out.push({
      ownedProfileId: lot.ownedProfileId,
      stockLengthMm: lot.stockLengthMm,
      availableBars: lot.availableBars,
      reservedBars: lot.reservedBars,
      lotId: lot.lotId,
      status: lot.reservedBars > 0 && lot.availableBars === 0 ? 'reserved' : 'available',
      isTestStock: false,
    });
  }

  // Drop lots for newly invalidated profiles
  const clean = out.filter((l) => !invalidated.has(l.ownedProfileId));

  return {
    lots: clean,
    invalidatedProfileIds: Array.from(invalidated),
    reasons: Array.from(new Set(reasons)),
  };
}

/**
 * Collapse available bars by profile×length for solver binding (sum lots).
 * Reserved bars are excluded. Provenance lots remain on the detailed `lots` array.
 */
export function availableLotsByProfileLength(lots: readonly OwnedBarLot[]): OwnedBarLot[] {
  const byLength = new Map<string, OwnedBarLot>();
  for (const lot of lots) {
    if (lot.isTestStock) continue;
    if ((lot.status || 'available') === 'reserved' && lot.availableBars <= 0) continue;
    if (!Number.isInteger(lot.availableBars) || lot.availableBars <= 0) continue;
    const key = physicalBarKey(lot.ownedProfileId, lot.stockLengthMm);
    const prev = byLength.get(key);
    if (!prev) {
      byLength.set(key, {
        ownedProfileId: lot.ownedProfileId,
        stockLengthMm: lot.stockLengthMm,
        availableBars: lot.availableBars,
        lotId: lot.lotId ?? null,
        status: 'available',
      });
    } else {
      prev.availableBars += lot.availableBars;
      // Multiple lots → drop single lot provenance on the aggregate row.
      if (prev.lotId !== (lot.lotId ?? null)) prev.lotId = null;
    }
  }
  return Array.from(byLength.values());
}

export interface PhysicalBarBindResult {
  binding: PhysicalBarBindingStatus;
  /** Keys: catalogueCode|lengthMm, bomRowId|lengthMm, ownedProfileId|lengthMm */
  barsByCatalogueLength: Record<string, number>;
  unboundCatalogueCodes: string[];
  reasons: string[];
}

/**
 * Bind demand rows to physical lots for the lengths we actually own.
 * Does not invent counts from availableMetres.
 */
export function bindPhysicalBarsForDemand(
  report: BomDemandReport,
  lots: readonly OwnedBarLot[],
  ownedById: ReadonlyMap<string, Profile> = new Map(),
  options: { invalidatedProfileIds?: readonly string[] } = {},
): PhysicalBarBindResult {
  const reasons: string[] = [];
  const unboundCatalogueCodes: string[] = [];
  const barsByCatalogueLength: Record<string, number> = {};
  const invalidated = new Set(options.invalidatedProfileIds ?? []);

  const aggregate = availableLotsByProfileLength(lots);
  const lotsByOwned = new Map<string, OwnedBarLot[]>();
  for (const lot of aggregate) {
    const list = lotsByOwned.get(lot.ownedProfileId) ?? [];
    list.push(lot);
    lotsByOwned.set(lot.ownedProfileId, list);
  }

  let anyPhysical = false;
  let anyMapped = false;

  for (const row of report.rows) {
    if (row.mappingStatus !== 'mapped' || !row.ownedProfileId) continue;
    anyMapped = true;
    if (invalidated.has(row.ownedProfileId)) {
      unboundCatalogueCodes.push(row.catalogueCode);
      reasons.push(`${row.catalogueCode}: physical ledger invalidated for owned profile ${row.ownedProfileId}.`);
      continue;
    }
    if (row.isTestStock || isTestStockProfile(ownedById.get(row.ownedProfileId) ?? ({ id: row.ownedProfileId } as Profile))) {
      unboundCatalogueCodes.push(row.catalogueCode);
      reasons.push(`${row.catalogueCode}: test-stock lots cannot bind production bars.`);
      continue;
    }
    const ownedLots = lotsByOwned.get(row.ownedProfileId) ?? [];
    if (ownedLots.length === 0) {
      unboundCatalogueCodes.push(row.catalogueCode);
      reasons.push(
        `${row.catalogueCode}: no physical bar lots (profile×length) — metres-only balance is not a bar count.`,
      );
      continue;
    }
    anyPhysical = true;
    for (const lot of ownedLots) {
      const keys = [
        physicalBarKey(row.catalogueCode, lot.stockLengthMm),
        physicalBarKey(row.bomRowId, lot.stockLengthMm),
        physicalBarKey(row.ownedProfileId, lot.stockLengthMm),
      ];
      for (const key of keys) {
        barsByCatalogueLength[key] = Math.min(
          barsByCatalogueLength[key] ?? Number.POSITIVE_INFINITY,
          lot.availableBars,
        );
      }
    }
  }

  for (const [key, value] of Object.entries(barsByCatalogueLength)) {
    if (!Number.isFinite(value)) delete barsByCatalogueLength[key];
  }

  if (!anyMapped) {
    return {
      binding: 'unbound',
      barsByCatalogueLength: {},
      unboundCatalogueCodes,
      reasons: reasons.length ? reasons : ['No catalogue profiles are mapped to owned stock.'],
    };
  }

  if (unboundCatalogueCodes.length > 0 || !anyPhysical) {
    return {
      binding: lots.length === 0 && invalidated.size === 0 ? 'metres_only' : 'unbound',
      barsByCatalogueLength: {},
      unboundCatalogueCodes: Array.from(new Set(unboundCatalogueCodes)),
      reasons,
    };
  }

  return {
    binding: 'physical',
    barsByCatalogueLength,
    unboundCatalogueCodes: [],
    reasons: [],
  };
}

/**
 * Resolve available bars for a design profile at the operator-selected stock length.
 * Returns null when the binding does not establish a count for that length.
 */
export function availableBarsForSelectedLength(
  barsByCatalogueLength: Readonly<Record<string, number>> | null | undefined,
  ids: readonly string[],
  stockLengthMm: number,
): number | null {
  if (!barsByCatalogueLength) return null;
  let found: number | null = null;
  for (const id of ids) {
    if (!id) continue;
    const key = physicalBarKey(id, stockLengthMm);
    const count = barsByCatalogueLength[key];
    if (Number.isInteger(count) && count >= 0) {
      found = found == null ? count : Math.min(found, count);
    }
  }
  return found;
}
