/**
 * GoldTierOrchestrator - Smart Routing Between Engines
 * 
 * Integration layer that routes between:
 * - ApexEngineV2 (Gold Tier - new engineering-grade system)
 * - DualOutputGenerator (99.8% proven system - fallback)
 * 
 * Key Features:
 * - Feature flag-based routing
 * - Workshop-specific enablement
 * - Automatic fallback on errors
 * - A/B testing validation
 * - Performance monitoring
 * - Audit trail
 * 
 * @since Gold Tier Phase 1, Task 3.1
 * @see ApexEngineV2 for Gold Tier engine
 * @see DualOutputGenerator for fallback engine
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import type { WindowUnit } from '@/types/fabricator';
import type { FenestrationSystem } from '@/types/fenestration';
import { DualOutputGenerator } from '../DualOutputGenerator';
import { getPatternById } from '../presetUtils';
import { ApexEngineV2, type FabricationData as ApexFabricationData, type FrameGeometry as ApexFrameGeometry } from './ApexEngineV2';
import { PatternMigrationService } from './PatternMigrationService';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';

/**
 * Generation result from orchestrator
 */
export interface OrchestratorResult {
  visualGeometry: ApexFrameGeometry;
  fabricationData: ApexFabricationData;
  engine: 'gold_tier' | 'legacy';
  performance: {
    calculationTimeMs: number;
    engineTimeMs: number;
    validationTimeMs?: number;
  };
  validation?: {
    passed: boolean;
    discrepancies?: ValidationDiscrepancy[];
    warnings?: string[];
  };
  fallbackReason?: string;
}

/**
 * Validation discrepancy between engines
 */
export interface ValidationDiscrepancy {
  type: 'profile_length' | 'quantity' | 'hardware' | 'glazing' | 'cost';
  field: string;
  goldTier: number | string;
  legacy: number | string;
  difference: number;
  tolerance: number;
  severity: 'error' | 'warning' | 'info';
}

/**
 * GoldTierOrchestrator - Smart Routing Engine
 */
export class GoldTierOrchestrator {
  private static readonly FEATURE_FLAG = 'GOLD_TIER_ENABLED' as const;
  private static readonly VALIDATION_TOLERANCE = {
    profileLength: 0.1, // 0.1mm tolerance
    quantity: 0, // Exact match required
    hardware: 0, // Exact match required
    glazing: 0.5, // 0.5mm tolerance
    cost: 0.05, // 5% tolerance
  };

