/**
 * FP-028 / Phase 0 / T2
 *
 * Invalid and ambiguous template patterns must fail closed.
 * They must never silently become a 1×1 manufacturing grid.
 */
import { describe, expect, it } from 'vitest';
import type { ArchitecturalPreset } from '../ArchitecturalPresetSelector';
import {
  applyPresetIntelligence,
  parseGridPattern,
} from '../presetApplication';

function makePreset(gridPattern: string): ArchitecturalPreset {
  return {
    id: 'fp028-t2-fixture',
    title: 'FP-028 T2 Fixture',
    description: 'Characterization fixture',
    icon: 'test',
    complexity: 'Basic',
    intelligence: {
      gridPattern,
      systemRecommendation: 'rock60',
      materialRecommendation: 'aluminum',
    },
    applications: ['test'],
    pricingTier: 'Standard',
  };
}

describe('FP-028 / T2 — invalid template patterns fail closed', () => {
  it('rejects unparseable patterns instead of inventing 1×1', () => {
    const parsed = parseGridPattern('Custom geometric (8-pointed star)');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe('UNPARSEABLE_GRID_PATTERN');

    const result = applyPresetIntelligence(makePreset('Custom geometric (8-pointed star)'), 1210, 1550);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TEMPLATE_SCHEMA_MISSING');
    expect(result).not.toHaveProperty('windowGrid');
  });

  it('rejects ambiguous multi-size patterns (e.g. "2x1 or 1x1")', () => {
    const parsed = parseGridPattern('2x1 or 1x1 standard');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe('AMBIGUOUS_GRID_PATTERN');

    const result = applyPresetIntelligence(makePreset('2x1 or 1x1 standard'), 1500, 1400);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TEMPLATE_SCHEMA_MISSING');
    expect(result).not.toHaveProperty('windowGrid');
  });

  it('rejects empty and non-positive dimensions', () => {
    expect(parseGridPattern('').ok).toBe(false);
    expect(parseGridPattern('   ').ok).toBe(false);

    const zero = parseGridPattern('0x2');
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error.code).toBe('NON_POSITIVE_GRID_DIMENSIONS');
  });

  it('parses a unique legacy pattern but blocks it from application without a schema', () => {
    const parsed = parseGridPattern('1x2 sliding');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.pattern).toEqual({ rows: 1, cols: 2, isAsymmetrical: false });

    const result = applyPresetIntelligence(makePreset('1x2 sliding'), 1210, 1550);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TEMPLATE_SCHEMA_MISSING');
  });

  it('accepts asymmetrical marker with a single size token', () => {
    const parsed = parseGridPattern('2x2 asymmetrical');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.pattern.isAsymmetrical).toBe(true);
    expect(parsed.pattern.rows).toBe(2);
    expect(parsed.pattern.cols).toBe(2);
  });
});
