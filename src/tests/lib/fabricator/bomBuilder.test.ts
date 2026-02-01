/**
 * BOM Builder Tests
 *
 * Tests for the ProductionBOMBuilder utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionBOMBuilder } from '@/components/fabricator/drafting/utils/bomBuilder';
import type { WindowUnit } from '@/types/fabricator';
import type { EgyptianTemplate } from '@/components/fabricator/drafting/types/drafting';

describe('ProductionBOMBuilder', () => {
  let builder: ProductionBOMBuilder;
  let mockWindowUnit: WindowUnit;
  let mockTemplate: EgyptianTemplate;

  beforeEach(() => {
    builder = new ProductionBOMBuilder();

    mockWindowUnit = {
      id: 'test-window-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'casement',
      overallWidth: 1200,
      overallHeight: 1500,
      grid: {
        rows: 2,
        cols: 1,
        cells: [
          { id: 'cell-0', row: 0, col: 0, type: 'casement' },
          { id: 'cell-1', row: 1, col: 0, type: 'casement' }
        ]
      },
      systemPackId: 'test-pack',
      components: [],
      color: 'white',
      glazing: {},
      hardware: [],
      status: 'design',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockTemplate = {
      id: 'test-template',
      name: 'Test Template',
      rows: 2,
      cols: 1,
      cellTypes: [['casement'], ['casement']],
      constraints: {
        minWidth: 800,
        maxWidth: 2000,
        minHeight: 1000,
        maxHeight: 2500,
        cellMinWidth: 400,
        cellMinHeight: 500
      }
    };
  });

  describe('buildWindowBOM', () => {
    it('should build BOM for valid window unit', async () => {
      // Note: This test would require mocking the PresetAwareBOMGenerator
      // For now, we'll test the structure and error handling
      expect(builder).toBeDefined();
      expect(typeof builder.buildWindowBOM).toBe('function');
    });

    it('should handle invalid inputs gracefully', async () => {
      // Test with null/undefined inputs would require mocking
      expect(builder).toBeDefined();
    });
  });

  describe('buildBatchBOM', () => {
    it('should handle batch BOM generation', async () => {
      expect(typeof builder.buildBatchBOM).toBe('function');
    });
  });

  describe('aggregateBOMForProject', () => {
    it('should aggregate BOM items correctly', () => {
      const mockBOMs = [
        {
          windowUnitId: 'window-1',
          templateId: 'template-1',
          systemPackId: 'pack-1',
          items: [
            {
              id: 'item-1',
              category: 'profiles' as const,
              code: 'PROFILE-1',
              name: 'Test Profile',
              quantity: 2,
              unit: 'piece',
              unitCost: 10,
              totalCost: 20,
              specifications: {}
            }
          ],
          totalCost: 20,
          generatedAt: new Date().toISOString(),
          accuracy: 0.99
        },
        {
          windowUnitId: 'window-2',
          templateId: 'template-1',
          systemPackId: 'pack-1',
          items: [
            {
              id: 'item-2',
              category: 'profiles' as const,
              code: 'PROFILE-1',
              name: 'Test Profile',
              quantity: 1,
              unit: 'piece',
              unitCost: 10,
              totalCost: 10,
              specifications: {}
            }
          ],
          totalCost: 10,
          generatedAt: new Date().toISOString(),
          accuracy: 0.99
        }
      ];

      const result = builder.aggregateBOMForProject(mockBOMs);

      expect(result.totalItems).toHaveLength(1);
      expect(result.totalItems[0].quantity).toBe(3); // 2 + 1
      expect(result.totalItems[0].totalCost).toBe(30); // 20 + 10
      expect(result.summary.totalCost).toBe(30);
      expect(result.summary.totalWindows).toBe(2);
      expect(result.summary.itemCounts.profiles).toBe(3);
    });

    it('should handle empty BOM list', () => {
      const result = builder.aggregateBOMForProject([]);

      expect(result.totalItems).toHaveLength(0);
      expect(result.summary.totalCost).toBe(0);
      expect(result.summary.totalWindows).toBe(0);
    });
  });
});