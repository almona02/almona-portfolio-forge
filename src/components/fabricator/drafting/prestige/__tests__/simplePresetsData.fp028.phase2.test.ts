import { SYSTEM_PACKS } from '@/data/systemPacks';
import { describe, expect, it } from 'vitest';
import { SIMPLE_PRESETS } from '../simplePresetsData';

const knownPackIds = new Set(SYSTEM_PACKS.map((pack) => pack.meta.id));

describe('FP-028 / Phase 2 normalized preset catalogue', () => {
  it('gives every catalogue entry a versioned status and stable pack IDs', () => {
    for (const preset of SIMPLE_PRESETS) {
      expect(preset.templateSchema?.version).toBe(1);
      for (const packId of preset.templateSchema?.compatibleSystemPackIds ?? []) {
        expect(knownPackIds.has(packId), `${preset.id}: ${packId}`).toBe(true);
      }
    }
  });

  it('gives every selectable template an explicit complete cell schema', () => {
    const selectable = SIMPLE_PRESETS.filter((preset) => preset.templateSchema?.status === 'selectable');
    expect(selectable.length).toBeGreaterThan(0);
    for (const preset of selectable) {
      const grid = preset.templateSchema?.grid;
      expect(grid, preset.id).toBeDefined();
      expect(grid?.cells).toHaveLength((grid?.rows ?? 0) * (grid?.cols ?? 0));
      expect(new Set(grid?.cells.map((cell) => cell.id)).size).toBe(grid?.cells.length);
      expect(preset.templateSchema?.compatibleSystemPackIds.length).toBeGreaterThan(0);
    }
  });

  it('blocks ambiguous and non-rectangular legacy descriptions', () => {
    expect(SIMPLE_PRESETS.find((preset) => preset.id === 'apartment_renovation')?.templateSchema).toMatchObject({
      status: 'blocked',
    });
    expect(SIMPLE_PRESETS.find((preset) => preset.id === 'heritage_geometric')?.templateSchema).toMatchObject({
      status: 'blocked',
    });
  });

  it('contains no unsupported testimonial or certification authority fields', () => {
    for (const preset of SIMPLE_PRESETS) {
      expect(preset.architecturalDetails).not.toHaveProperty('testimonials');
      expect(preset.architecturalDetails).not.toHaveProperty('certifications');
    }
  });
});