  /**
   * Generate assembly with smart routing
   */
  async generate(
    windowUnit: WindowUnit,
    options?: {
      forceLegacy?: boolean;
      skipValidation?: boolean;
      workshopId?: string;
    }
  ): Promise<OrchestratorResult> {
    const startTime = performance.now();
    GoldTierPerformanceMonitor.record('orchestrator_generate', 0);

    try {
      // Check if Gold Tier is enabled
      const isGoldTierEnabled = this.isGoldTierEnabled(windowUnit, options?.workshopId);
      
      if (options?.forceLegacy || !isGoldTierEnabled) {
        return await this.generateWithLegacy(windowUnit, startTime);
      }

      // Try to load FenestrationSystem
      const fenestrationSystem = await this.loadFenestrationSystem(windowUnit);
      
      if (!fenestrationSystem) {
        // Pattern not migrated, fallback to legacy
        return await this.generateWithLegacy(
          windowUnit,
          startTime,
          'Pattern not migrated to FenestrationSystem'
        );
      }

      // Generate with Gold Tier engine
      const goldTierResult = await this.generateWithGoldTier(
        fenestrationSystem,
        windowUnit,
        startTime
      );

      // Validate against legacy (A/B testing)
      if (!options?.skipValidation) {
        const validation = await this.validateAgainstLegacy(
          goldTierResult,
          windowUnit,
          startTime
        );

        if (!validation.passed && validation.discrepancies?.some(d => d.severity === 'error')) {
          // Critical discrepancy, fallback to legacy
          void logFabricatorAudit({
            action: 'VALIDATE',
            tableName: 'fenestration_systems',
            recordId: fenestrationSystem.id,
            status: 'failed',
            operationType: 'orchestrator_validation',
            errorMessage: 'Gold Tier validation failed, using legacy engine',
            errorCode: 'ORCH-001',
            metadata: {
              discrepancies: validation.discrepancies,
            },
          });

          return await this.generateWithLegacy(
            windowUnit,
            startTime,
            'Gold Tier validation failed'
          );
        }

        goldTierResult.validation = validation;
      }

      return goldTierResult;
    } catch (error) {
      const calculationTime = performance.now() - startTime;
      GoldTierPerformanceMonitor.record('orchestrator_generate', calculationTime, undefined, false, error instanceof Error ? error.message : String(error));

      // Fallback to legacy on any error (fire-and-forget)
      void logFabricatorAudit({
        action: 'VALIDATE',
        tableName: 'fenestration_systems',
        status: 'failed',
        operationType: 'orchestrator_generate',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'ORCH-002',
      });

      return await this.generateWithLegacy(
        windowUnit,
        startTime,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check if Gold Tier is enabled for this workshop/window
   */
  private isGoldTierEnabled(windowUnit: WindowUnit, workshopId?: string): boolean {
    // Check feature flag
    try {
      // Use environment variable or feature flag system
      const envEnabled = import.meta.env?.VITE_GOLD_TIER_ENABLED === 'true';
      if (envEnabled) return true;

      // Check workshop-specific enablement
      if (workshopId) {
        // TODO: Check workshop-specific flags from database
        // For now, check if workshop is in beta list
        const betaWorkshops = ['workshop_alpha', 'workshop_beta'];
        if (betaWorkshops.includes(workshopId)) {
          return true;
        }
      }

      // Check pattern-specific enablement (if pattern is migrated)
      const presetId = windowUnit.presetId;
      if (presetId) {
        // Check if pattern has been migrated
        // This is a simple check - in production, query database
        const migratedPatterns = [
          'sliding-2s',
          'casement-double',
          'sliding-4s',
          'casement-2sash',
          'casement-2sash-fixed',
        ];
        if (migratedPatterns.includes(presetId)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn('Error checking Gold Tier enablement, defaulting to disabled:', error);
      return false;
    }
  }

  /**
   * Load FenestrationSystem from pattern
   */
  private async loadFenestrationSystem(windowUnit: WindowUnit): Promise<FenestrationSystem | null> {
    await Promise.resolve(); // Satisfy require-await (pattern lookup is sync)
    const presetId = windowUnit.presetId;
    if (!presetId) {
      return null;
    }

    try {
      // Load pattern
      const pattern = getPatternById(presetId);
      if (!pattern) {
        return null;
      }

      // Find compatible system pack
      const systemPackId = windowUnit.systemPackId || pattern.compatibleSystems[0];
      if (!systemPackId) {
        return null;
      }

      const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemPackId);
      if (!systemPack) {
        return null;
      }

      // Check if already migrated (in production, query database)
      // For now, migrate on-the-fly
      const migrationResult = PatternMigrationService.migrate(pattern, systemPack);
      
      if (migrationResult.success && migrationResult.system) {
        return migrationResult.system;
      }

      return null;
    } catch (error) {
      console.warn('Error loading FenestrationSystem:', error);
      return null;
    }
  }

  /**
   * Generate with Gold Tier engine
   */
  private async generateWithGoldTier(
    system: FenestrationSystem,
    windowUnit: WindowUnit,
    startTime: number
  ): Promise<OrchestratorResult> {
    const engineStartTime = performance.now();
    
    const engine = new ApexEngineV2(system, windowUnit);
    const result = engine.generateAssembly();

    const engineTime = performance.now() - engineStartTime;
    const totalTime = performance.now() - startTime;

    GoldTierPerformanceMonitor.record('orchestrator_gold_tier', engineTime, undefined, true);

    // Audit log
    await logFabricatorAudit({
      action: 'VALIDATE',
      tableName: 'fenestration_systems',
      recordId: system.id,
      status: 'success',
      operationType: 'orchestrator_gold_tier',
      operationDurationMs: engineTime,
      newValues: {
        systemId: system.id,
        windowUnitId: windowUnit.id,
        engine: 'gold_tier',
      },
    });

    return {
      visualGeometry: result.visualGeometry,
      fabricationData: result.fabricationData,
      engine: 'gold_tier',
      performance: {
        calculationTimeMs: totalTime,
        engineTimeMs: engineTime,
      },
    };
  }

  /**
   * Generate with legacy engine (fallback)
   */
  private async generateWithLegacy(
    windowUnit: WindowUnit,
    startTime: number,
    reason?: string
  ): Promise<OrchestratorResult> {
    const engineStartTime = performance.now();

    const generator = new DualOutputGenerator();
    const result = await generator.generateForWindowUnit(windowUnit);

    const engineTime = performance.now() - engineStartTime;
    const totalTime = performance.now() - startTime;

    GoldTierPerformanceMonitor.record('orchestrator_legacy', engineTime, undefined, true);

    // Convert DualOutputResult to OrchestratorResult format
    // Map legacy FabricationData to ApexEngineV2 format
    const apexFabricationData: ApexFabricationData = {
      bom: {
        profiles: result.fabrication.profiles.map(p => ({
          profileCode: p.profileCode,
          role: p.role,
          quantity: p.quantity,
          cutLength: p.length * 1000, // Convert mm to microns
          totalLength: p.length * p.quantity * 1000,
          weight: p.weight,
          cost: p.cost,
        })),
        hardware: result.fabrication.hardware.map(h => ({
          hardwareId: h.id,
          category: h.category,
          quantity: h.quantity,
          unitCost: 0, // TODO: Get from hardware spec
          totalCost: 0,
        })),
        glazing: result.fabrication.glazing.map(g => ({
          type: g.type,
          width: g.dimensions.width,
          height: g.dimensions.height,
          thickness: g.dimensions.thickness,
          area: (g.dimensions.width * g.dimensions.height) / 1000000, // Convert to m²
          cost: 0, // TODO: Calculate from glazing type
        })),
        gaskets: [],
      },
      cutList: result.fabrication.profiles.flatMap(p => 
        p.cuttingLengths.map(cl => ({
          profileCode: p.profileCode,
          role: p.role,
          cutLength: cl * 1000, // Convert mm to microns
          quantity: 1,
          angle: p.angles[0] || 90,
          machining: p.machiningZones.map(mz => mz.type),
        }))
      ),
      assembly: {
        steps: result.fabrication.productionSequence.map(seq => ({
          step: seq.step,
          description: seq.operation,
          components: [],
          tools: seq.toolsRequired,
        })),
      },
      qualityChecks: [],
    };

    // Generate simple ApexEngineV2 FrameGeometry from window unit
    // (Legacy geometry structure is incompatible, so we generate basic geometry)
    const apexGeometry: ApexFrameGeometry = this.generateSimpleGeometry(windowUnit, result.fabrication);

    return {
      visualGeometry: apexGeometry,
      fabricationData: apexFabricationData,
      engine: 'legacy',
      performance: {
        calculationTimeMs: totalTime,
        engineTimeMs: engineTime,
      },
      fallbackReason: reason || 'Gold Tier not enabled',
    };
  }

  /**
   * Validate Gold Tier result against legacy (A/B testing)
   */
  private async validateAgainstLegacy(
    goldTierResult: OrchestratorResult,
    windowUnit: WindowUnit,
    _startTime: number
  ): Promise<OrchestratorResult['validation']> {
    const validationStartTime = performance.now();

    try {
      // Generate legacy result for comparison
      const generator = new DualOutputGenerator();
      const legacyResult = await generator.generateForWindowUnit(windowUnit);

      const discrepancies: ValidationDiscrepancy[] = [];

      // Compare profile lengths
      goldTierResult.fabricationData.bom.profiles.forEach((goldProfile, index) => {
        const legacyProfile = legacyResult.fabrication.profiles?.[index];
        if (legacyProfile) {
          const goldLength = goldProfile.cutLength / 1000; // Convert microns to mm
          const legacyLength = legacyProfile.length || 0; // Legacy uses 'length' not 'cutLength'
          const difference = Math.abs(goldLength - legacyLength);

          if (difference > GoldTierOrchestrator.VALIDATION_TOLERANCE.profileLength) {
            discrepancies.push({
              type: 'profile_length',
              field: goldProfile.profileCode,
              goldTier: goldLength,
              legacy: legacyLength,
              difference,
              tolerance: GoldTierOrchestrator.VALIDATION_TOLERANCE.profileLength,
              severity: difference > 1 ? 'error' : 'warning', // >1mm is error
            });
          }
        }
      });

      // Compare quantities
      if (goldTierResult.fabricationData.bom.profiles.length !== (legacyResult.fabrication.profiles?.length || 0)) {
        discrepancies.push({
          type: 'quantity',
          field: 'profiles',
          goldTier: goldTierResult.fabricationData.bom.profiles.length,
          legacy: legacyResult.fabrication.profiles?.length || 0,
          difference: Math.abs(goldTierResult.fabricationData.bom.profiles.length - (legacyResult.fabrication.profiles?.length || 0)),
          tolerance: GoldTierOrchestrator.VALIDATION_TOLERANCE.quantity,
          severity: 'error',
        });
      }

      // Compare hardware quantities
      goldTierResult.fabricationData.bom.hardware.forEach((goldHardware) => {
        const legacyHardware = legacyResult.fabrication.hardware?.find(h => h.id === goldHardware.hardwareId);
        if (legacyHardware && goldHardware.quantity !== legacyHardware.quantity) {
          discrepancies.push({
            type: 'hardware',
            field: goldHardware.hardwareId,
            goldTier: goldHardware.quantity,
            legacy: legacyHardware.quantity,
            difference: Math.abs(goldHardware.quantity - legacyHardware.quantity),
            tolerance: GoldTierOrchestrator.VALIDATION_TOLERANCE.hardware,
            severity: 'error',
          });
        }
      });

      // Compare glazing dimensions
      goldTierResult.fabricationData.bom.glazing.forEach((goldGlazing, index) => {
        const legacyGlazing = legacyResult.fabrication.glazing?.[index];
        if (legacyGlazing) {
          const widthDiff = Math.abs(goldGlazing.width - (legacyGlazing.dimensions?.width || 0));
          const heightDiff = Math.abs(goldGlazing.height - (legacyGlazing.dimensions?.height || 0));

          if (widthDiff > GoldTierOrchestrator.VALIDATION_TOLERANCE.glazing || heightDiff > GoldTierOrchestrator.VALIDATION_TOLERANCE.glazing) {
            discrepancies.push({
              type: 'glazing',
              field: `glazing-${index}`,
              goldTier: `${goldGlazing.width}x${goldGlazing.height}`,
              legacy: `${legacyGlazing.dimensions?.width || 0}x${legacyGlazing.dimensions?.height || 0}`,
              difference: Math.max(widthDiff, heightDiff),
              tolerance: GoldTierOrchestrator.VALIDATION_TOLERANCE.glazing,
              severity: Math.max(widthDiff, heightDiff) > 2 ? 'error' : 'warning', // >2mm is error
            });
          }
        }
      });

      const validationTime = performance.now() - validationStartTime;
      goldTierResult.performance.validationTimeMs = validationTime;

      const passed = discrepancies.filter(d => d.severity === 'error').length === 0;

      return {
        passed,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        warnings: discrepancies.filter(d => d.severity === 'warning').map(d => `${d.field}: ${d.difference.toFixed(2)}mm difference`),
      };
    } catch (error) {
      console.warn('Validation failed:', error);
      return {
        passed: false,
        warnings: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Generate simple geometry from window unit (for legacy fallback)
   */
  private generateSimpleGeometry(
    windowUnit: WindowUnit,
    fabrication: { glazing: Array<{ dimensions: { width: number; height: number; thickness?: number } }> }
  ): ApexFrameGeometry {
    const { overallWidth, overallHeight } = windowUnit;
    
    // Generate frame outline
    const frameOutline = [
      { x: 0, y: 0 },
      { x: overallWidth, y: 0 },
      { x: overallWidth, y: overallHeight },
      { x: 0, y: overallHeight },
    ];

    const corners = [
      { x: 0, y: 0, angle: 90 },
      { x: overallWidth, y: 0, angle: 90 },
      { x: overallWidth, y: overallHeight, angle: 90 },
      { x: 0, y: overallHeight, angle: 90 },
    ];

    // Generate sashes from grid
    const sashes: ApexFrameGeometry['sashes'] = [];
    if (windowUnit.grid) {
      windowUnit.grid.cells.forEach((cell, index) => {
        if (cell.type !== 'fixed') {
          // Calculate sash position based on grid
          const sashWidth = overallWidth / windowUnit.grid.cols;
          const sashHeight = overallHeight / windowUnit.grid.rows;
          const x = (cell.col * sashWidth);
          const y = (cell.row * sashHeight);

          // Map opening direction to ApexEngineV2 format
          let openingDirection: 'left' | 'right' | 'up' | 'down' | undefined;
          if (cell.openingDirection === 'left' || cell.openingDirection === 'right') {
            openingDirection = cell.openingDirection;
          } else if (cell.openingDirection === 'top') {
            openingDirection = 'up';
          } else if (cell.openingDirection === 'bottom') {
            openingDirection = 'down';
          }

          sashes.push({
            id: cell.id || `sash-${index}`,
            outline: [
              { x, y },
              { x: x + sashWidth, y },
              { x: x + sashWidth, y: y + sashHeight },
              { x, y: y + sashHeight },
            ],
            position: { x, y },
            openingDirection,
          });
        }
      });
    }

    // Generate glazing from fabrication data
    const glazing: ApexFrameGeometry['glazing'] = fabrication.glazing.map((g, idx) => ({
      id: `glazing-${idx}`,
      outline: [
        { x: 0, y: 0 },
        { x: g.dimensions.width, y: 0 },
        { x: g.dimensions.width, y: g.dimensions.height },
        { x: 0, y: g.dimensions.height },
      ],
      thickness: g.dimensions.thickness,
    }));

    return {
      frame: {
        outline: frameOutline,
        corners,
        mullions: undefined, // Will be populated if grid has mullions
        transoms: undefined, // Will be populated if grid has transoms
      },
      sashes,
      glazing,
    };
  }

  /**
   * Get statistics about engine usage
   */
  static getStatistics(): {
    goldTierCount: number;
    legacyCount: number;
    goldTierSuccessRate: number;
    averageGoldTierTime: number;
    averageLegacyTime: number;
  } {
    const goldTierStats = GoldTierPerformanceMonitor.getStats('orchestrator_gold_tier');
    const legacyStats = GoldTierPerformanceMonitor.getStats('orchestrator_legacy');

    return {
      goldTierCount: goldTierStats.count,
      legacyCount: legacyStats.count,
      goldTierSuccessRate: goldTierStats.successRate || 0,
      averageGoldTierTime: goldTierStats.avgMs || 0,
      averageLegacyTime: legacyStats.avgMs || 0,
    };
  }
}

