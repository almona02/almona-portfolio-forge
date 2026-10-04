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

import type { SystemPack } from '@/types/fabricator';
import { OptimizationResult, optimizeLinearCuts } from '@/lib/algorithms/LinearOptimizer';
import {
  resolveManufacturingSettings,
  systemPackCuttingOverrideFromMicrons,
} from '@/lib/fabricator/ManufacturingSettings';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import type { WindowUnit } from '@/types/fabricator';
import type { FenestrationSystem } from '@/types/fenestration';
import { ApexSystemAuthorityError } from './ApexSystemAuthorityError';
import { buildApexV6CacheKey } from './apexV6CacheKey';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';
import type { Profile } from '@/types/fabricator';
import type { ManufacturingPhysicalCell } from '@/lib/fabricator/manufacturing/ManufacturingDesignContract';
import { CutResult, type FabricationContext, FabricationStrategy, getFabricationStrategy } from './strategies/FabricationStrategies';

export { ApexSystemAuthorityError } from './ApexSystemAuthorityError';
export type { ApexSystemAuthorityErrorCode } from './ApexSystemAuthorityError';
export { buildApexV6CacheKey } from './apexV6CacheKey';

/** True when input is an authoritative FenestrationSystem (not a SystemPack array-profiles pack). */
export function isAuthoritativeFenestrationSystem(
  input: FenestrationSystem | SystemPack
): input is FenestrationSystem {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<FenestrationSystem> & { profiles?: unknown };
  if (!candidate.fabricationRules || !candidate.regionalPhysics) return false;
  const profiles = candidate.profiles;
  if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) return false;
  const keyed = profiles as Partial<FenestrationSystem['profiles']>;
  return Boolean(keyed.frame && keyed.sash);
}

function assertAuthoritativeProfiles(system: FenestrationSystem): void {
  const frame = system.profiles?.frame;
  const sash = system.profiles?.sash;
  if (!frame) {
    throw new ApexSystemAuthorityError({
      code: 'MISSING_FRAME_PROFILE',
      systemId: system.id,
      missing: ['profiles.frame'],
      message: `Apex V6 blocked: system "${system.id}" is missing an approved frame profile.`,
    });
  }
  if (!sash) {
    throw new ApexSystemAuthorityError({
      code: 'MISSING_SASH_PROFILE',
      systemId: system.id,
      missing: ['profiles.sash'],
      message: `Apex V6 blocked: system "${system.id}" is missing an approved sash profile.`,
    });
  }

  for (const profile of [frame, sash]) {
    const code = (profile.code || '').toUpperCase();
    if (code.startsWith('GENERIC')) {
      throw new ApexSystemAuthorityError({
        code: 'GENERIC_PROFILE_FORBIDDEN',
        systemId: system.id,
        missing: [`profiles.${profile.role}.code`],
        message: `Apex V6 blocked: invented profile code "${profile.code}" is not manufacturing-authoritative.`,
      });
    }
    const widthMm = profile.dimensions?.width;
    if (
      !Number.isFinite(widthMm) ||
      widthMm <= 0 ||
      !Number.isFinite(profile.standardStockLength) ||
      profile.standardStockLength <= 0
    ) {
      throw new ApexSystemAuthorityError({
        code: 'INCOMPLETE_SYSTEM_PACK',
        systemId: system.id,
        missing: [`profiles.${profile.role}.dimensions|standardStockLength`],
        message: `Apex V6 blocked: profile "${profile.code}" lacks approved width/stock length.`,
      });
    }
  }
}

