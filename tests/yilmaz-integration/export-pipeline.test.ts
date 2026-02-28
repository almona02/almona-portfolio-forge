/**
 * Yilmaz Export Pipeline — Integration Tests
 *
 * End-to-end validation:
 *   Mock Project → Pre-Flight → G-Code → CSV → Checksum
 *
 * Tests cover:
 * 1. Pre-flight validation (pass/fail scenarios)
 * 2. G-code generation for all 6 machine models
 * 3. CSV cut list generation
 * 4. File format integrity
 * 5. Checksum determinism
 * 6. Error handling for invalid data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YilmazExportPipeline, type ExportPipelineConfig } from '@/services/export/YilmazExportPipeline';
import { YilmazFileFormats } from '@/services/export/YilmazFileFormats';
import { MACHINE_SPECS, type YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import type { CuttingPlan, OptimizationResult, Profile, WindowUnit } from '@/types/fabricator';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'profile-001',
  name: 'Test Aluminium Frame',
  material: 'aluminum',
  width: 60,
  height: 45,
  color: 'RAL 9016',
  costPerMeter: 12.5,
  cuttingAllowance: 2,
  stockQuantity: 100,
  minStockLevel: 10,
  supplier: 'Caluminium',
  ...overrides,
});

const createMockCut = (length: number, angle = 90) => ({
  length,
  angle,
  componentId: `comp-${Math.random().toString(36).substr(2, 6)}`,
  componentType: 'frame',
  waste: 5,
});

const createMockCuttingPlan = (
  cuts: Array<{ length: number; angle?: number }>,
  stockLength = 6000
): CuttingPlan => ({
  profile: createMockProfile(),
  stockLength,
  cuts: cuts.map((c) => createMockCut(c.length, c.angle ?? 90)),
  totalWaste: 150,
  utilization: 92.5,
});

const createMockOptimization = (plans: CuttingPlan[]): OptimizationResult => ({
  materialUsage: 85.5,
  wastePercentage: 14.5,
  estimatedProductionTime: 4.5,
  cuttingPlan: plans,
  nestingEfficiency: 91.2,
  costBreakdown: {
    materialCost: 450,
    laborCost: 200,
    hardwareCost: 150,
    glazingCost: 300,
    totalCost: 1100,
  },
});

const createMockProject = (overrides?: Partial<WindowUnit>): WindowUnit => ({
  id: 'project-001',
  orderNumber: 'ORD-2026-001',
  posNumber: 'P1',
  type: 'casement',
  components: [],
  overallWidth: 1200,
  overallHeight: 1500,
  color: 'RAL 9016',
  glazing: { type: 'double', thickness: 24 },
  hardware: [],
  status: 'optimized',
  optimization: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('YilmazExportPipeline', () => {
  let pipeline: YilmazExportPipeline;
  let project: WindowUnit;
  let optimization: OptimizationResult;

  beforeEach(() => {
    pipeline = new YilmazExportPipeline({ machineModel: 'AIM-3410', format: 'all' });
    project = createMockProject();
    optimization = createMockOptimization([
      createMockCuttingPlan([
        { length: 1200, angle: 45 },
        { length: 1500, angle: 45 },
        { length: 1200, angle: 90 },
        { length: 1500, angle: 90 },
      ]),
      createMockCuttingPlan([
        { length: 800, angle: 90 },
        { length: 600, angle: 45 },
      ]),
    ]);
  });

  // ─── Pre-Flight Validation ─────────────────────────────────────────────

  describe('preFlight', () => {
    it('should pass validation for valid cutting plans', () => {
      const result = pipeline.preFlight(project, optimization);

      expect(result.valid).toBe(true);
      expect(result.summary.totalCuts).toBe(6);
      expect(result.summary.totalProfiles).toBe(2);
      expect(result.summary.uniqueAngles).toContain(45);
      expect(result.summary.uniqueAngles).toContain(90);
    });

    it('should fail when cut exceeds machine max length', () => {
      const specs = MACHINE_SPECS['AIM-3410'];
      const badOptimization = createMockOptimization([
        createMockCuttingPlan([{ length: specs.maxCutLength + 100, angle: 90 }]),
      ]);

      const result = pipeline.preFlight(project, badOptimization);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'CUT_EXCEEDS_MAX_LENGTH')).toBe(true);
    });

    it('should fail when cut is below machine min length', () => {
      const specs = MACHINE_SPECS['AIM-3410'];
      const badOptimization = createMockOptimization([
        createMockCuttingPlan([{ length: specs.minCutLength - 10, angle: 90 }]),
      ]);

      const result = pipeline.preFlight(project, badOptimization);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'CUT_BELOW_MIN_LENGTH')).toBe(true);
    });

    it('should fail for unsupported angles', () => {
      const badOptimization = createMockOptimization([
        createMockCuttingPlan([{ length: 1000, angle: 37 }]), // 37° not in supported list
      ]);

      const result = pipeline.preFlight(project, badOptimization);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'UNSUPPORTED_ANGLE')).toBe(true);
    });

    it('should fail when no cutting plans exist', () => {
      const emptyOptimization = createMockOptimization([]);

      const result = pipeline.preFlight(project, emptyOptimization);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'NO_CUTTING_PLANS')).toBe(true);
    });

    it('should include bilingual messages', () => {
      const result = pipeline.preFlight(project, optimization);

      result.issues.forEach((issue) => {
        expect(issue.message).toBeTruthy();
        expect(issue.messageAr).toBeTruthy();
      });
    });

    it('should provide estimated duration', () => {
      const result = pipeline.preFlight(project, optimization);

      expect(result.summary.estimatedDuration).toMatch(/\d+m \d+s/);
    });
  });

  // ─── All Machine Models ────────────────────────────────────────────────

  describe('machine model support', () => {
    const allModels: YilmazMachineModel[] = [
      'AIM-3410',
      'AIM-7510',
      'ALM-6510',
      'ALM-7510',
      'PIM-6509',
      'PIM-7510',
    ];

    allModels.forEach((model) => {
      it(`should validate for ${model}`, () => {
        const modelPipeline = new YilmazExportPipeline({ machineModel: model });
        // Use cuts within the model's min length
        const specs = MACHINE_SPECS[model];
        const safeCuts = [
          { length: Math.max(specs.minCutLength + 100, 800), angle: 90 },
          { length: Math.max(specs.minCutLength + 200, 1000), angle: 45 },
        ];
        const safeOptimization = createMockOptimization([createMockCuttingPlan(safeCuts)]);

        const result = modelPipeline.preFlight(project, safeOptimization);

        expect(result.machineSpecs.model).toBe(model);
        expect(result.summary.totalCuts).toBe(2);
      });
    });
  });

  // ─── Full Export Pipeline ──────────────────────────────────────────────

  describe('execute', () => {
    it('should produce G-code and CSV files', async () => {
      const result = await pipeline.execute(project, optimization);

      expect(result.success).toBe(true);
      expect(result.files.gcode).not.toBeNull();
      expect(result.files.csv).not.toBeNull();
      expect(result.files.manifest).not.toBeNull();
    });

    it('should produce valid G-code content', async () => {
      const result = await pipeline.execute(project, optimization);

      expect(result.files.gcode).not.toBeNull();
      const gcode = result.files.gcode!.content;

      // G-code should contain standard commands
      expect(gcode).toContain('G21'); // Metric units
      expect(gcode).toContain('G90'); // Absolute positioning
      expect(gcode).toContain('M30'); // Program end
    });

    it('should include checksum in result', async () => {
      const result = await pipeline.execute(project, optimization);

      expect(result.checksum).toBeTruthy();
      expect(result.checksum).toMatch(/^[0-9A-F]{8}$/);
    });

    it('should produce deterministic checksums', async () => {
      const result1 = await pipeline.execute(project, optimization);
      const result2 = await pipeline.execute(project, optimization);

      // Same input → same checksum (deterministic)
      expect(result1.checksum).toBe(result2.checksum);
    });

    it('should include constitutional metadata', async () => {
      const result = await pipeline.execute(project, optimization);

      expect(result.metadata.constitutionalTier).toBe('Tier 3 Protected Determinism');
      expect(result.metadata.machineModel).toBe('AIM-3410');
      expect(result.metadata.orderNumber).toBe('ORD-2026-001');
    });

    it('should fail gracefully for invalid data', async () => {
      const emptyOptimization = createMockOptimization([]);
      const result = await pipeline.execute(project, emptyOptimization);

      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
    });

    it('should track progress stages', async () => {
      const stages: string[] = [];
      pipeline.onProgress((p) => stages.push(p.stage));

      await pipeline.execute(project, optimization);

      expect(stages).toContain('validating');
      expect(stages).toContain('complete');
    });

    it('should produce gcode-only when format is gcode', async () => {
      const gcodePipeline = new YilmazExportPipeline({ machineModel: 'AIM-3410', format: 'gcode' });
      const result = await gcodePipeline.execute(project, optimization);

      expect(result.success).toBe(true);
      expect(result.files.gcode).not.toBeNull();
      expect(result.files.csv).toBeNull();
    });

    it('should produce csv-only when format is csv', async () => {
      const csvPipeline = new YilmazExportPipeline({ machineModel: 'AIM-3410', format: 'csv' });
      const result = await csvPipeline.execute(project, optimization);

      expect(result.success).toBe(true);
      expect(result.files.csv).not.toBeNull();
      expect(result.files.gcode).toBeNull();
    });
  });

  // ─── Static Helpers ────────────────────────────────────────────────────

  describe('static methods', () => {
    it('should list all available models', () => {
      const models = YilmazExportPipeline.getAvailableModels();

      expect(models.length).toBe(6);
      expect(models.map((m) => m.model)).toContain('AIM-3410');
      expect(models.map((m) => m.model)).toContain('PIM-7510');
    });
  });
});

// ─── File Formats ────────────────────────────────────────────────────────────

describe('YilmazFileFormats', () => {
  describe('computeChecksum', () => {
    it('should produce consistent checksums', () => {
      const content = 'G21\nG90\nG0 X0 Y0 Z50\nM30';
      const checksum1 = YilmazFileFormats.computeChecksum(content);
      const checksum2 = YilmazFileFormats.computeChecksum(content);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different content', () => {
      const checksum1 = YilmazFileFormats.computeChecksum('G21\nG90');
      const checksum2 = YilmazFileFormats.computeChecksum('G21\nG91');

      expect(checksum1).not.toBe(checksum2);
    });

    it('should produce 8-character hex string', () => {
      const checksum = YilmazFileFormats.computeChecksum('test content');

      expect(checksum).toMatch(/^[0-9A-F]{8}$/);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(YilmazFileFormats.formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(YilmazFileFormats.formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
      expect(YilmazFileFormats.formatFileSize(1048576)).toBe('1.00 MB');
    });
  });

  describe('createBundle', () => {
    it('should create bundle with all files', () => {
      const bundle = YilmazFileFormats.createBundle({
        gcode: 'G21\nG90\nM30',
        csv: 'Length,Angle\n1200,45',
        manifest: { version: '1.0.0' },
        machineModel: 'AIM-3410',
        orderNumber: 'ORD-001',
      });

      expect(bundle.gcode).not.toBeNull();
      expect(bundle.csv).not.toBeNull();
      expect(bundle.manifest).not.toBeNull();

      expect(bundle.gcode!.filename).toContain('AIM-3410');
      expect(bundle.gcode!.filename).toEndWith('.nc');
      expect(bundle.csv!.filename).toContain('cutlist');
      expect(bundle.csv!.filename).toEndWith('.csv');
      expect(bundle.manifest!.filename).toContain('manifest');
      expect(bundle.manifest!.filename).toEndWith('.json');
    });

    it('should handle null files gracefully', () => {
      const bundle = YilmazFileFormats.createBundle({
        gcode: null,
        csv: 'Length,Angle\n1200,45',
        manifest: null,
        machineModel: 'AIM-3410',
        orderNumber: 'ORD-001',
      });

      expect(bundle.gcode).toBeNull();
      expect(bundle.csv).not.toBeNull();
      expect(bundle.manifest).toBeNull();
    });
  });
});
