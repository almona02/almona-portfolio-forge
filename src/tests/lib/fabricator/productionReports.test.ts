/**
 * Production Reports Generator Tests
 *
 * Tests for the ProductionReportsGenerator utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductionReportsGenerator } from '@/components/fabricator/drafting/utils/productionReports';
import type { WindowUnit } from '@/types/fabricator';

describe('ProductionReportsGenerator', () => {
  let generator: ProductionReportsGenerator;
  let mockWindowUnits: WindowUnit[];
  let mockBOMs: any[];

  beforeEach(() => {
    generator = new ProductionReportsGenerator();

    mockWindowUnits = [
      {
        id: 'window-1',
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
      }
    ];

    mockBOMs = [
      {
        windowUnitId: 'window-1',
        templateId: 'template-1',
        systemPackId: 'pack-1',
        items: [
          {
            id: 'profile-1',
            category: 'profiles',
            code: 'PROFILE-1',
            name: 'Test Profile',
            quantity: 2,
            unit: 'piece',
            unitCost: 10,
            totalCost: 20,
            specifications: { length: 1200 }
          },
          {
            id: 'hardware-1',
            category: 'hardware',
            code: 'HINGE-1',
            name: 'Test Hinge',
            quantity: 4,
            unit: 'piece',
            unitCost: 5,
            totalCost: 20,
            specifications: { type: 'casement' }
          }
        ],
        totalCost: 40,
        generatedAt: new Date().toISOString(),
        accuracy: 0.99
      }
    ];
  });

  describe('generateExecutionPlan', () => {
    it('should generate execution plan with correct structure', async () => {
      const result = await generator.generateExecutionPlan(
        'project-1',
        mockWindowUnits,
        mockBOMs
      );

      expect(result.summary.totalWindows).toBe(1);
      expect(result.summary.totalBOMItems).toBe(2);
      expect(result.summary.estimatedProductionTime).toBeGreaterThan(0);
      expect(result.steps).toHaveLength(6); // 6 execution steps
      expect(result.steps[0].id).toBe('material-prep');
      expect(result.steps[5].id).toBe('quality-check');
    });

    it('should group windows by type', async () => {
      const mixedWindows = [
        ...mockWindowUnits,
        {
          ...mockWindowUnits[0],
          id: 'window-2',
          type: 'sliding' as const
        }
      ];

      const result = await generator.generateExecutionPlan(
        'project-1',
        mixedWindows,
        mockBOMs
      );

      expect(result.summary.groupedItems.casement).toHaveLength(1);
      expect(result.summary.groupedItems.sliding).toHaveLength(1);
    });
  });

  describe('generateCuttingList', () => {
    it('should generate cutting list with optimization metrics', async () => {
      const result = await generator.generateCuttingList(
        'project-1',
        mockBOMs
      );

      expect(result.summary.totalCuts).toBeGreaterThan(0);
      expect(result.summary.stockUtilization).toBeGreaterThanOrEqual(0);
      expect(result.optimizationMetrics.wasteReduction).toBe(15); // Default value
      expect(result.optimizationMetrics.materialSavings).toBeGreaterThan(0);
    });

    it('should group cuts by material and profile', async () => {
      const result = await generator.generateCuttingList(
        'project-1',
        mockBOMs
      );

      // Should have at least one cutting group
      expect(result.cuttingGroups.length).toBeGreaterThan(0);
      const group = result.cuttingGroups[0];
      expect(group.material).toBeDefined();
      expect(group.profile).toBeDefined();
      expect(group.cuts).toBeDefined();
    });
  });

  describe('generatePurchaseOrder', () => {
    it('should generate purchase order grouped by supplier', async () => {
      const result = await generator.generatePurchaseOrder(
        'project-1',
        mockBOMs
      );

      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.totalValue).toBe(40);
      expect(result.supplierGroups).toBeDefined();
      expect(result.items).toHaveLength(2);
    });

    it('should assign delivery times based on category', async () => {
      const result = await generator.generatePurchaseOrder(
        'project-1',
        mockBOMs
      );

      const profileItem = result.items.find(item => item.category === 'profiles');
      const hardwareItem = result.items.find(item => item.category === 'hardware');

      expect(profileItem?.deliveryTime).toBe(7); // profiles = 7 days
      expect(hardwareItem?.deliveryTime).toBe(3); // hardware = 3 days
    });
  });

  describe('saveReport and loadReport', () => {
    it('should handle report persistence operations', () => {
      // These would require mocking the productionService
      // For now, test that methods exist and have proper signatures
      expect(typeof generator.saveReport).toBe('function');
      expect(typeof generator.loadReport).toBe('function');
    });
  });
});