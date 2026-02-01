/**
 * EngineeringBay ValidationEnvelope Functional Tests
 * 
 * Verifies correct integration of ValidationEnvelope in EngineeringBay.
 * 
 * Test Coverage:
 * - All constraint categories are evaluated
 * - Errors are correctly mapped to UI
 * - Real-time validation works
 * - Backward compatibility maintained
 */

import { ConstraintCategory } from '@/core/authority/validation_envelopes';
import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import type { WindowGrid } from '@/types/fabricator';
import { beforeEach, describe, expect, it } from 'vitest';

describe('EngineeringBay ValidationEnvelope Functional Tests', () => {
  const validWindowGrid: WindowGrid = {
    rows: 2,
    cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'fixed' },
      { id: '0-1', row: 0, col: 1, type: 'fixed' },
      { id: '1-0', row: 1, col: 0, type: 'sash' },
      { id: '1-1', row: 1, col: 1, type: 'sash' },
    ],
  };

  beforeEach(() => {
    // Reset any state before each test
  });

  it('should evaluate all constraint categories', () => {
    const result = validateDesignWithEnvelope(
      1200, // width
      1500, // height
      validWindowGrid,
      'rock60', // systemId
      true // useEnvelope
    );

    expect(result.envelopeResult).toBeDefined();
    expect(result.envelopeResult?.metadata.totalCategories).toBeGreaterThanOrEqual(5);
    
    // Verify all five constraint categories are present
    const categories = [
      ConstraintCategory.GEOMETRIC,
      ConstraintCategory.MATERIAL,
      ConstraintCategory.MACHINE,
      ConstraintCategory.PROCESS,
      ConstraintCategory.CERTIFICATION,
    ];

    if (result.envelopeResult) {
      const categoryResults = Array.from(result.envelopeResult.categoryResults.keys());
      categories.forEach(category => {
        expect(categoryResults).toContain(category);
      });
    }
  });

  it('should correctly map errors to UI format', () => {
    // Create an invalid design (too small dimensions)
    const invalidGrid: WindowGrid = {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }],
    };

    const result = validateDesignWithEnvelope(
      200, // Too small width
      300, // Too small height
      invalidGrid,
      'rock60',
      true
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Errors should be strings suitable for UI display
    result.errors.forEach(error => {
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    });

    // Envelope result should contain failed categories
    if (result.envelopeResult && !result.envelopeResult.complies) {
      expect(result.envelopeResult.failedCategories.length).toBeGreaterThan(0);
    }
  });

  it('should work with real-time validation patterns', () => {
    // Simulate real-time validation scenario (multiple rapid validations)
    const dimensions = [
      { width: 1200, height: 1500 },
      { width: 1250, height: 1550 },
      { width: 1300, height: 1600 },
    ];

    dimensions.forEach(dim => {
      const result = validateDesignWithEnvelope(
        dim.width,
        dim.height,
        validWindowGrid,
        'rock60',
        true
      );

      expect(result).toBeDefined();
      expect(result.envelopeResult).toBeDefined();
      
      // Real-time validation should not throw errors
      expect(() => {
        validateDesignWithEnvelope(dim.width, dim.height, validWindowGrid, 'rock60', true);
      }).not.toThrow();
    });
  });

  it('should maintain backward compatibility with legacy validation', () => {
    // Test that legacy validation (without envelope) still works
    const resultWithoutEnvelope = validateDesignWithEnvelope(
      1200,
      1500,
      validWindowGrid,
      'rock60',
      false // useEnvelope = false
    );

    expect(resultWithoutEnvelope).toBeDefined();
    expect(resultWithoutEnvelope.isValid).toBeDefined();
    expect(typeof resultWithoutEnvelope.isValid).toBe('boolean');
    expect(resultWithoutEnvelope.errors).toBeDefined();
    expect(Array.isArray(resultWithoutEnvelope.errors)).toBe(true);
    
    // Without envelope, envelopeResult should be undefined
    expect(resultWithoutEnvelope.envelopeResult).toBeUndefined();
  });

  it('should handle different system pack IDs', () => {
    const systemPacks = ['rock60', 'panda100', 'generic', null];

    systemPacks.forEach(systemId => {
      const result = validateDesignWithEnvelope(
        1200,
        1500,
        validWindowGrid,
        systemId,
        true
      );

      expect(result).toBeDefined();
      expect(result.envelopeResult).toBeDefined();
      
      // All system packs should be validated
      expect(result.envelopeResult?.metadata.totalCategories).toBeGreaterThanOrEqual(5);
    });
  });

  it('should return consistent results for identical inputs', () => {
    const result1 = validateDesignWithEnvelope(1200, 1500, validWindowGrid, 'rock60', true);
    const result2 = validateDesignWithEnvelope(1200, 1500, validWindowGrid, 'rock60', true);

    expect(result1.isValid).toBe(result2.isValid);
    expect(result1.errors.length).toBe(result2.errors.length);
    
    if (result1.envelopeResult && result2.envelopeResult) {
      expect(result1.envelopeResult.complies).toBe(result2.envelopeResult.complies);
      expect(result1.envelopeResult.failedCategories.length).toBe(
        result2.envelopeResult.failedCategories.length
      );
    }
  });

  it('should include envelope metadata in result', () => {
    const result = validateDesignWithEnvelope(1200, 1500, validWindowGrid, 'rock60', true);

    expect(result.envelopeResult).toBeDefined();
    
    if (result.envelopeResult) {
      expect(result.envelopeResult.metadata).toBeDefined();
      expect(result.envelopeResult.metadata.totalCategories).toBeGreaterThanOrEqual(5);
      expect(result.envelopeResult.metadata.totalConstraints).toBeGreaterThan(0);
      expect(result.envelopeResult.metadata.passedCategories).toBeGreaterThanOrEqual(0);
      expect(result.envelopeResult.metadata.failedCategories).toBeGreaterThanOrEqual(0);
      expect(result.envelopeResult.categoryResults).toBeDefined();
      expect(result.envelopeResult.categoryResults.size).toBeGreaterThanOrEqual(5);
    }
  });

  it('should handle edge cases gracefully', () => {
    // Test with minimal valid grid
    const minimalGrid: WindowGrid = {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
    };

    expect(() => {
      validateDesignWithEnvelope(1200, 1500, minimalGrid, 'rock60', true);
    }).not.toThrow();

    // Test with large grid
    const largeGrid: WindowGrid = {
      rows: 5,
      cols: 5,
      cells: Array.from({ length: 25 }, (_, i) => ({
        id: `${Math.floor(i / 5)}-${i % 5}`,
        row: Math.floor(i / 5),
        col: i % 5,
        type: i % 2 === 0 ? 'fixed' : 'sash',
      })),
    };

    expect(() => {
      validateDesignWithEnvelope(3000, 3000, largeGrid, 'rock60', true);
    }).not.toThrow();
  });
});

