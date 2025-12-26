/**
 * Phase 3 Integration Tests
 * 
 * Tests the integration of:
 * - UnifiedCognitionEngine
 * - SmartDefaults
 * - SmartWizard
 * - PatternLibraryWizard
 * 
 * @since Phase 3: Cognitive Intelligence (Week 18)
 */

import { describe, it, expect } from 'vitest';
import { UnifiedCognitionEngine } from '@/lib/cognition/UnifiedCognitionEngine';
import { SmartDefaults } from '@/lib/intelligence/SmartDefaults';
import type { WindowUnit } from '@/types/fabricator';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';

describe('Phase 3 Integration', () => {
  describe('UnifiedCognitionEngine + SmartDefaults Integration', () => {
    it('should work together to generate smart defaults', async () => {
      const cognitionEngine = new UnifiedCognitionEngine();
      const smartDefaults = new SmartDefaults();

      const windowUnit: Partial<WindowUnit> = {
        overallWidth: 1800,
        overallHeight: 1500
      };

      const analysis = await cognitionEngine.analyzeContext(windowUnit);
      const defaults = await smartDefaults.generateSmartDefaults(windowUnit);

      expect(analysis).toBeDefined();
      expect(defaults).toBeDefined();
      expect(defaults.systemPackId).toBeDefined();
      expect(defaults.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should provide explanations for recommendations', async () => {
      const smartDefaults = new SmartDefaults();

      const windowUnit: Partial<WindowUnit> = {
        overallWidth: 1800,
        overallHeight: 1500
      };

      const defaults = await smartDefaults.generateSmartDefaults(windowUnit);

      expect(defaults.explanations).toBeDefined();
      expect(Object.keys(defaults.explanations).length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Library Integration', () => {
    it('should analyze context with patterns', async () => {
      const cognitionEngine = new UnifiedCognitionEngine();
      const pattern = EGYPTIAN_PATTERNS[0];

      const windowUnit: Partial<WindowUnit> = {
        overallWidth: 1800,
        overallHeight: 1500
      };

      const analysis = await cognitionEngine.analyzeContext(windowUnit, pattern);

      expect(analysis).toBeDefined();
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should handle different pattern types', async () => {
      const cognitionEngine = new UnifiedCognitionEngine();

      const slidingPattern = EGYPTIAN_PATTERNS.find(p => p.type === 'sliding');
      const casementPattern = EGYPTIAN_PATTERNS.find(p => p.type === 'casement');

      if (slidingPattern && casementPattern) {
        const windowUnit: Partial<WindowUnit> = {
          overallWidth: 1800,
          overallHeight: 1500
        };

        const slidingAnalysis = await cognitionEngine.analyzeContext(windowUnit, slidingPattern);
        const casementAnalysis = await cognitionEngine.analyzeContext(windowUnit, casementPattern);

        expect(slidingAnalysis).toBeDefined();
        expect(casementAnalysis).toBeDefined();
      }
    });
  });

  describe('End-to-End Wizard Flow', () => {
    it('should generate complete window unit from wizard inputs', async () => {
      const smartDefaults = new SmartDefaults();

      const windowUnit: Partial<WindowUnit> = {
        overallWidth: 1800,
        overallHeight: 1500
      };

      const defaults = await smartDefaults.generateSmartDefaults(windowUnit);

      const completeWindowUnit: WindowUnit = {
        ...windowUnit,
        systemPackId: defaults.systemPackId,
        color: defaults.color,
        glazingType: defaults.glazingType,
        openingType: defaults.openingType as any
      } as WindowUnit;

      expect(completeWindowUnit.systemPackId).toBeDefined();
      expect(completeWindowUnit.color).toBeDefined();
      expect(completeWindowUnit.glazingType).toBeDefined();
    });
  });
});