// --- Types ---
export interface ApexV6Output {
  jobId: string;
  strategyUsed: string;
  manufacturing: {
    frame: CutResult;
    sash: CutResult;
    sashes: readonly ApexV6SashAssembly[];
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

export interface ApexV6SashAssembly extends CutResult {
  readonly sourceCellId: string;
  readonly openingDirection?: ManufacturingPhysicalCell['openingDirection'];
  readonly boundsMm: ManufacturingPhysicalCell['bounds'];
}

// --- Cache Architecture ---
interface CacheEntry {
  hash: string;
  result: ApexV6Output;
  timestamp: number;
}
const CACHE_TTL_MS = 5000; // 5 seconds hot cache
const engineCache = new Map<string, CacheEntry>();

/** Test/ops helper: clear the hot manufacturing cache (FP-028 / A3). */
export function clearApexV6Cache(): void {
  engineCache.clear();
}

export class ApexEngineV6 {
  private system: FenestrationSystem;
  private unit: WindowUnit;
  private strategy: FabricationStrategy;
  private physicalCells?: readonly ManufacturingPhysicalCell[];
  private cacheIdentity?: string;

  constructor(
    system: FenestrationSystem | SystemPack,
    unit: WindowUnit,
    strategyId: string = 'miter',
    physicalCells?: readonly ManufacturingPhysicalCell[],
    cacheIdentity?: string
  ) {
    this.system = this.adaptSystemToGoldTier(system);
    this.unit = unit;
    this.strategy = getFabricationStrategy(strategyId);
    this.physicalCells = physicalCells;
    this.cacheIdentity = cacheIdentity;
  }

  /**
   * FP-028 / A2: Accept only authoritative FenestrationSystem data.
   * Never invent GENERIC profiles, stock, tolerances, hardware, or fabrication rules
   * for incomplete SystemPack inputs.
   */
  private adaptSystemToGoldTier(input: FenestrationSystem | SystemPack): FenestrationSystem {
    if (isAuthoritativeFenestrationSystem(input)) {
      assertAuthoritativeProfiles(input);
      return input;
    }

    const pack = input as SystemPack & { meta?: { id?: string; name?: string } };
    const systemId = pack.meta?.id ?? pack.id ?? 'unknown-system';

    throw new ApexSystemAuthorityError({
      code: 'INCOMPLETE_SYSTEM_PACK',
      systemId,
      missing: [
        'fenestrationSystem.profiles.frame',
        'fenestrationSystem.profiles.sash',
        'fabricationRules',
        'regionalPhysics',
      ],
      message:
        `Apex V6 blocked: system pack "${systemId}" is not manufacturing-authoritative. ` +
        'Approved FenestrationSystem frame/sash profiles and fabrication rules are required; ' +
        'generic defaults are forbidden (FP-028 / A2).',
    });
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
        void logFabricatorAudit({
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
    // FP-028 / A3: include system rules, profiles, quantity, glazing, revision
    return `${buildApexV6CacheKey(this.system, this.unit, this.strategy.name)}:${JSON.stringify(this.physicalCells ?? null)}:${this.cacheIdentity ?? 'legacy'}`;
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
    // Context needed for strategy (ProfileSpec adapted to Profile for strategy compatibility)
    const frameSpec = this.system.profiles.frame;
    const profile: Profile = {
      id: frameSpec.code,
      name: frameSpec.name,
      material: frameSpec.material,
      width: frameSpec.dimensions?.width ?? 60,
      color: '',
      costPerMeter: frameSpec.costPerMeter,
      cuttingAllowance: 0,
      stockQuantity: 0,
      minStockLevel: 0,
      supplier: '',
    };
    const ctx: FabricationContext = {
      width: this.unit.overallWidth * 1000, // mm -> microns
      height: this.unit.overallHeight * 1000,
      profile,
      miterAllowance: this.system.fabricationRules.cutting.miterAllowance || 0,
      weldingBurnOff: this.system.fabricationRules.welding?.burnOff || 0,
    };

    // Calculate Frame
    const frameCuts = this.strategy.calculateFrameCuts(ctx);

    // Calculate Sash
    const clearance = (this.system.fabricationRules.assembly.frameClearance || 5) * 1000;
    const sashCtx: FabricationContext = { ...ctx, width: ctx.width - (clearance * 2), height: ctx.height - (clearance * 2) };
    const sashCuts = this.strategy.calculateSashCuts(sashCtx);
    const sashes = this.resolvePhysicalCells()
      .filter((cell) => cell.type === 'sash' || cell.type === 'sliding')
      .map((cell): ApexV6SashAssembly => {
        const cellCtx: FabricationContext = {
          ...ctx,
          width: cell.bounds.widthMm * 1000 - (clearance * 2),
          height: cell.bounds.heightMm * 1000 - (clearance * 2),
        };
        return {
          sourceCellId: cell.id,
          ...(cell.openingDirection ? { openingDirection: cell.openingDirection } : {}),
          boundsMm: cell.bounds,
          ...this.strategy.calculateSashCuts(cellCtx),
        };
      });

    return { frame: frameCuts, sash: sashCuts, sashes };
  }

  private resolvePhysicalCells(): readonly ManufacturingPhysicalCell[] {
    if (this.physicalCells) return this.physicalCells;
    const grid = this.unit.grid;
    if (!grid?.cells.length) return [];

    const segmentSizes = (values: readonly number[] | undefined, count: number, totalMm: number): number[] => {
      if (!values || values.length !== count || values.some((value) => !Number.isFinite(value) || value <= 0)) {
        return Array.from({ length: count }, () => totalMm / count);
      }
      const sum = values.reduce((total, value) => total + value, 0);
      return values.map((value) => totalMm * value / sum);
    };
    const columns = segmentSizes(grid.colWidths, grid.cols, this.unit.overallWidth);
    const rows = segmentSizes(grid.rowHeights, grid.rows, this.unit.overallHeight);
    const offsets = (segments: readonly number[]): number[] => {
      const result = [0];
      for (const segment of segments) result.push(result[result.length - 1] + segment);
      return result;
    };
    const x = offsets(columns);
    const y = offsets(rows);

    return [...grid.cells]
      .sort((left, right) => left.row - right.row || left.col - right.col || left.id.localeCompare(right.id))
      .map((cell): ManufacturingPhysicalCell => {
        const rowSpan = cell.rowSpan ?? 1;
        const colSpan = cell.colSpan ?? 1;
        return {
          id: cell.id,
          row: cell.row,
          col: cell.col,
          rowSpan,
          colSpan,
          type: cell.type,
          ...(cell.openingDirection ? { openingDirection: cell.openingDirection } : {}),
          bounds: {
            xMm: x[cell.col],
            yMm: y[cell.row],
            widthMm: x[cell.col + colSpan] - x[cell.col],
            heightMm: y[cell.row + rowSpan] - y[cell.row],
          },
        };
      });
  }

  private runOptimizer(manufacturing: { frame: CutResult, sash: CutResult }) {
    // 1. Prepare Frame Requests (quantity-aware: multiply by unit.quantity for cut list)
    const toMm = (micron: number) => micron / 1000;
    const unitQty = Math.max(1, this.unit.quantity ?? 1);

    const frameRequests = [
      { id: 'f-top', length: toMm(manufacturing.frame.topLength), label: 'Frame Top', quantity: unitQty },
      { id: 'f-btm', length: toMm(manufacturing.frame.bottomLength), label: 'Frame Bottom', quantity: unitQty },
      { id: 'f-left', length: toMm(manufacturing.frame.leftLength), label: 'Frame Left', quantity: unitQty },
      { id: 'f-right', length: toMm(manufacturing.frame.rightLength), label: 'Frame Right', quantity: unitQty },
    ];

    const sashRequests = [
      { id: 's-top', length: toMm(manufacturing.sash.topLength), label: 'Sash Top', quantity: unitQty },
      { id: 's-btm', length: toMm(manufacturing.sash.bottomLength), label: 'Sash Bottom', quantity: unitQty },
      { id: 's-left', length: toMm(manufacturing.sash.leftLength), label: 'Sash Left', quantity: unitQty },
      { id: 's-right', length: toMm(manufacturing.sash.rightLength), label: 'Sash Right', quantity: unitQty },
    ];

    // 2. Optimize
    const stockLen = 6000; // 6 meters
    const settings = resolveManufacturingSettings({
      systemPack: systemPackCuttingOverrideFromMicrons(this.system.fabricationRules.cutting),
    });
    const frameOpt = optimizeLinearCuts(frameRequests, stockLen, settings.sawKerfMm, settings.trimCutMm);
    const sashOpt = optimizeLinearCuts(sashRequests, stockLen, settings.sawKerfMm, settings.trimCutMm);

    return { frameStock: frameOpt, sashStock: sashOpt };
  }

  private calculateFinancials(opt: { frameStock: OptimizationResult, sashStock: OptimizationResult }) {
    const unitQty = Math.max(1, this.unit.quantity ?? 1);
    const frameCostPerMeter = this.system.profiles.frame.costPerMeter || 10;
    const sashCostPerMeter = this.system.profiles.sash.costPerMeter || 12;

    const profileCost =
      (opt.frameStock.totalStockLength / 1000 * frameCostPerMeter) +
      (opt.sashStock.totalStockLength / 1000 * sashCostPerMeter);

    const hardwareCost = 50.00 * unitQty;
    const glassArea = (this.unit.overallWidth * this.unit.overallHeight) / 1000000;
    const glassRate = 45.00;
    const glassCost = glassArea * glassRate * unitQty;

    const wasteCost = (opt.frameStock.totalWaste / 1000 * frameCostPerMeter) + (opt.sashStock.totalWaste / 1000 * sashCostPerMeter);

    return {
      totalCost: profileCost + hardwareCost + glassCost,
      currency: 'USD',
      breakdown: {
        profiles: profileCost,
        hardware: hardwareCost,
        glass: glassCost,
        waste: wasteCost
      }
    };
  }
}
