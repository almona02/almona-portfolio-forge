import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  findSystemPack,
  resolveCatalogProfiles,
  catalogProfilesOrEmpty,
  isCatalogProfileCode,
} from './CatalogResolver';

vi.mock('@/lib/fabricator/customSystemStorage', () => ({
  loadCustomSystems: () => [],
}));

describe('CatalogResolver (UP-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a known catalog pack without substitution', () => {
    const result = findSystemPack('rock60');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.meta.id).toBe('rock60');
    expect(result.source).toBe('catalog');
  });

  it('fails closed on unknown pack id (no ROCK60 / first-pack fallback)', () => {
    const result = findSystemPack('does-not-exist-pack');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNKNOWN_SYSTEM_PACK');
    expect(result.error.message).not.toMatch(/rock60/i);
  });

  it('fails closed when pack id is missing', () => {
    expect(findSystemPack(undefined).ok).toBe(false);
    expect(findSystemPack('').ok).toBe(false);
  });

  it('resolves ROCK60 catalog profiles from template (not empty pack.profiles)', () => {
    const result = resolveCatalogProfiles('rock60');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profiles.length).toBeGreaterThan(0);
    expect(result.profiles.every((p) => isCatalogProfileCode(p.id))).toBe(true);
  });

  it('catalogProfilesOrEmpty returns [] for unknown packs', () => {
    expect(catalogProfilesOrEmpty('nope')).toEqual([]);
  });

  it('treats UUIDs as owned inventory ids, not catalog codes', () => {
    expect(isCatalogProfileCode('RC 6111-8')).toBe(true);
    expect(isCatalogProfileCode('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(false);
  });
});
