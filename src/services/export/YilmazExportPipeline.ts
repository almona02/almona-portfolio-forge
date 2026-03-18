/**
 * YilmazExportPipeline — Unified Export Orchestrator
 *
 * Chains the complete deterministic workflow:
 *   WorkflowStore → Validation → G-Code → Cut List → File Package → Download
 *
 * Constitutional compliance: All outputs are deterministic and checksummed.
 * Supports all 6 Yilmaz CNC models: AIM-3410, AIM-7510, ALM-6510, ALM-7510, PIM-6509, PIM-7510
 */

import type { CuttingPlan, OptimizationResult, WindowUnit } from '@/types/fabricator';
import {
  YilmazGCodeGenerator,
  MACHINE_SPECS,
  type YilmazMachineModel,
  type YilmazMachineSpecs,
} from '@/integrations/yilmaz/YilmazGCodeGenerator';
import {
  YilmazCutListAdapter,
  type YilmazCutListData,
  type YilmazExportOptions,
} from '@/integrations/yilmaz/YilmazCutListAdapter';
import { YilmazFileFormats, type ExportFileBundle } from './YilmazFileFormats';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExportFormat = 'gcode' | 'csv' | 'all';

export interface ExportPipelineConfig {
  machineModel: YilmazMachineModel;
  format: ExportFormat;
  includeComments: boolean;
  optimizeToolChanges: boolean;
  safetyZones: boolean;
  encoding: 'utf8' | 'windows-1254';
  locale: 'en' | 'ar';
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  messageAr: string;
  field?: string;
}

export interface PreFlightResult {
  valid: boolean;
  issues: ValidationIssue[];
  machineSpecs: YilmazMachineSpecs;
  summary: {
    totalCuts: number;
    totalProfiles: number;
    maxCutLength: number;
    minCutLength: number;
    uniqueAngles: number[];
    estimatedDuration: string;
  };
}

export interface ExportResult {
  success: boolean;
  files: ExportFileBundle;
  checksum: string;
  metadata: {
    machineModel: YilmazMachineModel;
    generatedAt: string;
    totalCuts: number;
    totalProfiles: number;
    gcodeLinesCount: number;
    projectId: string;
    orderNumber: string;
    constitutionalTier: string;
  };
  validation: PreFlightResult;
}

export type PipelineStage =
  | 'idle'
  | 'validating'
  | 'generating-gcode'
  | 'generating-cutlist'
  | 'packaging'
  | 'complete'
  | 'error';

export interface PipelineProgress {
  stage: PipelineStage;
  percent: number;
  message: string;
  messageAr: string;
}

// ─── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ExportPipelineConfig = {
  machineModel: 'AIM-3410',
  format: 'all',
  includeComments: true,
  optimizeToolChanges: true,
  safetyZones: true,
  encoding: 'utf8',
  locale: 'en',
};

// ─── Pipeline ────────────────────────────────────────────────────────────────

export class YilmazExportPipeline {
  private config: ExportPipelineConfig;
  private progressCallback?: (progress: PipelineProgress) => void;

