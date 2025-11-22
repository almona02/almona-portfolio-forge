/**
 * CSVExportGenerator Unit Tests
 * Week 4: Comprehensive Testing Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CSVExportGenerator } from '../CSVExportGenerator';
import { WindowUnit, OptimizationResult } from '@/types/fabricator';
import { CSVExportOptions } from '../types';

describe('CSVExportGenerator', () => {
  let generator: CSVExportGenerator;
  let mockProject: WindowUnit;
  let mockOptimization: OptimizationResult;

  beforeEach(() => {
    generator = new CSVExportGenerator();
    
    mockProject = {
      id: 'test-project-1',
      orderNumber: 'ORD-001',
      type: 'window',
      overallWidth: 1000,
      overallHeight: 1500,
      status: 'active',
    } as WindowUnit;

    mockOptimization = {
      materialUsage: 5000,
      wastePercentage: 5,
      estimatedProductionTime: 2.5,
      cuttingPlan: [],
      nestingEfficiency: 95,
      costBreakdown: {
        materialCost: 1000,
        laborCost: 500,
        hardwareCost: 200,
        glazingCost: 300,
        totalCost: 2000,
      },
    };
  });

  describe('generate', () => {
    it('should generate CSV blob', async () => {
      const options: CSVExportOptions = {
        language: 'en',
        excelCompatible: true,
        includeHeaders: true,
      };

      const blob = await generator.generate(mockProject, mockOptimization, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toContain('csv');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should include BOM for Excel compatibility', async () => {
      const options: CSVExportOptions = {
        language: 'en',
        excelCompatible: true,
      };

      const blob = await generator.generate(mockProject, mockOptimization, options);
      const text = await blob.text();

      // Check for UTF-8 BOM
      expect(text.charCodeAt(0)).toBe(0xFEFF);
    });

    it('should use custom delimiter', async () => {
      const options: CSVExportOptions = {
        language: 'en',
        delimiter: ';',
        decimalSeparator: ',',
      };

      const blob = await generator.generate(mockProject, mockOptimization, options);
      const text = await blob.text();

      expect(text).toContain(';');
    });

    it('should handle Turkish locale formatting', async () => {
      const options: CSVExportOptions = {
        language: 'tr',
        decimalSeparator: ',',
      };

      const blob = await generator.generate(mockProject, mockOptimization, options);
      const text = await blob.text();

      // Should use comma as decimal separator
      expect(text).toMatch(/\d+,\d+/);
    });

    it('should include QR code data when requested', async () => {
      const options: CSVExportOptions = {
        language: 'en',
        includeQRCode: true,
      };

      const blob = await generator.generate(mockProject, mockOptimization, options);
      const text = await blob.text();

      expect(text).toContain('QR_CODE_DATA');
    });
  });

  describe('error handling', () => {
    it('should throw error when optimization is missing', async () => {
      const options: CSVExportOptions = {
        language: 'en',
      };

      await expect(
        generator.generate(mockProject, null, options)
      ).rejects.toThrow('Optimization data required');
    });
  });
});

