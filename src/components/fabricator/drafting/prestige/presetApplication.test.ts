import { describe, expect, it } from 'vitest';
import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';
import { applyPresetIntelligence } from './presetApplication';
import { SIMPLE_PRESETS } from './simplePresetsData';

describe('presetApplication', () => {
  it('maps penthouse preset to real Egyptian pattern grid', () => {
    const preset = SIMPLE_PRESETS.find((item) => item.id === 'penthouse_panorama');
    expect(preset).toBeDefined();

    const result = applyPresetIntelligence(preset!, 2800, 1900);

    expect(result.windowGrid.rows).toBe(1);
    expect(result.windowGrid.cols).toBe(3);
    expect(result.windowGrid.cells.some((cell) => cell.type === 'fixed')).toBe(true);
    expect(result.recommendedSystem.length).toBeGreaterThan(0);
  });

  it('falls back to deterministic parser for unknown preset ids', () => {
    const customPreset: ArchitecturalPreset = {
      id: 'custom_unknown_preset',
      title: 'Custom Unknown',
      description: 'Fallback parser should be used',
      icon: 'C',
      complexity: 'Basic',
      intelligence: {
        gridPattern: '2x2 asymmetrical',
        systemRecommendation: 'rock60',
        materialRecommendation: 'UPVC',
      },
      applications: ['test'],
      pricingTier: 'Local',
    };

    const result = applyPresetIntelligence(customPreset, 1600, 1600);
    expect(result.windowGrid.rows).toBe(2);
    expect(result.windowGrid.cols).toBe(2);
    expect(result.windowGrid.colWidths).toEqual([1, 1.2]);
    expect(result.windowGrid.rowHeights).toEqual([1, 1]);
  });
});
