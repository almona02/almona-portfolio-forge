import { describe, expect, it } from 'vitest';
import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';
import {
  applyPresetIntelligence,
  parseGridPattern,
} from './presetApplication';

function preset(
  gridPattern: string,
  withSchema = false,
): ArchitecturalPreset {
  return {
    id: 'test-template',
    title: 'Test template',
    description: 'Test',
    icon: '',
    complexity: 'Basic',
    intelligence: {
      gridPattern,
      systemRecommendation: 'rock60',
      materialRecommendation: 'aluminum',
    },
    applications: [],
    pricingTier: 'Local',
    ...(withSchema
      ? {
          templateSchema: {
            version: 1,
            status: 'selectable' as const,
            evidenceStatus: 'illustrative' as const,
            compatibleSystemPackIds: ['rock60'],
            grid: {
              rows: 1,
              cols: 2,
              cells: [
                { id: 'a', row: 0, col: 0, type: 'fixed' as const },
                { id: 'b', row: 0, col: 1, type: 'fixed' as const },
              ],
              colWidths: [1, 1],
              rowHeights: [1],
            },
          },
        }
      : {}),
  };
}

describe('presetApplication', () => {
  it('parses one explicit grid deterministically', () => {
    const parsed = parseGridPattern('2x2 asymmetrical');
    expect(parsed).toEqual({
      ok: true,
      pattern: {
        rows: 2,
        cols: 2,
        isAsymmetrical: true,
      },
    });
  });

  it.each([
    ['Custom geometric (8-pointed star)', 'UNPARSEABLE_GRID_PATTERN'],
    ['2x1 or 1x1 standard', 'AMBIGUOUS_GRID_PATTERN'],
    ['0x2', 'NON_POSITIVE_GRID_DIMENSIONS'],
    ['NaNx2', 'UNPARSEABLE_GRID_PATTERN'],
  ] as const)('rejects non-executable grid pattern %s', (gridPattern, code) => {
    const parsed = parseGridPattern(gridPattern);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe(code);

    // Without a versioned template schema, apply must fail closed (no invented grid).
    const result = applyPresetIntelligence(preset(gridPattern), 1210, 1550);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TEMPLATE_SCHEMA_MISSING');
    expect(result).not.toHaveProperty('windowGrid');
  });

  it('creates dimensions that close exactly to the authoritative opening', () => {
    const result = applyPresetIntelligence(preset('1x2 symmetrical', true), 1210, 1550);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.windowGrid.cells).toHaveLength(2);
    expect(result.windowGrid.colWidths).toEqual([605, 605]);
    expect(result.windowGrid.rowHeights).toEqual([1550]);
    expect(result.windowGrid.colWidths?.reduce((sum, width) => sum + width, 0)).toBe(1210);
  });
});
