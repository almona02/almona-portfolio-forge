/**
 * PR2 — Active-revision BOM demand vs owned stock.
 * Separates missing catalogue→owned mapping from genuine metre shortages.
 * Match by owned UUID or catalogue key + pack + material + finish (not display name alone).
 */

import type { FabricationData, Profile } from '@/types/fabricator';
import { bomStockDemand } from '@/lib/fabricator/inventory/bomStockDemand';
import { isTestStockProfile } from './testStock';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BomDemandRow {
  bomRowId: string;
  catalogueCode: string;
  pack: string;
  material: string;
  finish: string;
  requiredMetres: number;
  ownedProfileId: string | null;
  ownedProfileName: string | null;
  availableMetres: number | null;
  shortageMetres: number;
  mappingStatus: 'mapped' | 'missing_mapping';
  eligibleBarLengthsM: number[];
  isTestStock: boolean;
}

export interface BomDemandReport {
  rows: BomDemandRow[];
  missingMappingCount: number;
  shortageCount: number;
  allMapped: boolean;
  availabilityOk: boolean;
  totalRequiredMetres: number;
  stockVersionByProfile: Record<string, number>;
}

function specString(specs: Record<string, unknown> | undefined, key: string): string {
  const v = specs?.[key];
  return typeof v === 'string' ? v : v != null ? String(v) : '';
}

function ownedMatchKey(parts: {
  catalogueKey: string;
  pack: string;
  material: string;
  finish: string;
}): string {
  return [
    parts.catalogueKey.trim().toLowerCase(),
    parts.pack.trim().toLowerCase(),
    parts.material.trim().toLowerCase(),
    parts.finish.trim().toLowerCase(),
  ].join('|');
}

