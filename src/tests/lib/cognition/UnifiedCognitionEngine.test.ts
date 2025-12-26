/**
 * Unit tests for UnifiedCognitionEngine
 * 
 * @since Phase 3: Cognitive Intelligence (Week 15)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedCognitionEngine } from '@/lib/cognition/UnifiedCognitionEngine';
import type { WindowUnit } from '@/types/fabricator';

describe('UnifiedCognitionEngine', () => {
  let engine: UnifiedCognitionEngine;

  beforeEach(() => {
    engine = new UnifiedCognitionEngine();
  });

  it('should analyze context and generate recommendations', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 1800,
      overallHeight: 1500
    };

    const analysis = await engine.analyzeContext(windowUnit);

    expect(analysis).toBeDefined();
    expect(analysis.recommendations).toBeInstanceOf(Array);
    expect(analysis.warnings).toBeInstanceOf(Array);
    expect(analysis.confidence).toBeGreaterThanOrEqual(0);
    expect(analysis.confidence).toBeLessThanOrEqual(1);
  });

  it('should provide material recommendation', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 1800,
      overallHeight: 1500
    };

    const analysis = await engine.analyzeContext(windowUnit);
    const materialRec = analysis.recommendations.find(r => r.category === 'material');

    expect(materialRec).toBeDefined();
    expect(materialRec?.value).toBe('aluminum');
    expect(materialRec?.confidence).toBeGreaterThan(0.5);
  });

  it('should provide profile recommendation', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 1800,
      overallHeight: 1500
    };

    const analysis = await engine.analyzeContext(windowUnit);
    const profileRec = analysis.recommendations.find(r => r.category === 'profile');

    expect(profileRec).toBeDefined();
    expect(profileRec?.confidence).toBeGreaterThan(0.5);
  });

  it('should provide "Why?" explanation', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 1800,
      overallHeight: 1500
    };

    const analysis = await engine.analyzeContext(windowUnit);
    const materialRec = analysis.recommendations.find(r => r.category === 'material');

    if (materialRec) {
      const explanation = engine.getWhyExplanation(materialRec);
      expect(explanation).toContain('Fabricator:');
      expect(explanation).toContain('Engineering:');
      expect(explanation).toContain('Platform:');
    }
  });

  it('should handle large windows with warnings', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 4000,
      overallHeight: 3000
    };

    const analysis = await engine.analyzeContext(windowUnit);
    const warnings = analysis.warnings.filter(w => w.severity === 'warning' || w.severity === 'error');

    expect(warnings.length).toBeGreaterThan(0);
  });
});


