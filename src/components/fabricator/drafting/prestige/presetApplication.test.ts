import { describe, expect, it } from 'vitest';
import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';
import {
  applyPresetIntelligence,
  InvalidPresetGridPatternError,
  parseGridPattern,
} from './presetApplication';

function preset(gridPattern: string): ArchitecturalPreset {
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
  };
}

describe('presetApplication', () => {
  it('parses one explicit grid deterministically', () => {
    expect(parseGridPattern('2x2 asymmetrical')).toEqual({
      rows: 2,
      cols: 2,
      isAsymmetrical: true,
    });
  });

  it.each([
    'Custom geometric (8-pointed star)',
    '2x1 or 1x1 standard',
    '0x2',
    '21x1',
    'NaNx2',
  ])('rejects non-executable grid pattern %s', (gridPattern) => {
    expect(() => applyPresetIntelligence(preset(gridPattern), 1210, 1550))
      .toThrow(InvalidPresetGridPatternError);
  });

  it('creates dimensions that close exactly to the authoritative opening', () => {
    const result = applyPresetIntelligence(preset('1x2 symmetrical'), 1210, 1550);

    expect(result.windowGrid.cells).toHaveLength(2);
    expect(result.windowGrid.colWidths).toEqual([605, 605]);
    expect(result.windowGrid.rowHeights).toEqual([1550]);
    expect(result.windowGrid.colWidths?.reduce((sum, width) => sum + width, 0)).toBe(1210);
  });
});
