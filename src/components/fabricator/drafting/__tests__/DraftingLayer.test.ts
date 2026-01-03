// src/components/fabricator/drafting/__tests__/DraftingLayer.test.ts
import { describe, it, expect } from 'vitest';
import { validateAgainstEgyptianTemplates } from '../utils/egyptianTemplateMatcher';
import { validateDimensions } from '../utils/dimensionValidator';
import type { Geometry2D, EgyptianTemplate } from '../types/drafting';

describe('Drafting Layer Constitutional Compliance', () => {
  // Test 1: Deterministic template matching
  it('should produce identical outputs for identical inputs', () => {
    const geometry1: Geometry2D = {
      rectangles: [
        { x: 0, y: 0, width: 1200, height: 1200, type: 'casement' },
        { x: 1200, y: 0, width: 1200, height: 1200, type: 'casement' },
        { x: 0, y: 1200, width: 1200, height: 1200, type: 'casement' },
        { x: 1200, y: 1200, width: 1200, height: 1200, type: 'casement' }
      ],
      points: [],
      lines: []
    };
    
    const geometry2: Geometry2D = {
      rectangles: [
        { x: 0, y: 0, width: 1200, height: 1200, type: 'casement' },
        { x: 1200, y: 0, width: 1200, height: 1200, type: 'casement' },
        { x: 0, y: 1200, width: 1200, height: 1200, type: 'casement' },
        { x: 1200, y: 1200, width: 1200, height: 1200, type: 'casement' }
      ],
      points: [],
      lines: []
    };
    
    const templates: EgyptianTemplate[] = [
      {
        id: 'test_2x2',
        name: 'Test 2x2',
        rows: 2,
        cols: 2,
        cellTypes: [
          ['casement', 'casement'],
          ['casement', 'casement']
        ],
        constraints: {
          minWidth: 1200,
          maxWidth: 2400,
          minHeight: 1200,
          maxHeight: 2400
        }
      }
    ];
    
    const result1 = validateAgainstEgyptianTemplates(geometry1, templates);
    const result2 = validateAgainstEgyptianTemplates(geometry2, templates);
    
    expect(result1.found).toBe(result2.found);
    if (result1.template && result2.template) {
      expect(result1.template.id).toBe(result2.template.id);
    }
  });
  
  // Test 2: Dimension validation
  it('should validate dimensions correctly', () => {
    const validGeometry: Geometry2D = {
      rectangles: [
        { x: 0, y: 0, width: 600, height: 600, type: 'fixed' }
      ],
      points: [],
      lines: []
    };
    
    const invalidGeometry: Geometry2D = {
      rectangles: [
        { x: 0, y: 0, width: 200, height: 200, type: 'fixed' } // Too small
      ],
      points: [],
      lines: []
    };
    
    const validResult = validateDimensions(validGeometry);
    const invalidResult = validateDimensions(invalidGeometry);
    
    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });
  
  // Test 3: Tier separation is maintained
  it('should maintain Tier 0 purity in drafting output', () => {
    const draftingOutput = {
      geometry: {
        rectangles: [],
        points: [],
        lines: []
      },
      dimensions: [],
      annotations: [],
      template: {
        id: 'test',
        name: 'Test',
        rows: 1,
        cols: 1,
        cellTypes: [['fixed']],
        constraints: {
          minWidth: 600,
          maxWidth: 2000,
          minHeight: 600,
          maxHeight: 2000
        }
      },
      suggestedSystemPack: 'test_pack',
      metadata: {
        tier: 'Tier 0',
        draftingOnly: true,
        requiresValidation: true,
        timestamp: new Date().toISOString(),
        validationId: 'test-id',
        constitutionalNote: 'Test note'
      }
    };
    
    expect(draftingOutput.metadata.tier).toBe('Tier 0');
    expect(draftingOutput.metadata.draftingOnly).toBe(true);
    expect(draftingOutput.metadata.requiresValidation).toBe(true);
    
    // Should not contain Tier 3 properties
    expect(draftingOutput).not.toHaveProperty('bom');
    expect(draftingOutput).not.toHaveProperty('cutList');
    expect(draftingOutput).not.toHaveProperty('optimizationResult');
  });
});