function profileCatalogueKeys(profile: Profile): string[] {
  const specs = (profile.specifications || {}) as Record<string, unknown>;
  return [
    specString(specs, 'supplierCode'),
    specString(specs, 'internalCode'),
    specString(specs, 'originalCatalogCode'),
    specString(specs, 'catalogAlias'),
    specString(specs, 'profile_number'),
    specString(specs, 'partNumber'),
    profile.id || '',
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function profileFinish(profile: Profile): string {
  const specs = (profile.specifications || {}) as Record<string, unknown>;
  return (specString(specs, 'finish') || profile.color || '').trim();
}

function profilePack(profile: Profile): string {
  const specs = (profile.specifications || {}) as Record<string, unknown>;
  if (specString(specs, 'systemPackId')) return specString(specs, 'systemPackId');
  if (profile.systemPackIds?.[0]) return profile.systemPackIds[0];
  return '';
}

function eligibleBarLengths(profile: Profile, bomRawStockMm?: number): number[] {
  const lengths = new Set<number>();
  const specs = (profile.specifications || {}) as Record<string, unknown>;
  const stockMm = specs.stockLengthMm;
  if (typeof stockMm === 'number' && stockMm > 0) lengths.add(stockMm / 1000);
  if (typeof profile.barLength === 'number' && profile.barLength > 0) {
    lengths.add(profile.barLength > 20 ? profile.barLength / 1000 : profile.barLength);
  }
  if (typeof bomRawStockMm === 'number' && bomRawStockMm > 0) lengths.add(bomRawStockMm / 1000);
  if (lengths.size === 0) lengths.add(6);
  return Array.from(lengths).sort((a, b) => a - b);
}

/**
 * Resolve an owned profile for a BOM line without merging distinct same-name rows.
 */
export function resolveOwnedProfileForBomLine(
  line: FabricationData['profiles'][number],
  owned: Profile[],
): Profile | null {
  const code = (line.profileCode || line.id || '').trim();
  if (UUID_RE.test(code)) {
    return owned.find((p) => p.id === code) ?? null;
  }
  const pack = (line.systemPack || '').trim();
  const material = '';
  const finish = '';
  const needle = ownedMatchKey({
    catalogueKey: code,
    pack,
    material,
    finish,
  });
  // Prefer exact catalogue+pack+material+finish; allow pack-only catalogue match when finish/material empty on BOM.
  const exact = owned.find((p) => {
    const keys = profileCatalogueKeys(p);
    if (!keys.includes(code.toLowerCase())) return false;
    return ownedMatchKey({
      catalogueKey: code,
      pack: profilePack(p),
      material: (p.material || '').toLowerCase(),
      finish: profileFinish(p),
    }) === ownedMatchKey({
      catalogueKey: code,
      pack: pack || profilePack(p),
      material: (p.material || '').toLowerCase(),
      finish: profileFinish(p),
    });
  });
  if (exact) return exact;

  const byCodeAndPack = owned.filter((p) => {
    const keys = profileCatalogueKeys(p);
    if (!keys.includes(code.toLowerCase())) return false;
    if (pack && profilePack(p) && profilePack(p).toLowerCase() !== pack.toLowerCase()) return false;
    return true;
  });
  if (byCodeAndPack.length === 1) return byCodeAndPack[0];
  // Ambiguous catalogue matches count as missing mapping (do not guess).
  void needle;
  return null;
}

export function buildBomDemandReport(
  bomProfiles: FabricationData['profiles'],
  ownedInventory: Profile[],
): BomDemandReport {
  if (!bomProfiles.length) {
    throw new Error('BOM has no physical profile ledger.');
  }

  // Prefer UUID demand aggregation when every line already maps to owned UUIDs.
  let uuidDemand: Record<string, number> | null = null;
  try {
    uuidDemand = bomStockDemand(bomProfiles);
  } catch {
    uuidDemand = null;
  }

  const rows: BomDemandRow[] = [];
  const stockVersionByProfile: Record<string, number> = {};

  if (uuidDemand) {
    for (const [ownedId, requiredMetres] of Object.entries(uuidDemand)) {
      const owned = ownedInventory.find((p) => p.id === ownedId) ?? null;
      const sample = bomProfiles.find(
        (p) => (p.profileCode || p.id) === ownedId || p.id === ownedId,
      );
      if (!owned) {
        rows.push({
          bomRowId: sample?.id || ownedId,
          catalogueCode: sample?.profileCode || ownedId,
          pack: sample?.systemPack || '',
          material: '',
          finish: '',
          requiredMetres,
          ownedProfileId: null,
          ownedProfileName: null,
          availableMetres: null,
          shortageMetres: requiredMetres,
          mappingStatus: 'missing_mapping',
          eligibleBarLengthsM: [],
          isTestStock: false,
        });
        continue;
      }
      const available = Number.isFinite(owned.stockQuantity) ? owned.stockQuantity : 0;
      const shortage = Math.max(0, requiredMetres - available);
      const version = typeof owned.stockVersion === 'number' ? owned.stockVersion : 0;
      stockVersionByProfile[owned.id] = version;
      rows.push({
        bomRowId: sample?.id || owned.id,
        catalogueCode:
          specString((owned.specifications || {}) as Record<string, unknown>, 'supplierCode') ||
          owned.name,
        pack: profilePack(owned),
        material: owned.material || '',
        finish: profileFinish(owned),
        requiredMetres,
        ownedProfileId: owned.id,
        ownedProfileName: owned.name,
        availableMetres: available,
        shortageMetres: shortage,
        mappingStatus: 'mapped',
        eligibleBarLengthsM: eligibleBarLengths(owned, sample?.rawStockLength),
        isTestStock: isTestStockProfile(owned),
      });
    }
  } else {
    // Per-line resolve when UUID demand fails (unresolved catalogue codes).
    for (const line of bomProfiles) {
      if (!line.cuttingLengths?.length || line.cuttingLengths.some((l) => !Number.isFinite(l) || l <= 0)) {
        throw new Error(`Profile ${line.id} has an invalid physical cut ledger.`);
      }
      const requiredMetres =
        line.cuttingLengths.reduce((sum, length) => sum + length, 0) / 1000;
      const owned = resolveOwnedProfileForBomLine(line, ownedInventory);
      if (!owned) {
        rows.push({
          bomRowId: line.id,
          catalogueCode: line.profileCode || line.id,
          pack: line.systemPack || '',
          material: '',
          finish: '',
          requiredMetres,
          ownedProfileId: null,
          ownedProfileName: null,
          availableMetres: null,
          shortageMetres: requiredMetres,
          mappingStatus: 'missing_mapping',
          eligibleBarLengthsM: [],
          isTestStock: false,
        });
        continue;
      }
      const available = Number.isFinite(owned.stockQuantity) ? owned.stockQuantity : 0;
      const shortage = Math.max(0, requiredMetres - available);
      stockVersionByProfile[owned.id] =
        typeof owned.stockVersion === 'number' ? owned.stockVersion : 0;
      rows.push({
        bomRowId: line.id,
        catalogueCode: line.profileCode || line.id,
        pack: line.systemPack || profilePack(owned),
        material: owned.material || '',
        finish: profileFinish(owned),
        requiredMetres,
        ownedProfileId: owned.id,
        ownedProfileName: owned.name,
        availableMetres: available,
        shortageMetres: shortage,
        mappingStatus: 'mapped',
        eligibleBarLengthsM: eligibleBarLengths(owned, line.rawStockLength),
        isTestStock: isTestStockProfile(owned),
      });
    }
  }

  const missingMappingCount = rows.filter((r) => r.mappingStatus === 'missing_mapping').length;
  const shortageCount = rows.filter(
    (r) => r.mappingStatus === 'mapped' && r.shortageMetres > 0,
  ).length;
  const allMapped = missingMappingCount === 0;
  const availabilityOk = allMapped && shortageCount === 0;

  return {
    rows,
    missingMappingCount,
    shortageCount,
    allMapped,
    availabilityOk,
    totalRequiredMetres: rows.reduce((s, r) => s + r.requiredMetres, 0),
    stockVersionByProfile,
  };
}

/** Soft acknowledgement is stale when BOM identity or owned stock versions drift. */
export function isStockAcknowledgementStale(options: {
  reservationBomFingerprint: string | null | undefined;
  currentBomFingerprint: string;
  reservationVersions: Record<string, number> | null | undefined;
  currentVersions: Record<string, number>;
}): boolean {
  if (!options.reservationBomFingerprint) return true;
  if (options.reservationBomFingerprint !== options.currentBomFingerprint) return true;
  const reserved = options.reservationVersions || {};
  const current = options.currentVersions || {};
  const ids = new Set([...Object.keys(reserved), ...Object.keys(current)]);
  for (const id of ids) {
    if ((reserved[id] ?? 0) !== (current[id] ?? 0)) return true;
  }
  return false;
}
