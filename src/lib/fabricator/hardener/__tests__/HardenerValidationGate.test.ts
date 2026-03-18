/**
 * HardenerValidationGate Tests
 * 
 * Tests for hardener validation gate with constitutional compliance.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import type { WindowUnit } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import { HardenerValidationGate } from '../HardenerValidationGate';
import type { HardenerSelectionResult } from '../types';

const minimalWindowUnit: WindowUnit = {
  id: '',
  orderNumber: '',
  posNumber: '',
  type: 'window',
  components: [],
  overallWidth: 0,
  overallHeight: 0,
  color: '',
  glazing: {},
  hardware: [],
  status: 'design',
  optimization: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('HardenerValidationGate', () => {
  const gate = new HardenerValidationGate();

  describe('System Stop Enforcement', () => {
    it('should require system stop for failed validation', () => {
      const selection: HardenerSelectionResult = {
        tier: 'Tier 3',
        deterministic: true,
        hardenerCode: '',
        ruleId: 'FAIL',
        validation: 'FAIL',
        validationDetails: {
          profileSystemMatch: false,
          glassThicknessMatch: false,
          sashSizeMatch: false,
          openingTypeMatch: false,
          egyptianCodeCompliant: false,
          constraintViolations: ['Hardener selection failed'],
        },
        justification: 'Hardener selection failed',
        constitutionalDisclaimer: 'System stop required',
        systemStopRequired: true,
        requiresHumanIntervention: true,
      };

      const validation = gate.validateHardenerSelection(selection, minimalWindowUnit);

      expect(validation.isValid).toBe(false);
      expect(validation.systemStop).toBe(true);
      expect(validation.requiresHumanIntervention).toBe(true);
    });

    it('should allow warnings but require human acknowledgment', () => {
      const selection: HardenerSelectionResult = {
        tier: 'Tier 3',
        deterministic: true,
        hardenerCode: 'HX-14-A-C',
        ruleId: 'HD-EG-ALU-12',
        validation: 'WARNING',
        validationDetails: {
          profileSystemMatch: true,
          glassThicknessMatch: true,
          sashSizeMatch: true,
          openingTypeMatch: true,
          egyptianCodeCompliant: true,
          constraintViolations: ['Minor constraint warning'],
        },
        justification: 'Hardener selected with warnings',
        constitutionalDisclaimer: 'Warnings present',
        systemStopRequired: false,
        requiresHumanIntervention: true,
      };

      const validation = gate.validateHardenerSelection(selection, minimalWindowUnit);

      expect(validation.isValid).toBe(true);
      expect(validation.systemStop).toBe(false);
      expect(validation.warnings).toContain('Minor constraint warning');
      expect(validation.requiresHumanIntervention).toBe(true);
    });
  });

  describe('Tier 3 Compliance', () => {
    it('should reject non-Tier 3 selections', () => {
      const selection = {
        tier: 'Tier 2', // ❌ Wrong tier
        deterministic: true,
        hardenerCode: 'HX-14-A-C',
        ruleId: 'HD-EG-ALU-12',
        validation: 'PASS',
        validationDetails: {
          profileSystemMatch: true,
          glassThicknessMatch: true,
          sashSizeMatch: true,
          openingTypeMatch: true,
          egyptianCodeCompliant: true,
          constraintViolations: [],
        },
        justification: 'Hardener selected',
        constitutionalDisclaimer: 'Test',
        systemStopRequired: false,
        requiresHumanIntervention: false,
      } as HardenerSelectionResult;

      const validation = gate.validateHardenerSelection(selection, minimalWindowUnit);

      expect(validation.isValid).toBe(false);
      expect(validation.systemStop).toBe(true);
      expect(validation.reason).toContain('Tier 3 compliance');
    });

    it('should reject non-deterministic selections', () => {
      const selection = {
        tier: 'Tier 3',
        deterministic: false, // ❌ Not deterministic
        hardenerCode: 'HX-14-A-C',
        ruleId: 'HD-EG-ALU-12',
        validation: 'PASS',
        validationDetails: {
          profileSystemMatch: true,
          glassThicknessMatch: true,
          sashSizeMatch: true,
          openingTypeMatch: true,
          egyptianCodeCompliant: true,
          constraintViolations: [],
        },
        justification: 'Hardener selected',
        constitutionalDisclaimer: 'Test',
        systemStopRequired: false,
        requiresHumanIntervention: false,
      } as HardenerSelectionResult;

      const validation = gate.validateHardenerSelection(selection, minimalWindowUnit);

      expect(validation.isValid).toBe(false);
      expect(validation.systemStop).toBe(true);
      expect(validation.reason).toContain('Tier 3 compliance');
    });
  });

  describe('System Stop Detection', () => {
    it('should detect system stop requirement', () => {
      const selection: HardenerSelectionResult = {
        tier: 'Tier 3',
        deterministic: true,
        hardenerCode: '',
        ruleId: 'FAIL',
        validation: 'FAIL',
        validationDetails: {
          profileSystemMatch: false,
          glassThicknessMatch: false,
          sashSizeMatch: false,
          openingTypeMatch: false,
          egyptianCodeCompliant: false,
          constraintViolations: ['Hardener selection failed'],
        },
        justification: 'Hardener selection failed',
        constitutionalDisclaimer: 'System stop required',
        systemStopRequired: true,
        requiresHumanIntervention: true,
      };

      expect(gate.isSystemStopRequired(selection)).toBe(true);
      expect(gate.getSystemStopReason(selection)).toContain('No hardener code selected');
    });
  });
});

