import { describe, expect, it } from 'vitest';
import {
  applyAppearanceConfirmations,
  seedMeasuringAppearance,
} from './measuringAppearance';

describe('seedMeasuringAppearance', () => {
  it('maps hex into the Select but still requires confirmation before save', () => {
    const seed = seedMeasuringAppearance({
      color: '#FFFFFF',
      glazingType: 'double',
      glassColor: 'clear',
    });
    expect(seed.color).toBe('White');
    expect(seed.suggestions.some((s) => s.kind === 'color' && s.raw === '#FFFFFF')).toBe(true);
    const blocked = applyAppearanceConfirmations(seed, seed.suggestions, new Set());
    expect(blocked.blocked.some((b) => b.kind === 'color')).toBe(true);
  });

  it('preserves unknown color and suggests a default', () => {
    const seed = seedMeasuringAppearance({
      color: 'RAL7016',
      glazingType: 'single',
      defaultColor: 'Anthracite Grey',
    });
    expect(seed.color).toBe('RAL7016');
    expect(seed.suggestions[0]?.suggested).toBe('Anthracite Grey');
  });

  it('demotes tint-like glazing.type to glassColor and suggests catalog glazing', () => {
    const seed = seedMeasuringAppearance({
      color: 'White',
      glazingType: 'clear',
      defaultGlazingType: 'double',
    });
    expect(seed.glassColor).toBe('clear');
    expect(seed.glazingType).toBe('double');
    expect(seed.suggestions.some((s) => s.kind === 'glazingType')).toBe(true);
  });

  it('applies confirmations only for checked kinds', () => {
    const seed = seedMeasuringAppearance({
      color: '#000000',
      glazingType: 'clear',
      defaultGlazingType: 'double',
    });
    const partial = applyAppearanceConfirmations(
      seed,
      seed.suggestions,
      new Set(['color']),
    );
    expect(partial.color).toBe('Black');
    expect(partial.blocked.some((b) => b.kind === 'glazingType')).toBe(true);

    const full = applyAppearanceConfirmations(
      seed,
      seed.suggestions,
      new Set(['color', 'glazingType']),
    );
    expect(full.color).toBe('Black');
    expect(full.glazingType).toBe('double');
    expect(full.blocked).toHaveLength(0);
  });
});
