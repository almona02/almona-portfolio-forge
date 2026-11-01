/**
 * Physical owned-bar inventory for production packing.
 * AICS-001: never certify floor(metres / barLength) as authoritative bar counts.
 * Counts must come from piece/bar intake (bar_count + bar_length) by profile × length × lot.
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
  lotId?: string | null;
  /** available | reserved | depleted | consumed */
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
  lotId?: string | null;
  status?: string | null;
  isTestStock?: boolean;
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

function isInbound(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'in' || t === 'intake' || t === 'purchase' || t === 'opening' || t === 'adjustment_in' || t === 'return';
}

function isOutbound(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'out' || t === 'consume' || t === 'consumption' || t === 'sale' || t === 'adjustment_out' || t === 'scrap';
}

/**
 * Net available bars by owned profile × length from movement ledger.
 * Metres-only movements (no bar_count / bar_length) are ignored — they cannot
 * establish physical composition.
 */
export function netPhysicalBarsFromMovements(
  movements: readonly PhysicalBarMovement[],
): OwnedBarLot[] {
  const net = new Map<string, OwnedBarLot>();
  for (const m of movements) {
    if (m.isTestStock) continue;
    const status = (m.status || 'available').toLowerCase();
    if (status === 'reserved' || status === 'depleted' || status === 'consumed') continue;
    if (m.barCount == null || !Number.isFinite(m.barCount)) continue;
    if (m.barLengthM == null || !(m.barLengthM > 0)) continue;
    const stockLengthMm = Math.round(m.barLengthM * 1000);
    if (stockLengthMm <= 0) continue;
    const key = physicalBarKey(m.profileId, stockLengthMm);
    const lotKey = m.lotId ? `${key}|lot:${m.lotId}` : key;
    const prev = net.get(lotKey) ?? {
      ownedProfileId: m.profileId,
      stockLengthMm,
      availableBars: 0,
      lotId: m.lotId ?? null,
      status: 'available',
      isTestStock: false,
    };
    let delta = 0;
    if (isInbound(m.movementType)) delta = m.barCount;
    else if (isOutbound(m.movementType)) delta = -Math.abs(m.barCount);
    else delta = m.barCount; // signed adjustment
    prev.availableBars += delta;
    net.set(lotKey, prev);
  }

  // Collapse lots of the same profile×length for solver binding (sum available).
  const byLength = new Map<string, OwnedBarLot>();
  for (const lot of net.values()) {
    if (lot.availableBars <= 0) continue;
    const key = physicalBarKey(lot.ownedProfileId, lot.stockLengthMm);
    const prev = byLength.get(key);
    if (!prev) {
      byLength.set(key, { ...lot, lotId: null });
    } else {
      prev.availableBars += lot.availableBars;
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
): PhysicalBarBindResult {
  const reasons: string[] = [];
  const unboundCatalogueCodes: string[] = [];
  const barsByCatalogueLength: Record<string, number> = {};

  const lotsByOwned = new Map<string, OwnedBarLot[]>();
  for (const lot of lots) {
    if (lot.isTestStock) continue;
    if ((lot.status || 'available').toLowerCase() !== 'available') continue;
    if (!Number.isInteger(lot.availableBars) || lot.availableBars < 0) continue;
    const list = lotsByOwned.get(lot.ownedProfileId) ?? [];
    list.push(lot);
    lotsByOwned.set(lot.ownedProfileId, list);
  }

  let anyPhysical = false;
  let anyMapped = false;

  for (const row of report.rows) {
    if (row.mappingStatus !== 'mapped' || !row.ownedProfileId) continue;
    anyMapped = true;
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
      binding: lots.length === 0 ? 'metres_only' : 'unbound',
      barsByCatalogueLength,
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
