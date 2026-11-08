/**
 * Pack-owned pattern certification + default (engineering-class).
 * Catalogue EgyptianPattern.compatibleSystems remains the baseline;
 * owned packs can extend certification via windowSystemSpec without
 * rewriting identity / cut-ledger gates (AICS-001).
 */

import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import type { SystemPack } from '@/types/fabricator';

export const PACK_CERTIFIED_PATTERN_IDS_KEY = 'certified_pattern_ids';
export const PACK_DEFAULT_PATTERN_ID_KEY = 'default_pattern_id';

export type PackPatternConfig = {
  certifiedPatternIds: string[];
  defaultPatternId: string | null;
};

function asSpec(pack: SystemPack | null | undefined): Record<string, unknown> {
  return pack?.windowSystemSpec ?? {};
}

function knownPatternIds(): Set<string> {
  return new Set(EGYPTIAN_PATTERNS.map((p) => p.id));
}

/** Read pack-owned pattern configuration (fail-closed on bad shape). */
export function readPackPatternConfig(pack: SystemPack | null | undefined): PackPatternConfig {
  const spec = asSpec(pack);
  const rawIds = spec[PACK_CERTIFIED_PATTERN_IDS_KEY];
  const certifiedPatternIds: string[] = [];
  if (rawIds != null) {
    if (!Array.isArray(rawIds)) throw new Error('certified_pattern_ids must be a list of pattern ids.');
    const known = knownPatternIds();
    const seen = new Set<string>();
    for (const item of rawIds) {
      if (typeof item !== 'string' || !item.trim()) throw new Error('certified_pattern_ids entries must be non-empty strings.');
      const id = item.trim();
      if (!known.has(id)) throw new Error(`Unknown pattern id "${id}" cannot be certified on a pack.`);
      if (seen.has(id)) throw new Error(`Duplicate certified pattern id "${id}".`);
      seen.add(id);
      certifiedPatternIds.push(id);
    }
  }

  const rawDefault = spec[PACK_DEFAULT_PATTERN_ID_KEY];
  let defaultPatternId: string | null = null;
  if (rawDefault != null && rawDefault !== '') {
    if (typeof rawDefault !== 'string') throw new Error('default_pattern_id must be a string or null.');
    defaultPatternId = rawDefault.trim();
    if (!knownPatternIds().has(defaultPatternId)) {
      throw new Error(`Unknown default pattern id "${defaultPatternId}".`);
    }
  }

  if (defaultPatternId && certifiedPatternIds.length > 0 && !certifiedPatternIds.includes(defaultPatternId)) {
    throw new Error('default_pattern_id must be one of the pack certified_pattern_ids when that list is set.');
  }

  return { certifiedPatternIds, defaultPatternId };
}

/** Write pack-owned pattern configuration into windowSystemSpec. */
export function withPackPatternConfig(pack: SystemPack, config: PackPatternConfig): SystemPack {
  const next: PackPatternConfig = {
    certifiedPatternIds: [...config.certifiedPatternIds],
    defaultPatternId: config.defaultPatternId,
  };
  // Validate via round-trip before mutating.
  const probe = {
    ...pack,
    windowSystemSpec: {
      ...asSpec(pack),
      [PACK_CERTIFIED_PATTERN_IDS_KEY]: next.certifiedPatternIds,
      [PACK_DEFAULT_PATTERN_ID_KEY]: next.defaultPatternId,
    },
  } as SystemPack;
  readPackPatternConfig(probe);
  return probe;
}

export function packOwnsPatternCertification(pack: SystemPack | null | undefined, patternId: string): boolean {
  try {
    return readPackPatternConfig(pack).certifiedPatternIds.includes(patternId);
  } catch {
    return false;
  }
}

export function getDefaultPatternIdForPack(pack: SystemPack | null | undefined): string | null {
  try {
    return readPackPatternConfig(pack).defaultPatternId;
  } catch {
    return null;
  }
}
