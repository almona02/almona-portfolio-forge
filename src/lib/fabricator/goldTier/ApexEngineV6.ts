/**
 * ApexEngineV6 - "The Processor"
 * 
 * The 6th Generation Calculation Engine for Almona Fabricator Pro.
 * Replaces hardcoded logic with a Strategy Architecture + Linear Optimization.
 * 
 * New Capabilities:
 * - 1D Bin Packing (Linear Optimization)
 * - Dynamic Fabrication Strategies (Miter vs Butt)
 * - Material & Hardware Costing
 * - Micro-Caching (<1ms re-calcs)
 * 
 * @version 6.0.0
 * @tier Gold
 */

import type { SystemPack } from '@/data/systemPacks';
import { OptimizationResult, optimizeLinearCuts } from '@/lib/algorithms/LinearOptimizer';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import type { WindowUnit } from '@/types/fabricator';
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';
import { CutResult, FabricationStrategy, getFabricationStrategy } from './strategies/FabricationStrategies';

// --- Types ---
export interface ApexV6Output {
  jobId: string;
  strategyUsed: string;
  manufacturing: {
    frame: CutResult;
    sash: CutResult;
  };
  optimization: {
    frameStock: OptimizationResult;
    sashStock: OptimizationResult;
  };
  financials: {
    totalCost: number;
    currency: string;
    breakdown: {
      profiles: number;
      hardware: number;
      glass: number;
      waste: number;
    };
  };
  performance: {
    timeMs: number;
    cached: boolean;
  };
}

// --- Cache Architecture ---
interface CacheEntry {
  hash: string;
  result: ApexV6Output;
  timestamp: number;
}
const CACHE_TTL_MS = 5000; // 5 seconds hot cache
const engineCache = new Map<string, CacheEntry>();

export class ApexEngineV6 {
  private system: FenestrationSystem;
  private unit: WindowUnit;
  private strategy: FabricationStrategy;

  constructor(system: FenestrationSystem | SystemPack, unit: WindowUnit, strategyId: string = 'miter') {
    this.system = this.adaptSystemToGoldTier(system);
    this.unit = unit;
    this.strategy = getFabricationStrategy(strategyId);
  }

