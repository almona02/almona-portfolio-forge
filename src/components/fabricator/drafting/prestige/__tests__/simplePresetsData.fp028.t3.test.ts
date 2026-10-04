/**
 * FP-028 / Phase 0 / T3
 *
 * Free-text system recommendations do not map reliably to SystemPack IDs.
 * Characterization + fail-closed resolver (exact pack id only).
 */
import { describe, expect, it } from 'vitest';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { SIMPLE_PRESETS } from '../simplePresetsData';
import { resolveSystemRecommendationToPackId } from '../systemRecommendationResolver';

const KNOWN_PACK_IDS = SYSTEM_PACKS.map((p) => p.meta.id);

describe('FP-028 / T3 — free-text recommendations vs pack IDs', () => {
  it('resolves exact pack ids and rejects empty input', () => {
    expect(resolveSystemRecommendationToPackId('rock60', KNOWN_PACK_IDS)).toEqual({
      ok: true,
      packId: 'rock60',
    });
    expect(resolveSystemRecommendationToPackId('ROCK60', KNOWN_PACK_IDS)).toEqual({
      ok: true,
      packId: 'rock60',
    });

    const empty = resolveSystemRecommendationToPackId('  ', KNOWN_PACK_IDS);
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.error.code).toBe('EMPTY_SYSTEM_RECOMMENDATION');
  });

  it('documents defect: catalog SIMPLE_PRESETS recommendations are not pack IDs', () => {
    const unresolved = SIMPLE_PRESETS.map((preset) => {
      const resolved = resolveSystemRecommendationToPackId(
        preset.intelligence.systemRecommendation,
        KNOWN_PACK_IDS
      );
      return {
        presetId: preset.id,
        recommendation: preset.intelligence.systemRecommendation,
        resolved,
      };
    }).filter((row) => !row.resolved.ok);

    // Characterization: every current catalog recommendation fails closed
    expect(unresolved.length).toBe(SIMPLE_PRESETS.length);
    expect(unresolved.map((r) => r.recommendation)).toEqual(
      expect.arrayContaining([
        'Egyptian Standard 45',
        'Caluminium PS v3',
        'YILMAZ Heavy Duty',
        'Custom Caluminium Artisan Series',
      ])
    );

    for (const row of unresolved) {
      if (row.resolved.ok) continue;
      expect(row.resolved.error.code).toBe('UNKNOWN_SYSTEM_PACK_ID');
    }
  });

  it('rejects near-miss marketing strings (no fuzzy alias invention)', () => {
    const nearMisses = [
      'ROCK 60',
      'rock-60',
      'Caluminium PS',
      'caluminium-ps v3',
      'panda',
    ];
    for (const text of nearMisses) {
      const result = resolveSystemRecommendationToPackId(text, KNOWN_PACK_IDS);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe('UNKNOWN_SYSTEM_PACK_ID');
    }
  });

  /**
   * Phase 2 acceptance lock. Remove `.fails` when every selectable preset
   * carries a stable compatible pack ID that resolves.
   */
  it.fails('T3 acceptance: every SIMPLE_PRESET recommendation resolves to a pack ID', () => {
    for (const preset of SIMPLE_PRESETS) {
      const resolved = resolveSystemRecommendationToPackId(
        preset.intelligence.systemRecommendation,
        KNOWN_PACK_IDS
      );
      expect(resolved.ok).toBe(true);
    }
  });
});
