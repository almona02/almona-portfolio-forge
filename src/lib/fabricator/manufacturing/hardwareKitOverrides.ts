/**
 * Workshop overrides for system-pack hardware_kits (accessories).
 * Admin/settings UI writes unit_price (and optional name) per pack+kit;
 * BOM merge applies these so catalogue TypeScript packs stay immutable.
 *
 * Storage: localStorage (workshop device). Keyed by systemPackId → kitId.
 */

const STORAGE_KEY = 'almona_hardware_kit_overrides_v1';

export type HardwareKitOverride = {
  unit_price?: number;
  name?: string;
  updatedAt?: string;
};

export type HardwareKitOverridesMap = Record<string, Record<string, HardwareKitOverride>>;

export type PackHardwareKitLike = {
  id?: string;
  name?: string;
  unit_price?: number;
  type?: string;
  specifications?: Record<string, unknown>;
  currency?: string;
  pricing_status?: string;
  [key: string]: unknown;
};

export function loadHardwareKitOverrides(): HardwareKitOverridesMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as HardwareKitOverridesMap;
  } catch {
    return {};
  }
}

export function saveHardwareKitOverrides(map: HardwareKitOverridesMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function setHardwareKitOverride(
  systemPackId: string,
  kitId: string,
  patch: HardwareKitOverride,
): HardwareKitOverridesMap {
  const map = loadHardwareKitOverrides();
  const pack = { ...(map[systemPackId] || {}) };
  const prev = pack[kitId] || {};
  pack[kitId] = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  map[systemPackId] = pack;
  saveHardwareKitOverrides(map);
  return map;
}

export function clearHardwareKitOverride(systemPackId: string, kitId: string): HardwareKitOverridesMap {
  const map = loadHardwareKitOverrides();
  const pack = { ...(map[systemPackId] || {}) };
  delete pack[kitId];
  if (Object.keys(pack).length === 0) {
    delete map[systemPackId];
  } else {
    map[systemPackId] = pack;
  }
  saveHardwareKitOverrides(map);
  return map;
}

/** Apply workshop overrides onto catalogue kit rows (immutable input). */
export function mergeHardwareKitsWithOverrides(
  systemPackId: string,
  kits: PackHardwareKitLike[],
  overrides: HardwareKitOverridesMap = loadHardwareKitOverrides(),
): PackHardwareKitLike[] {
  const packOverrides = overrides[systemPackId] || {};
  return kits.map((kit) => {
    const id = kit.id;
    if (!id || !packOverrides[id]) return kit;
    const o = packOverrides[id];
    return {
      ...kit,
      ...(typeof o.unit_price === 'number' && Number.isFinite(o.unit_price) && o.unit_price > 0
        ? { unit_price: o.unit_price }
        : {}),
      ...(typeof o.name === 'string' && o.name.trim() ? { name: o.name.trim() } : {}),
    };
  });
}

export function listKitsFromPackSpec(
  windowSystemSpec: Record<string, unknown> | undefined,
): PackHardwareKitLike[] {
  const kits = windowSystemSpec?.hardware_kits;
  return Array.isArray(kits) ? (kits as PackHardwareKitLike[]) : [];
}
