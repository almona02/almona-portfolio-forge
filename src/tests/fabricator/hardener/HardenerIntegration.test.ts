/**
 * Hardener Integration Tests
 * 
 * Comprehensive end-to-end tests for hardener selection system with:
 * - Real Egyptian/GCC standards validation
 * - Edge cases (extreme climates, safety-critical applications)
 * - Performance testing with 1000+ selections
 * 
 * Constitutional Compliance: AICS-001 §4.3.5, §7.4, §7.5
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import type { HardenerSelectionContext, HardenerSelectionResult } from '@/lib/fabricator/hardener';
import { HardenerRuleEngine, hardenerSelector } from '@/lib/fabricator/hardener';
import { describe, expect, it } from 'vitest';

import type { SystemPack, WindowUnit } from '@/types/fabricator';

describe('Hardener Integration Tests', () => {
  describe('Real Egyptian Standards Validation', () => {
    it('should comply with Egyptian Code 2020 for small aluminum casement', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1200, // 1.2m² (small)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.validationDetails.egyptianCodeCompliant).toBe(true);
      expect(result.hardenerCode).toBe('HX-14-A-C');
      expect(result.tier).toBe('Tier 3');
      expect(result.deterministic).toBe(true);
    });

    it('should comply with Egyptian Code 2020 for medium aluminum tilt-turn', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 10,
        sashWidth: 1500,
        sashHeight: 1800, // 2.7m² (large)
        openingType: 'tilt-turn',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.validationDetails.egyptianCodeCompliant).toBe(true);
      expect(result.hardenerCode).toBe('HX-20-A-T');
    });

    it('should comply with Egyptian Code 2020 for large aluminum sliding', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 12,
        sashWidth: 2000,
        sashHeight: 2000, // 4.0m² (large)
        openingType: 'sliding',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.validationDetails.egyptianCodeCompliant).toBe(true);
      expect(result.hardenerCode).toBe('HX-20-A-S');
    });

    it('should comply with Egyptian Code 2020 for UPVC casement', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'upvc_standard',
        material: 'upvc',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1200, // 1.2m² (small)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.validationDetails.egyptianCodeCompliant).toBe(true);
      expect(result.hardenerCode).toBe('HX-12-U-C');
    });

    it('should fail for glass thickness outside Egyptian Code 2020 limits', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 30, // Exceeds max of 24mm
        sashWidth: 1000,
        sashHeight: 1200,
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
      expect(result.justification).toContain('Hardener selection failed');
    });
  });

  describe('Real GCC Standards Validation', () => {
    it('should comply with UAE standards for aluminum windows', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 8,
        sashWidth: 1500,
        sashHeight: 2000, // 3.0m² (medium-large)
        openingType: 'casement',
        region: 'uae',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toMatch(/^HX-(16|20)-A-/);
    });

    it('should comply with Saudi standards for UPVC windows', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'upvc_standard',
        material: 'upvc',
        glassThickness: 8,
        sashWidth: 1500,
        sashHeight: 1800, // 2.7m² (large)
        openingType: 'tilt-turn',
        region: 'saudi',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-18-U-T');
    });

    it('should comply with Kuwait standards', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 10,
        sashWidth: 1800,
        sashHeight: 2200, // 3.96m² (large)
        openingType: 'sliding',
        region: 'kuwait',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-20-A-S');
    });

    it('should comply with Qatar standards', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'upvc_standard',
        material: 'upvc',
        glassThickness: 8,
        sashWidth: 1600,
        sashHeight: 2000, // 3.2m² (large)
        openingType: 'casement',
        region: 'qatar',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-18-U-C');
    });
  });

  describe('Edge Cases: Extreme Climates', () => {
    it('should handle extreme heat climate applications (UAE desert)', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 12, // Thick glass for thermal insulation
        sashWidth: 2000,
        sashHeight: 2500, // 5.0m² (large)
        openingType: 'tilt-turn',
        region: 'uae',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-20-A-T');
      expect(result.validationDetails.egyptianCodeCompliant).toBe(true);
    });

    it('should handle coastal high-humidity applications', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 10,
        sashWidth: 1800,
        sashHeight: 2000, // 3.6m² (large)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-20-A-C');
    });
  });

  describe('Edge Cases: Safety-Critical Applications', () => {
    it('should enforce system stop for oversized windows (safety)', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 15,
        sashWidth: 2500, // Exceeds max width (2000mm)
        sashHeight: 3000, // Exceeds max height (3000mm)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
      expect(result.justification).toContain('Hardener selection failed');
    });

    it('should enforce system stop for undersized windows (manufacturing)', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 4,
        sashWidth: 250, // Below min width (300mm)
        sashHeight: 250, // Below min height (300mm)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
    });

    it('should enforce system stop for invalid glass thickness (safety)', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 2, // Below minimum (4mm)
        sashWidth: 1000,
        sashHeight: 1200,
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
    });
  });

  describe('Edge Cases: Boundary Conditions', () => {
    it('should correctly select hardener at small/medium boundary (1.5m²)', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1500, // Exactly 1.5m² (boundary)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      // Should select medium category (1.5-2.5m²)
      expect(result.hardenerCode).toBe('HX-16-A-C');
    });

    it('should correctly select hardener at medium/large boundary (2.5m²)', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 8,
        sashWidth: 1250,
        sashHeight: 2000, // Exactly 2.5m² (boundary)
        openingType: 'casement',
        region: 'egypt',
      };

      const result = hardenerSelector.selectHardener(context);

      expect(result.validation).toBe('PASS');
      // Should select large category (>2.5m²)
      expect(result.hardenerCode).toBe('HX-20-A-C');
    });
  });

  describe('Performance Tests: 1000+ Selections', () => {
    it('should complete 1000 selections in under 10 seconds', () => {
      const contexts: HardenerSelectionContext[] = [];
      
      // Generate 1000 diverse contexts
      for (let i = 0; i < 1000; i++) {
        const material = i % 2 === 0 ? 'aluminum' : 'upvc';
        const glassThickness = 4 + (i % 20); // 4-23mm
        const sashWidth = 500 + (i % 1500); // 500-1999mm
        const sashHeight = 500 + (i % 2500); // 500-2999mm
        const openingTypes: Array<'casement' | 'tilt-turn' | 'sliding'> = ['casement', 'tilt-turn', 'sliding'];
        const openingType = openingTypes[i % 3];
        
        contexts.push({
          profileSystem: material === 'aluminum' ? 'caluminium_ps_v3' : 'upvc_standard',
          material,
          glassThickness,
          sashWidth,
          sashHeight,
          openingType,
          region: 'egypt',
        });
      }

      const startTime = performance.now();
      
      const results = contexts.map(context => hardenerSelector.selectHardener(context));
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All should complete
      expect(results.length).toBe(1000);
      
      // Should complete in under 10 seconds (target: <10ms per selection)
      expect(totalTime).toBeLessThan(10000);
      
      // Average time per selection should be <10ms
      const avgTimePerSelection = totalTime / 1000;
      expect(avgTimePerSelection).toBeLessThan(10);
      
      // All results should be deterministic
      results.forEach(result => {
        expect(result.tier).toBe('Tier 3');
        expect(result.deterministic).toBe(true);
      });
    });

    it('should maintain deterministic results across 1000 selections', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 8,
        sashWidth: 1500,
        sashHeight: 1800,
        openingType: 'casement',
        region: 'egypt',
      };

      const results: HardenerSelectionResult[] = [];
      
      // Run same context 1000 times
      for (let i = 0; i < 1000; i++) {
        results.push(hardenerSelector.selectHardener(context));
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.hardenerCode).toBe(firstResult.hardenerCode);
        expect(result.ruleId).toBe(firstResult.ruleId);
        expect(result.validation).toBe(firstResult.validation);
        expect(result.tier).toBe(firstResult.tier);
        expect(result.deterministic).toBe(firstResult.deterministic);
      });
    });
  });

  describe('Window Unit Integration', () => {
    it('should select hardener from WindowUnit and SystemPack', () => {
      const windowUnit: WindowUnit = {
        id: 'test-window-1',
        type: 'casement',
        overallWidth: 1200,
        overallHeight: 1500,
        glazing: {
          type: 'double',
          thickness: 6,
        },
        systemPackId: 'caluminium_ps_v3',
      };

      const systemPack: SystemPack = {
        id: 'caluminium_ps_v3',
        name: 'Caluminium PS v3',
        category: 'aluminum',
        profiles: [],
        hardware: [],
      };

      const result = hardenerSelector.selectHardenerForWindowUnit(windowUnit, systemPack);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-16-A-C');
      expect(result.tier).toBe('Tier 3');
    });

    it('should handle missing system pack gracefully', () => {
      const windowUnit: WindowUnit = {
        id: 'test-window-2',
        type: 'tilt-turn',
        overallWidth: 1000,
        overallHeight: 1200,
        glazing: {
          type: 'double',
          thickness: 6,
        },
      };

      const result = hardenerSelector.selectHardenerForWindowUnit(windowUnit, null);

      // Should still work with default material assumption
      expect(result.tier).toBe('Tier 3');
    });
  });

  describe('Constitutional Compliance', () => {
    it('should maintain Tier 3 compliance across all selections', () => {
      const contexts: HardenerSelectionContext[] = [
        {
          profileSystem: 'caluminium_ps_v3',
          material: 'aluminum',
          glassThickness: 6,
          sashWidth: 1000,
          sashHeight: 1200,
          openingType: 'casement',
          region: 'egypt',
        },
        {
          profileSystem: 'upvc_standard',
          material: 'upvc',
          glassThickness: 8,
          sashWidth: 1500,
          sashHeight: 1800,
          openingType: 'tilt-turn',
          region: 'uae',
        },
      ];

      contexts.forEach(context => {
        const result = hardenerSelector.selectHardener(context);
        expect(result.tier).toBe('Tier 3');
        expect(result.deterministic).toBe(true);
        expect(result.constitutionalDisclaimer).toContain('deterministic');
        expect(result.constitutionalDisclaimer).toContain('No AI/ML');
      });
    });

    it('should reject supplier data dependencies (AICS-001 §4.3.5)', () => {
      const context: any = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1200,
        openingType: 'casement',
        supplierId: 'supplier_123', // FORBIDDEN
      };

      const engine = new HardenerRuleEngine();
      const result = engine.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
      expect(result.justification).toContain('CONSTITUTIONAL_VIOLATION');
      expect(result.justification).toContain('AICS-001');
    });
  });
});