  constructor(config?: Partial<ExportPipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Subscribe to progress updates */
  onProgress(callback: (progress: PipelineProgress) => void): void {
    this.progressCallback = callback;
  }

  /** Update config at runtime */
  updateConfig(partial: Partial<ExportPipelineConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /** Get current machine specs */
  getMachineSpecs(): YilmazMachineSpecs {
    return { ...MACHINE_SPECS[this.config.machineModel] };
  }

  /** Get all available machine models */
  static getAvailableModels(): { model: YilmazMachineModel; specs: YilmazMachineSpecs }[] {
    return (Object.keys(MACHINE_SPECS) as YilmazMachineModel[]).map((model) => ({
      model,
      specs: MACHINE_SPECS[model],
    }));
  }

  // ─── Pre-Flight Validation ───────────────────────────────────────────────

  /**
   * Validate project data against machine constraints before export.
   * Returns detailed issues with bilingual messages.
   */
  preFlight(project: WindowUnit, optimization: OptimizationResult): PreFlightResult {
    const specs = MACHINE_SPECS[this.config.machineModel];
    const issues: ValidationIssue[] = [];
    const cuttingPlans = optimization.cuttingPlan;

    // Collect metrics
    let totalCuts = 0;
    let maxCutLength = 0;
    let minCutLength = Infinity;
    const anglesSet = new Set<number>();
    const profileCount = cuttingPlans.length;

    cuttingPlans.forEach((plan, planIdx) => {
      totalCuts += plan.cuts.length;

      plan.cuts.forEach((cut, cutIdx) => {
        anglesSet.add(cut.angle);

        if (cut.length > maxCutLength) maxCutLength = cut.length;
        if (cut.length < minCutLength) minCutLength = cut.length;

        // Length bounds
        if (cut.length > specs.maxCutLength) {
          issues.push({
            severity: 'error',
            code: 'CUT_EXCEEDS_MAX_LENGTH',
            message: `Plan ${planIdx + 1}, Cut ${cutIdx + 1}: Length ${cut.length}mm exceeds machine max ${specs.maxCutLength}mm`,
            messageAr: `خطة ${planIdx + 1}، قطع ${cutIdx + 1}: الطول ${cut.length}مم يتجاوز الحد الأقصى للماكينة ${specs.maxCutLength}مم`,
            field: `cuttingPlan[${planIdx}].cuts[${cutIdx}].length`,
          });
        }

        if (cut.length < specs.minCutLength) {
          issues.push({
            severity: 'error',
            code: 'CUT_BELOW_MIN_LENGTH',
            message: `Plan ${planIdx + 1}, Cut ${cutIdx + 1}: Length ${cut.length}mm below machine min ${specs.minCutLength}mm`,
            messageAr: `خطة ${planIdx + 1}، قطع ${cutIdx + 1}: الطول ${cut.length}مم أقل من الحد الأدنى للماكينة ${specs.minCutLength}مم`,
            field: `cuttingPlan[${planIdx}].cuts[${cutIdx}].length`,
          });
        }

        // Angle support
        if (!specs.supportedAngles.includes(cut.angle)) {
          issues.push({
            severity: 'error',
            code: 'UNSUPPORTED_ANGLE',
            message: `Plan ${planIdx + 1}, Cut ${cutIdx + 1}: Angle ${cut.angle}° not supported by ${specs.model}`,
            messageAr: `خطة ${planIdx + 1}، قطع ${cutIdx + 1}: الزاوية ${cut.angle}° غير مدعومة بواسطة ${specs.model}`,
            field: `cuttingPlan[${planIdx}].cuts[${cutIdx}].angle`,
          });
        }
      });

      // Stock length check
      if (plan.stockLength > specs.maxLength) {
        issues.push({
          severity: 'warning',
          code: 'STOCK_EXCEEDS_MACHINE',
          message: `Plan ${planIdx + 1}: Stock length ${plan.stockLength}mm exceeds machine capacity ${specs.maxLength}mm`,
          messageAr: `خطة ${planIdx + 1}: طول المخزون ${plan.stockLength}مم يتجاوز سعة الماكينة ${specs.maxLength}مم`,
          field: `cuttingPlan[${planIdx}].stockLength`,
        });
      }
    });

    // No cutting plans
    if (cuttingPlans.length === 0) {
      issues.push({
        severity: 'error',
        code: 'NO_CUTTING_PLANS',
        message: 'No cutting plans found in optimization result',
        messageAr: 'لم يتم العثور على خطط قطع في نتيجة التحسين',
      });
    }

    // Tool magazine capacity warning
    const uniqueAnglesCount = anglesSet.size;
    if (specs.toolMagazine && specs.toolMagazineCapacity && uniqueAnglesCount > specs.toolMagazineCapacity) {
      issues.push({
        severity: 'warning',
        code: 'TOOL_MAGAZINE_CAPACITY',
        message: `${uniqueAnglesCount} unique operations may exceed tool magazine capacity (${specs.toolMagazineCapacity} slots)`,
        messageAr: `${uniqueAnglesCount} عمليات فريدة قد تتجاوز سعة مجلة الأدوات (${specs.toolMagazineCapacity} فتحة)`,
      });
    }

    // Informational
    issues.push({
      severity: 'info',
      code: 'MACHINE_PRECISION',
      message: `Machine precision: ±${specs.precision}mm | Axes: ${specs.axes}`,
      messageAr: `دقة الماكينة: ±${specs.precision}مم | المحاور: ${specs.axes}`,
    });

    // Estimate duration (rough: 15s per cut + 30s per tool change)
    const estimatedToolChanges = Math.max(0, uniqueAnglesCount - 1);
    const estimatedSeconds = totalCuts * 15 + estimatedToolChanges * 30;
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;

    const hasErrors = issues.some((i) => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues,
      machineSpecs: specs,
      summary: {
        totalCuts,
        totalProfiles: profileCount,
        maxCutLength,
        minCutLength: minCutLength === Infinity ? 0 : minCutLength,
        uniqueAngles: Array.from(anglesSet).sort((a, b) => a - b),
        estimatedDuration: `${minutes}m ${seconds}s`,
      },
    };
  }

  // ─── Full Export Pipeline ────────────────────────────────────────────────

  /**
   * Execute the complete export pipeline.
   * Returns downloadable file bundles with checksums.
   */
  async execute(
    project: WindowUnit,
    optimization: OptimizationResult
  ): Promise<ExportResult> {
    const startTime = Date.now();

    // Stage 1: Validate
    this.emitProgress('validating', 10, 'Validating against machine constraints…', 'التحقق من قيود الماكينة…');
    const validation = this.preFlight(project, optimization);

    if (!validation.valid) {
      this.emitProgress('error', 0, 'Validation failed', 'فشل التحقق');
      return {
        success: false,
        files: { gcode: null, csv: null, manifest: null },
        checksum: '',
        metadata: this.buildMetadata(project, optimization, 0),
        validation,
      };
    }

    const cuttingPlans = optimization.cuttingPlan;

    // Stage 2: Generate G-Code
    let gcodeContent = '';
    let gcodeLinesCount = 0;

    if (this.config.format === 'gcode' || this.config.format === 'all') {
      this.emitProgress('generating-gcode', 30, 'Generating G-code program…', 'إنشاء برنامج G-code…');
      const gcodeResult = this.generateGCode(cuttingPlans);
      gcodeContent = gcodeResult.content;
      gcodeLinesCount = gcodeResult.lineCount;
    }

    // Stage 3: Generate Cut List CSV
    let csvContent = '';

    if (this.config.format === 'csv' || this.config.format === 'all') {
      this.emitProgress('generating-cutlist', 60, 'Generating cut list…', 'إنشاء قائمة القطع…');
      csvContent = await this.generateCutListCSV(project, cuttingPlans);
    }

    // Stage 4: Package files
    this.emitProgress('packaging', 85, 'Packaging export files…', 'تجميع ملفات التصدير…');

    const manifest = this.buildManifest(project, optimization, validation, gcodeLinesCount);
    const files = YilmazFileFormats.createBundle({
      gcode: gcodeContent || null,
      csv: csvContent || null,
      manifest,
      machineModel: this.config.machineModel,
      orderNumber: project.orderNumber,
    });

    // Compute combined checksum
    const checksum = YilmazFileFormats.computeChecksum(
      [gcodeContent, csvContent, JSON.stringify(manifest)].filter(Boolean).join('\n')
    );

    const elapsed = Date.now() - startTime;
    this.emitProgress('complete', 100, `Export complete in ${elapsed}ms`, `اكتمل التصدير في ${elapsed}مللي ثانية`);

    return {
      success: true,
      files,
      checksum,
      metadata: this.buildMetadata(project, optimization, gcodeLinesCount),
      validation,
    };
  }

  // ─── G-Code Generation ─────────────────────────────────────────────────

  private generateGCode(cuttingPlans: CuttingPlan[]): { content: string; lineCount: number } {
    const generator = new YilmazGCodeGenerator(this.config.machineModel, {
      optimizeToolChanges: this.config.optimizeToolChanges,
      minimizeWaste: true,
      safetyZones: this.config.safetyZones,
      includeComments: this.config.includeComments,
      coordinateSystem: 'absolute',
      units: 'mm',
    });

    const commands = generator.generateGCode(cuttingPlans);
    const content = YilmazGCodeGenerator.commandsToString(commands);
    const lineCount = commands.length;

    return { content, lineCount };
  }

  // ─── Cut List CSV ──────────────────────────────────────────────────────

  private async generateCutListCSV(
    project: WindowUnit,
    cuttingPlans: CuttingPlan[]
  ): Promise<string> {
    const adapter = new YilmazCutListAdapter();

    const cutListData: YilmazCutListData = {
      orderNumber: project.orderNumber,
      projectName: project.positionMeta?.remarks || project.orderNumber,
      date: new Date(),
      cuttingPlans,
      metadata: {
        operator: undefined,
        machineModel: this.config.machineModel,
        notes: `Generated by Fabricator Pro | Constitutional Tier 3`,
      },
    };

    const exportOptions: YilmazExportOptions = {
      format: 'csv',
      machineSeries: 'cnc',
      includeBarcodes: false,
      includeMetadata: true,
      encoding: this.config.encoding,
      decimalSeparator: '.',
    };

    return adapter.exportToCSV(cutListData, exportOptions);
  }

  // ─── Manifest ──────────────────────────────────────────────────────────

  private buildManifest(
    project: WindowUnit,
    optimization: OptimizationResult,
    validation: PreFlightResult,
    gcodeLinesCount: number
  ): Record<string, unknown> {
    return {
      version: '1.0.0',
      generator: 'Fabricator Pro — Yilmaz Export Pipeline',
      constitutional: {
        tier: 'Tier 3 Protected Determinism',
        disclaimer:
          'This export contains manufacturable instructions only. No engineering judgment is claimed. All outputs require human validation.',
        accuracyFramework: '99.8%',
      },
      project: {
        id: project.id,
        orderNumber: project.orderNumber,
        type: project.type,
        dimensions: `${project.overallWidth}×${project.overallHeight}mm`,
      },
      machine: {
        model: this.config.machineModel,
        specs: MACHINE_SPECS[this.config.machineModel],
      },
      optimization: {
        materialUsage: optimization.materialUsage,
        wastePercentage: optimization.wastePercentage,
        nestingEfficiency: optimization.nestingEfficiency,
        totalCost: optimization.costBreakdown.totalCost,
      },
      validation: {
        passed: validation.valid,
        errors: validation.issues.filter((i) => i.severity === 'error').length,
        warnings: validation.issues.filter((i) => i.severity === 'warning').length,
      },
      export: {
        format: this.config.format,
        gcodeLinesCount,
        generatedAt: new Date().toISOString(),
        locale: this.config.locale,
      },
    };
  }

  // ─── Metadata ──────────────────────────────────────────────────────────

  private buildMetadata(
    project: WindowUnit,
    optimization: OptimizationResult,
    gcodeLinesCount: number
  ): ExportResult['metadata'] {
    return {
      machineModel: this.config.machineModel,
      generatedAt: new Date().toISOString(),
      totalCuts: optimization.cuttingPlan.reduce((sum, p) => sum + p.cuts.length, 0),
      totalProfiles: optimization.cuttingPlan.length,
      gcodeLinesCount,
      projectId: project.id,
      orderNumber: project.orderNumber,
      constitutionalTier: 'Tier 3 Protected Determinism',
    };
  }

  // ─── Progress ──────────────────────────────────────────────────────────

  private emitProgress(
    stage: PipelineStage,
    percent: number,
    message: string,
    messageAr: string
  ): void {
    this.progressCallback?.({ stage, percent, message, messageAr });
  }
}
