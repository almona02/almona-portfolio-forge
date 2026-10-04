/**
 * FP-028 / Phase 0 — ROCK 60 evidence tags must classify catalog rules.
 */
import { describe, expect, it } from 'vitest';
import { ROCK60_SYSTEM_PACK } from '../systemPacks';
import {
  ROCK60_EVIDENCE_TAGS,
  getRock60EvidenceTag,
  listRock60RulesByStatus,
  rock60HasManufacturingAuthority,
} from '../rock60Evidence';

describe('FP-028 / ROCK60 evidence tags', () => {
  it('tags every manufacturing-adjacent ROCK 60 rule area', () => {
    const ids = ROCK60_EVIDENCE_TAGS.map((t) => t.ruleId);
    expect(ids).toEqual(
      expect.arrayContaining([
        'drawing_reference',
        'stock_length_mm',
        'legacy_profiles_cutting_list',
        'rock60_45_degree_config',
        'glass_cutting',
        'accessories_list',
        'default_grid',
        'smart_draw_preset',
        'glass_allowances',
      ])
    );
    expect(ROCK60_EVIDENCE_TAGS.every((t) => t.path.length > 0 && t.note.length > 0)).toBe(true);
  });

  it('marks cut formulas pending external fixture (not evidence_backed yet)', () => {
    expect(getRock60EvidenceTag('rock60_45_degree_config')?.status).toBe(
      'pending_external_fixture'
    );
    expect(getRock60EvidenceTag('legacy_profiles_cutting_list')?.status).toBe(
      'pending_external_fixture'
    );
    expect(getRock60EvidenceTag('glass_cutting')?.status).toBe('pending_external_fixture');
    expect(getRock60EvidenceTag('stock_length_mm')?.status).toBe('illustrative');
    expect(getRock60EvidenceTag('default_grid')?.status).toBe('illustrative');
  });

  it('documents that catalog ROCK 60 currently has zero evidence_backed rules', () => {
    expect(listRock60RulesByStatus('evidence_backed')).toHaveLength(0);
    expect(rock60HasManufacturingAuthority()).toBe(false);
    expect(ROCK60_SYSTEM_PACK.meta.id).toBe('rock60');
    expect(ROCK60_SYSTEM_PACK.windowSystemSpec?.drawing_reference).toBe(
      'Page 24 - Draft Shop Drawing'
    );
  });
});
