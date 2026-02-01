/**
 * HardenerRuleEngine Tests
 * 
 * Tests for hardener code selection with constitutional compliance.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { describe, expect, it } from 'vitest';
import { HardenerRuleEngine } from '../HardenerRuleEngine';
import type { HardenerSelectionContext } from '../types';

describe('HardenerRuleEngine', () => {
  const engine = new HardenerRuleEngine();

  describe('Constitutional Compliance', () => {
    it('should reject supplier data dependencies', () => {
      const context: any = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1500,
        openingType: 'casement',
        supplierId: 'supplier_123', // ❌ FORBIDDEN
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
      expect(result.justification).toContain('CONSTITUTIONAL_VIOLATION');
    });

    it('should maintain Tier 3 determinism', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1500,
        openingType: 'casement',
      };

      const result = engine.selectHardener(context);

      expect(result.tier).toBe('Tier 3');
      expect(result.deterministic).toBe(true);
    });
  });

  describe('Hardener Selection', () => {
    it('should select correct hardener for small aluminum casement', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1200, // 1.2m² (small)
        openingType: 'casement',
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-14-A-C');
      expect(result.ruleId).toContain('HD-EG-ALU-12');
    });

    it('should select correct hardener for medium aluminum tilt-turn', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 10,
        sashWidth: 1500,
        sashHeight: 1800, // 2.7m² (medium)
        openingType: 'tilt-turn',
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-20-A-T');
    });

    it('should select correct hardener for large aluminum sliding', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 12,
        sashWidth: 2000,
        sashHeight: 2000, // 4.0m² (large)
        openingType: 'sliding',
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-20-A-S');
    });

    it('should select correct hardener for UPVC casement', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'upvc_standard',
        material: 'upvc',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1200, // 1.2m² (small)
        openingType: 'casement',
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('PASS');
      expect(result.hardenerCode).toBe('HX-12-U-C');
    });
  });

  describe('Validation', () => {
    it('should fail for invalid glass thickness', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 30, // Too thick
        sashWidth: 1000,
        sashHeight: 1200,
        openingType: 'casement',
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
    });

    it('should fail for invalid sash size', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 100, // Too small
        sashHeight: 100,
        openingType: 'casement',
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
    });

    it('should fail for missing required fields', () => {
      const context: any = {
        profileSystem: 'caluminium_ps_v3',
        // Missing material, glassThickness, etc.
      };

      const result = engine.selectHardener(context);

      expect(result.validation).toBe('FAIL');
      expect(result.systemStopRequired).toBe(true);
    });
  });

  describe('Deterministic Replay', () => {
    it('should produce identical results for identical inputs', () => {
      const context: HardenerSelectionContext = {
        profileSystem: 'caluminium_ps_v3',
        material: 'aluminum',
        glassThickness: 6,
        sashWidth: 1000,
        sashHeight: 1500,
        openingType: 'casement',
      };

      const result1 = engine.selectHardener(context);
      const result2 = engine.selectHardener(context);
      const result3 = engine.selectHardener(context);

      expect(result1.hardenerCode).toBe(result2.hardenerCode);
      expect(result2.hardenerCode).toBe(result3.hardenerCode);
      expect(result1.ruleId).toBe(result2.ruleId);
      expect(result2.ruleId).toBe(result3.ruleId);
    });
  });
});

