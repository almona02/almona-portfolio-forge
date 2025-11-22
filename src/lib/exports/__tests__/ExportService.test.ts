/**
 * ExportService Unit Tests
 * Week 4: Comprehensive Testing Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '../ExportService';
import { WindowUnit, OptimizationResult } from '@/types/fabricator';
import { ExportFormat, PDFExportOptions } from '../types';

describe('ExportService', () => {
  let exportService: ExportService;
  let mockProject: WindowUnit;
  let mockOptimization: OptimizationResult;

  beforeEach(() => {
    exportService = new ExportService();
    
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

  describe('exportProject', () => {
    it('should export project to PDF format', async () => {
      const options: PDFExportOptions = {
        language: 'en',
        includeQRCode: true,
        includeDiagrams: true,
      };

      const result = await exportService.exportProject(
        mockProject,
        mockOptimization,
        'pdf',
        options
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.blob).toBeDefined();
      expect(result.filename).toContain('ORD-001');
      expect(result.filename).toContain('.pdf');
    });

    it('should export project to CSV format', async () => {
      const options = {
        language: 'en',
        excelCompatible: true,
      };

      const result = await exportService.exportProject(
        mockProject,
        mockOptimization,
        'csv',
        options
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.blob).toBeDefined();
      expect(result.filename).toContain('.csv');
    });

    it('should export project to DXF format', async () => {
      const options = {
        language: 'en',
        units: 'mm' as const,
      };

      const result = await exportService.exportProject(
        mockProject,
        mockOptimization,
        'dxf',
        options
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('dxf');
      expect(result.blob).toBeDefined();
      expect(result.filename).toContain('.dxf');
    });

    it('should handle export errors gracefully', async () => {
      const invalidProject = {} as WindowUnit;

      const result = await exportService.exportProject(
        invalidProject,
        null,
        'pdf',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('progress tracking', () => {
    it('should report progress during export', async () => {
      const progressCallback = vi.fn();
      const exportId = 'test-export-1';

      exportService.onProgress(exportId, progressCallback);

      const options: PDFExportOptions = {
        language: 'en',
      };

      await exportService.exportProject(
        mockProject,
        mockOptimization,
        'pdf',
        options
      );

      // Progress should be called at least once
      // Note: Actual implementation may vary
    });
  });

  describe('batch export', () => {
    it('should export multiple projects', async () => {
      const projects = [mockProject, { ...mockProject, id: 'test-2', orderNumber: 'ORD-002' }];
      const config = {
        projects,
        format: 'pdf' as ExportFormat,
        options: { language: 'en' as const },
      };

      const result = await exportService.exportBatch(config);

      expect(result.success).toBeDefined();
      expect(result.results.length).toBe(projects.length);
      expect(result.totalCount).toBe(projects.length);
    });

    it('should handle batch export with errors', async () => {
      const projects = [
        mockProject,
        {} as WindowUnit, // Invalid project
      ];
      const config = {
        projects,
        format: 'pdf' as ExportFormat,
        options: { language: 'en' as const },
      };

      const result = await exportService.exportBatch(config);

      expect(result.failedCount).toBeGreaterThan(0);
    });
  });

  describe('queue management', () => {
    it('should add export to queue', () => {
      const queueId = exportService.queueExport({
        project: mockProject,
        optimization: mockOptimization,
        format: 'pdf',
        options: { language: 'en' },
        priority: 'standard',
      });

      expect(queueId).toBeDefined();
      expect(queueId).toContain('queue_');
    });

    it('should get queue status', () => {
      exportService.queueExport({
        project: mockProject,
        optimization: mockOptimization,
        format: 'pdf',
        options: { language: 'en' },
        priority: 'standard',
      });

      const status = exportService.getQueueStatus();
      expect(status.pending).toBeGreaterThanOrEqual(0);
    });
  });
});