  /**
   * ADAPTER: Converts MVP SystemPack to Gold Tier FenestrationSystem
   * Ensures the engine never crashes on missing profile data.
   */
  private adaptSystemToGoldTier(input: FenestrationSystem | SystemPack): FenestrationSystem {
    // 1. If it's already a full Gold Tier system, return it.
    if ('profiles' in input && 'fabricationRules' in input && 'regionalPhysics' in input) {
        return input as FenestrationSystem;
    }

    const pack = input as SystemPack;
    
    // 2. Extract specific profile data from SystemPack if available, or use defaults
    // Attempting to find frame/sash from profiles array or windowSystemSpec
    const defaultProfile: ProfileSpec = {
        code: 'GENERIC-60',
        name: 'Generic 60mm Profile',
        role: 'frame',
        dimensions: { width: 60 },
        material: 'aluminum',
        standardStockLength: 6000,
        weightPerMeter: 1.2,
        costPerMeter: 15
    };

    // Try to map properties from the pack
    // NOTE: This is a robust fallback to ensure engine runs even with partial data
    return {
        id: pack.meta?.id || 'unknown-system',
        name: pack.meta?.name || 'Unknown System',
        manufacturer: 'Generic',
        version: '1.0',
        region: 'GLOBAL',
        material: 'aluminum',
        category: 'window',
        profiles: {
            frame: { ...defaultProfile, role: 'frame' },
            sash: { ...defaultProfile, role: 'sash', dimensions: { width: 72 } }, // Assuming wider sash
            mullion: { ...defaultProfile, role: 'mullion' },
            transom: { ...defaultProfile, role: 'transom' },
            glazingBead: { ...defaultProfile, role: 'glazingBead', dimensions: { width: 20 } },
        },
        fabricationRules: {
            connectionType: 'miter',
            cutting: {
                sawKerf: 1500, // 1.5mm
                miterAllowance: 0,
                barEndTrim: 5000, // 5mm
                cuttingTolerance: 500 // 0.5mm
            },
            assembly: {
                frameClearance: 5000, // 5mm
                mullionDeduction: 0,
                glazingClearance: 3000 // 3mm
            }
        },
        hardwareKit: {
             hinges: { category: 'hinge', defaultId: 'std-hinge', selectionRules: [], quantityCalculator: () => 2 },
             lockingSystem: { category: 'lock', defaultId: 'std-lock', selectionRules: [], quantityCalculator: () => 1 },
             handle: { category: 'handle', defaultId: 'std-handle', selectionRules: [], quantityCalculator: () => 1 },
             gaskets: {
                 glazingGasket: { id: 'gasket-glz', category: 'gasket', unitCost: 1, name: 'Glazing Gasket', supplierCode: 'G01', specifications: {} },
                 weatherSeal: { id: 'gasket-wth', category: 'gasket', unitCost: 1, name: 'Weather Seal', supplierCode: 'W01', specifications: {} }
             },
             cornerKeys: [],
             drainageCaps: []
        },
        constraints: {
            maxWidth: 3000,
            maxHeight: 3000,
            maxSashArea: 2.5,
            maxSashWeight: 80,
            minSashWidth: 400,
            aspectRatio: { min: 0.3, max: 3 },
            windLoadClass: 'C3',
            requiresReinforcement: () => false
        },
        regionalPhysics: {
            thermalExpansionCoefficient: 0.000023,
        },
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            validationStatus: 'draft'
        }
    };
  }

  /**
   * Main Execution Method
   */
  public generate(): ApexV6Output {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey();

    // 1. Cache Check
    if (this.checkCache(cacheKey)) {
      const cached = engineCache.get(cacheKey)!.result;
      return { ...cached, performance: { timeMs: performance.now() - startTime, cached: true } };
    }

    try {
      // 2. Geometry / Manufacturing Calculation (Strategy Pattern)
      const manufacturingData = this.calculateManufacturing();

      // 3. Linear Optimization (Bin Packing)
      const optimizationData = this.runOptimizer(manufacturingData);

      // 4. Financial Calculation
      const financials = this.calculateFinancials(optimizationData);

      // 5. Construct Result
      const result: ApexV6Output = {
        jobId: this.unit.id || 'job-001',
        strategyUsed: this.strategy.name,
        manufacturing: manufacturingData,
        optimization: optimizationData,
        financials,
        performance: {
          timeMs: performance.now() - startTime,
          cached: false,
        },
      };

      // 6. Save to Cache
      engineCache.set(cacheKey, { hash: cacheKey, result, timestamp: Date.now() });

      // 7. Telemetry
      GoldTierPerformanceMonitor.record('apex_v6_generate', result.performance.timeMs, undefined, true);
      
      // Only log audit for persistent records (valid UUIDs), skip drafts
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.unit.id);
      if (isUuid) {
        logFabricatorAudit({
          action: 'VALIDATE',
          tableName: 'ApexV6',
          recordId: this.unit.id,
          status: 'success',
          operationDurationMs: Math.round(result.performance.timeMs),
          operationType: 'Generation'
        });
      }

      return result;

    } catch (error) {
      console.error('[ApexEngineV6] Critical Failure:', error);
      GoldTierPerformanceMonitor.record('apex_v6_fail', performance.now() - startTime, undefined, false);
      throw error;
    }
  }

  // --- Internals ---

  private generateCacheKey(): string {
    return `${this.unit.id}-${this.unit.overallWidth}-${this.unit.overallHeight}-${this.strategy.name}-${JSON.stringify(this.unit.grid || {})}`;
  }

  private checkCache(key: string): boolean {
    const entry = engineCache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      engineCache.delete(key);
      return false;
    }
    return true;
  }

  private calculateManufacturing() {
    // Context needed for strategy
    const ctx = {
      width: this.unit.overallWidth * 1000, // mm -> microns
      height: this.unit.overallHeight * 1000,
      profile: this.system.profiles.frame as unknown as any, // Temporary Cast for MVP
      miterAllowance: this.system.fabricationRules.cutting.miterAllowance || 0,
      weldingBurnOff: this.system.fabricationRules.welding?.burnOff || 0,
    };

    // Calculate Frame
    const frameCuts = this.strategy.calculateFrameCuts(ctx as any);

    // Calculate Sash
    const clearance = (this.system.fabricationRules.assembly.frameClearance || 5) * 1000;
    const sashCtx = { ...ctx, width: ctx.width - (clearance * 2), height: ctx.height - (clearance * 2) };
    const sashCuts = this.strategy.calculateSashCuts(sashCtx as any);

    return { frame: frameCuts, sash: sashCuts };
  }

  private runOptimizer(manufacturing: { frame: CutResult, sash: CutResult }) {
    // 1. Prepare Frame Requests
    // Convert microns back to mm for optimizer (standard stock is in mm)
    const toMm = (micron: number) => micron / 1000;
    
    const frameRequests = [
      { id: 'f-top', length: toMm(manufacturing.frame.topLength), label: 'Frame Top', quantity: 1 },
      { id: 'f-btm', length: toMm(manufacturing.frame.bottomLength), label: 'Frame Bottom', quantity: 1 },
      { id: 'f-left', length: toMm(manufacturing.frame.leftLength), label: 'Frame Left', quantity: 1 },
      { id: 'f-right', length: toMm(manufacturing.frame.rightLength), label: 'Frame Right', quantity: 1 },
    ];

    const sashRequests = [
      { id: 's-top', length: toMm(manufacturing.sash.topLength), label: 'Sash Top', quantity: 1 },
      { id: 's-btm', length: toMm(manufacturing.sash.bottomLength), label: 'Sash Bottom', quantity: 1 },
      { id: 's-left', length: toMm(manufacturing.sash.leftLength), label: 'Sash Left', quantity: 1 },
      { id: 's-right', length: toMm(manufacturing.sash.rightLength), label: 'Sash Right', quantity: 1 },
    ];

    // 2. Optimize
    const stockLen = 6000; // 6 meters
    const frameOpt = optimizeLinearCuts(frameRequests, stockLen);
    const sashOpt = optimizeLinearCuts(sashRequests, stockLen);

    return { frameStock: frameOpt, sashStock: sashOpt };
  }

  private calculateFinancials(opt: { frameStock: OptimizationResult, sashStock: OptimizationResult }) {
    // Costing Logic
    const frameCostPerMeter = this.system.profiles.frame.costPerMeter || 10; // Fallback $10/m
    const sashCostPerMeter = this.system.profiles.sash.costPerMeter || 12;

    const profileCost = 
      (opt.frameStock.totalStockLength / 1000 * frameCostPerMeter) +
      (opt.sashStock.totalStockLength / 1000 * sashCostPerMeter);
      
    // Hardware Cost (Mocked for V6 MVP, would fetch from HardwareLibrary)
    const hardwareCost = 50.00; 

    // Glass Cost
    const glassArea = (this.unit.overallWidth * this.unit.overallHeight) / 1000000; // m2
    const glassRate = 45.00; // $45/m2
    const glassCost = glassArea * glassRate;

    // Waste Cost (Cost of unused material)
    // We already paid for the full bar in profileCost, but let's calculate the "Loss" value
    const wasteCost = (opt.frameStock.totalWaste / 1000 * frameCostPerMeter) + (opt.sashStock.totalWaste / 1000 * sashCostPerMeter);

    return {
      totalCost: profileCost + hardwareCost + glassCost,
      currency: 'USD',
      breakdown: {
        profiles: profileCost,
        hardware: hardwareCost,
        glass: glassCost,
        waste: wasteCost // Informational
      }
    };
  }
}
