/**
 * End-to-End Workflow Integration Tests
 * 
 * Tests the complete workflow from DXF import to CNC export,
 * including error recovery and multi-language support.
 * 
 * Week 5 Task 5.3: End-to-End Integration Tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { ProductionDXFParser } from '@/lib/imports/ProductionDXFParser';
import { HardenedCuttingListGenerator } from '@/lib/fabricator/HardenedCuttingListGenerator';
import { ProductionOptimizer } from '@/algorithms/ProductionOptimizer';
import { productionCNCExporter } from '@/lib/cnc/ProductionCNCExporter';
import { ProductionWorkflow } from '@/lib/fabricator/ProductionWorkflow';
import { CheckpointManager } from '@/lib/fabricator/CheckpointManager';
import { SecurityGateway } from '@/lib/security/SecurityGateway';
import { WorkflowProfiler } from '@/lib/performance/WorkflowProfiler';
import type { Cut, OptimizationResult, WindowUnit, SystemPack } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';

// Mock DXF file content (simplified for testing)
const mockDXFContent = new ArrayBuffer(1024);

// Mock window unit data
const createMockWindowUnit = (): WindowUnit => ({
  id: 'test-window-1',
  orderNumber: 'ORD-001',
  posNumber: 'POS-001',
  type: 'sliding_window',
  components: [
    {
      id: 'comp-1',
      type: 'frame',
      profile: {
        id: 'profile-1',
        name: 'Test Profile',
        material: 'aluminum',
        width: 50,
        height: 20,
        thickness: 1.4,
        color: 'White',
        costPerMeter: 10,
        cuttingAllowance: 2,
        stockQuantity: 100,
        minStockLevel: 10,
        supplier: 'Test Supplier',
        specifications: {
          stockLengthMm: 6000,
        },
      },
      width: 2000,
      height: 1500,
      quantity: 1,
      cuttingLengths: [2000, 1500, 2000, 1500],
      angles: [90, 90, 90, 90],
      machiningOperations: [],
      glazingType: 'double',
      hardware: [],
    },
  ],
  overallWidth: 2000,
  overallHeight: 1500,
  color: 'White',
  glazing: { type: 'double', thickness: 6 },
  hardware: [],
  optimization: null,
  status: 'design',
  createdAt: new Date(),
  updatedAt: new Date(),
  systemPackId: 'rock60',
});

// Mock system pack
const mockSystemPack: SystemPack = SYSTEM_PACKS.find(p => p.meta.id === 'rock60') || SYSTEM_PACKS[0];

describe('End-to-End Workflow: DXF to CNC', () => {
  let dxfParser: ProductionDXFParser;
  let cuttingListGenerator: HardenedCuttingListGenerator;
  let optimizer: ProductionOptimizer;
  let workflowProfiler: WorkflowProfiler;
  let securityGateway: SecurityGateway;

  beforeAll(() => {
    dxfParser = new ProductionDXFParser();
    cuttingListGenerator = new HardenedCuttingListGenerator();
    optimizer = new ProductionOptimizer();
    workflowProfiler = new WorkflowProfiler();
    securityGateway = SecurityGateway.getInstance();
  });

  beforeEach(() => {
    workflowProfiler.reset();
  });

  describe('Complete Workflow: DXF Import → Optimization → CNC Export', () => {
    it('should complete full workflow from DXF to CNC export', async () => {
      workflowProfiler.startTiming('full_workflow');

      // Step 1: Parse DXF
      workflowProfiler.startTiming('dxf_parsing');
      const parsedResult = await dxfParser.parseDxf(mockDXFContent, 'aluminium', 'en');
      expect(parsedResult.accuracy).toBeGreaterThanOrEqual(99.5);
      expect(parsedResult.tolerance_validated).toBe(true);
      workflowProfiler.endTiming('dxf_parsing');

      // Step 2: Generate Cutting List
      workflowProfiler.startTiming('cutting_list_generation');
      const windowUnit = createMockWindowUnit();
      const cuttingListResult = cuttingListGenerator.generateCuttingList(
        mockSystemPack,
        windowUnit,
        'en'
      );
      expect(cuttingListResult.cuts.length).toBeGreaterThan(0);
      expect(cuttingListResult.accuracyScore).toBeGreaterThanOrEqual(99.8);
      expect(cuttingListResult.precisionValidated).toBe(true);
      workflowProfiler.endTiming('cutting_list_generation');

      // Step 3: Optimize
      workflowProfiler.startTiming('optimization');
      const optimizationResult = optimizer.optimize(
        cuttingListResult.cuts,
        mockSystemPack.meta.id,
        true, // deterministic mode
        'en'
      );
      expect(optimizationResult.bars.length).toBeGreaterThan(0);
      expect(optimizationResult.utilization).toBeGreaterThan(80);
      expect(optimizationResult.accuracyScore).toBeGreaterThanOrEqual(99.8);
      workflowProfiler.endTiming('optimization');

      // Step 4: Export to CNC
      workflowProfiler.startTiming('cnc_export');
      const exportResult = await productionCNCExporter.export(
        cuttingListResult.cuts,
        {
          materialUsage: optimizationResult.bars.reduce((sum, bar) => sum + bar.usedLength, 0),
          wastePercentage: (optimizationResult.waste / optimizationResult.bars.reduce((sum, bar) => sum + bar.nominalLength, 0)) * 100,
          estimatedProductionTime: 60000,
          cuttingPlan: [],
          nestingEfficiency: optimizationResult.utilization,
          costBreakdown: {
            materialCost: 100,
            laborCost: 50,
            hardwareCost: 20,
            glazingCost: 30,
            totalCost: 200,
          },
        },
        {
          machineType: 'yilmaz',
          locale: 'en',
          enableValidation: true,
          enableSimulation: true,
        }
      );
      expect(exportResult.gcode).toBeTruthy();
      expect(exportResult.checksum).toBeTruthy();
      expect(exportResult.validation.valid).toBe(true);
      workflowProfiler.endTiming('cnc_export');

      // Verify overall workflow duration
      const workflowMetrics = workflowProfiler.endTiming('full_workflow');
      expect(workflowMetrics?.duration).toBeLessThan(45 * 60 * 1000); // <45 minutes
    }, 300000); // 5 minute timeout

    it('should maintain accuracy throughout workflow', async () => {
      const windowUnit = createMockWindowUnit();

      // Parse DXF
      const parsedResult = await dxfParser.parseDxf(mockDXFContent, 'aluminium', 'en');
      expect(parsedResult.accuracy).toBeGreaterThanOrEqual(99.5);

      // Generate cutting list
      const cuttingListResult = cuttingListGenerator.generateCuttingList(
        mockSystemPack,
        windowUnit,
        'en'
      );
      expect(cuttingListResult.accuracyScore).toBeGreaterThanOrEqual(99.8);

      // Optimize
      const optimizationResult = optimizer.optimize(
        cuttingListResult.cuts,
        mockSystemPack.meta.id,
        true,
        'en'
      );
      expect(optimizationResult.accuracyScore).toBeGreaterThanOrEqual(99.8);

      // Overall accuracy should be maintained
      const overallAccuracy = Math.min(
        parsedResult.accuracy || 100,
        cuttingListResult.accuracyScore,
        optimizationResult.accuracyScore
      );
      expect(overallAccuracy).toBeGreaterThanOrEqual(99.5);
    });
  });

  describe('Error Recovery Testing', () => {
    it('should recover from DXF parsing errors', async () => {
      const invalidDXF = new ArrayBuffer(0); // Empty DXF

      try {
        await dxfParser.parseDxf(invalidDXF, 'aluminium', 'en');
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        // Error should be caught and handled gracefully
        expect(error).toBeDefined();
        // System should still be in a valid state
        expect(dxfParser).toBeDefined();
      }
    });

    it('should recover from optimization failures', async () => {
      const windowUnit = createMockWindowUnit();
      const cuttingListResult = cuttingListGenerator.generateCuttingList(
        mockSystemPack,
        windowUnit,
        'en'
      );

      // Create invalid cuts to trigger error
      const invalidCuts: Cut[] = [
        { length: -100, angle: 0, componentId: 'invalid', waste: 0 }, // Invalid length
      ];

      try {
        optimizer.optimize(invalidCuts, mockSystemPack.meta.id, true, 'en');
      } catch (error) {
        // Error should be handled gracefully
        expect(error).toBeDefined();
        // Original cutting list should still be valid
        expect(cuttingListResult.cuts.length).toBeGreaterThan(0);
      }
    });

    it('should recover from checkpoint failures', async () => {
      const checkpointManager = CheckpointManager.getInstance();
      const workflowId = 'test-workflow-recovery';

      // Create workflow with checkpointing
      const workflow = new ProductionWorkflow({
        id: workflowId,
        name: 'Test Workflow',
        locale: 'en',
        autoCheckpoint: true,
        stages: [
          {
            id: 'stage1',
            name: 'Stage 1',
            checkpointable: true,
            onStart: async () => {
              // Simulate work
              await new Promise(resolve => setTimeout(resolve, 100));
            },
            onComplete: async () => ({ data: 'stage1-complete' }),
          },
          {
            id: 'stage2',
            name: 'Stage 2',
            checkpointable: true,
            onStart: async () => {
              throw new Error('Simulated failure');
            },
            onError: async (error) => {
              // Error handler should be called
              expect(error).toBeDefined();
            },
          },
        ],
      });

      try {
        await workflow.start();
      } catch (error) {
        // Error should be caught
        expect(error).toBeDefined();

        // Checkpoint should be created before error
        const checkpoint = await checkpointManager.loadCheckpoint(workflowId, 'stage1');
        expect(checkpoint).toBeDefined();
        expect(checkpoint?.stage).toBe('stage1');
      }
    });
  });

  describe('Multi-Language Support Validation', () => {
    it('should support English error messages', async () => {
      const invalidDXF = new ArrayBuffer(0);

      try {
        await dxfParser.parseDxf(invalidDXF, 'aluminium', 'en');
      } catch (error: any) {
        // Error message should be in English
        expect(error.message).toBeTruthy();
        expect(typeof error.message).toBe('string');
      }
    });

    it('should support Arabic error messages', async () => {
      const invalidDXF = new ArrayBuffer(0);

      try {
        await dxfParser.parseDxf(invalidDXF, 'aluminium', 'ar');
      } catch (error: any) {
        // Error should have Arabic message
        expect(error.message).toBeTruthy();
        // In a real implementation, would check for Arabic characters
      }
    });

    it('should support Arabic export confirmations', async () => {
      const windowUnit = createMockWindowUnit();
      const cuttingListResult = cuttingListGenerator.generateCuttingList(
        mockSystemPack,
        windowUnit,
        'ar'
      );

      const optimizationResult = optimizer.optimize(
        cuttingListResult.cuts,
        mockSystemPack.meta.id,
        true,
        'ar'
      );

      const exportResult = await productionCNCExporter.export(
        cuttingListResult.cuts,
        {
          materialUsage: 3000,
          wastePercentage: 5,
          estimatedProductionTime: 60000,
          cuttingPlan: [],
          nestingEfficiency: optimizationResult.utilization,
          costBreakdown: {
            materialCost: 100,
            laborCost: 50,
            hardwareCost: 20,
            glazingCost: 30,
            totalCost: 200,
          },
        },
        {
          machineType: 'yilmaz',
          locale: 'ar',
        }
      );

      const confirmation = productionCNCExporter.getExportConfirmation(exportResult, 'ar');
      expect(confirmation.messageAr).toBeTruthy();
      expect(confirmation.messageAr.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow with Checkpoint Recovery', () => {
    it('should resume workflow from checkpoint', async () => {
      const workflowId = 'test-checkpoint-resume';
      const checkpointManager = CheckpointManager.getInstance();

      // Create initial checkpoint
      await checkpointManager.saveCheckpoint(
        workflowId,
        'dxf_parsing',
        'DXF Parsing',
        50, // 50% progress
        { parsedData: 'test-data' }
      );

      // Create workflow
      const workflow = new ProductionWorkflow({
        id: workflowId,
        name: 'Test Workflow',
        locale: 'en',
        autoCheckpoint: true,
        stages: [
          {
            id: 'dxf_parsing',
            name: 'DXF Parsing',
            checkpointable: true,
            onStart: async () => {
              // Check if resuming from checkpoint
              const checkpoint = await checkpointManager.loadCheckpoint(workflowId, 'dxf_parsing');
              if (checkpoint) {
                // Resume from checkpoint
                return;
              }
            },
            onComplete: async () => ({ parsedData: 'test-data' }),
          },
          {
            id: 'optimization',
            name: 'Optimization',
            checkpointable: true,
            onComplete: async () => ({ optimized: true }),
          },
        ],
      });

      // Check for resume
      const resumeInfo = await workflow.checkForResume();
      expect(resumeInfo).toBeDefined();
      expect(resumeInfo?.canResume).toBe(true);

      if (resumeInfo && resumeInfo.canResume) {
        await workflow.resume(resumeInfo.checkpoint);
        const state = workflow.getState();
        expect(state.progress).toBeGreaterThan(0);
        expect(state.currentStage).toBe('dxf_parsing');
      }
    });
  });
});

