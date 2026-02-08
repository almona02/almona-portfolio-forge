/**
 * YilmazMachineDriver — Adapter implementing MachineInterface
 *
 * Wires the three existing Yilmaz subsystems through the unified contract:
 *
 *   validate()              → MachineCompatibilityChecker (design-time)
 *   generateProductionFile() → YilmazCutListAdapter (CSV/MDB export)
 *   sendToMachine()          → YilmazNetworkProtocol (WebSocket upload)
 *
 * This is the "One-Click Export" driver. The Enhanced3DPreview Operator View
 * calls validate() for the badge. The Production View calls
 * generateProductionFile() + sendToMachine() for the full pipeline.
 *
 * IMPORTANT: This class does NOT duplicate logic. It delegates to existing
 * code that has been tested independently. It is the "glue" layer.
 *
 * @since Defragmentation Phase 2 — 2026-02-08
 */

import { YilmazCutListAdapter, type YilmazExportOptions } from '@/integrations/yilmaz/YilmazCutListAdapter';
import type { YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import {
    YILMAZ_AIM_3410,
    YILMAZ_ALM_6510,
    YILMAZ_DC_421_PBS,
    YILMAZ_PIM_6509,
    checkMachineCompatibility,
} from '@/lib/machines/core/MachineCompatibilityChecker';
import type {
    MachineDefinition,
    MachineInterface,
    MachineValidationResult,
    TransferStatus,
} from '@/lib/machines/core/MachineInterface';
import { YilmazNetworkProtocol, type YilmazNetworkConfig } from '@/machine-connectors/YilmazNetworkProtocol';
import type { CuttingPlan, WindowUnit } from '@/types/fabricator';

// ─── Model → Definition mapping ─────────────────────────────────────

const MODEL_TO_DEFINITION: Record<string, MachineDefinition> = {
  'ALM-6510': YILMAZ_ALM_6510,
  'PIM-6509': YILMAZ_PIM_6509,
  'DC-421-PBS': YILMAZ_DC_421_PBS,
  'AIM-3410': YILMAZ_AIM_3410,
};

const MODEL_TO_SERIES: Record<string, 'dc' | 'cnc'> = {
  'ALM-6510': 'cnc',
  'ALM-7510': 'cnc',
  'AIM-3410': 'cnc',
  'AIM-7510': 'cnc',
  'PIM-6509': 'cnc',
  'PIM-7510': 'cnc',
  'DC-421-PBS': 'dc',
  'DC-421-PSD': 'dc',
  'DC-550-PB': 'dc',
};

// ─── The driver ─────────────────────────────────────────────────────

export class YilmazMachineDriver implements MachineInterface {
  readonly machineId: string;
  readonly machineName: string;
  readonly machineBrand = 'yilmaz' as const;

  private definition: MachineDefinition;
  private model: YilmazMachineModel;
  private networkProtocol: YilmazNetworkProtocol | null = null;
  private cutListAdapter: YilmazCutListAdapter;

  constructor(
    model: YilmazMachineModel,
    networkConfig?: YilmazNetworkConfig
  ) {
    this.model = model;
    this.definition = MODEL_TO_DEFINITION[model] || YILMAZ_ALM_6510;
    this.machineId = this.definition.machineId;
    this.machineName = this.definition.machineName;
    this.cutListAdapter = new YilmazCutListAdapter();

    // Network protocol is optional — only needed for sendToMachine()
    if (networkConfig) {
      this.networkProtocol = new YilmazNetworkProtocol(networkConfig);
    }
  }

  // ─── 1. VALIDATE ────────────────────────────────────────────────

  /**
   * "Can this design be manufactured on this machine?"
   *
   * Delegates to MachineCompatibilityChecker which checks:
   *   - Profile dimensions (min/max)
   *   - Material compatibility
   *   - Angle capabilities
   *   - Clamp zone dead-zones
   *   - Batch feasibility
   */
  validate(unit: WindowUnit): MachineValidationResult {
    return checkMachineCompatibility(unit, this.definition);
  }

  // ─── 2. GENERATE PRODUCTION FILE ───────────────────────────────

  /**
   * "Create the file this machine needs to cut/mill."
   *
   * Pipeline:
   *   WindowUnit → CuttingPlan[] (via optimization data)
   *   CuttingPlan[] → CSV or MDB (via YilmazCutListAdapter)
   *   → Blob (ready for download or sendToMachine)
   *
   * The format depends on machine series:
   *   - CNC series (ALM/AIM/PIM): MDB preferred, CSV fallback
   *   - DC series (mitre saws): CSV
   */
  async generateProductionFile(unit: WindowUnit): Promise<Blob> {
    // ─── GHOST DATA CHECK ──────────────────────────────────────────
    // Sending an empty CSV header (or MDB with zero rows) to older CNC
    // controllers can crash the firmware or hang the UI. Fail fast here.
    if (!unit || unit.overallWidth <= 0 || unit.overallHeight <= 0) {
      throw new Error(
        `[SAFETY] Cannot generate production file: WindowUnit has invalid dimensions ` +
        `(${unit?.overallWidth ?? 0} × ${unit?.overallHeight ?? 0}mm). ` +
        `Design must have positive width and height.`
      );
    }

    const hasOptimization = unit.optimization?.cuttingPlan && unit.optimization.cuttingPlan.length > 0;
    const hasComponents = unit.components && unit.components.length > 0;

    if (!hasOptimization && !hasComponents) {
      throw new Error(
        `[SAFETY] Cannot generate production file: WindowUnit "${unit.id}" has no ` +
        `components and no optimization data. The machine would receive an empty ` +
        `file. Add at least one component or run optimization first.`
      );
    }

    // Step 1: Extract cutting plans from WindowUnit
    const cuttingPlans = this.extractCuttingPlans(unit);

    // Step 2: Determine export format based on machine series
    const series = MODEL_TO_SERIES[this.model] || 'cnc';
    const format = this.definition.exportFormat === 'mdb' ? 'mdb' : 'csv';

    const exportOptions: YilmazExportOptions = {
      format,
      machineSeries: series,
      includeBarcodes: true,
      includeMetadata: true,
      decimalSeparator: '.',
    };

    const data = {
      orderNumber: unit.orderNumber || unit.projectCode || `ALM-${Date.now()}`,
      projectName: unit.customer || 'Almona Export',
      date: new Date(),
      cuttingPlans,
      metadata: {
        operator: 'Almona Studio',
        machineModel: this.model,
        notes: `Generated for ${this.machineName} via MachineInterface`,
      },
    };

    // Step 3: Generate via adapter
    const result = await this.cutListAdapter.export(data, exportOptions);

    // Step 4: Convert to Blob
    if (typeof result === 'string') {
      // CSV string
      return new Blob([result], { type: 'text/csv;charset=utf-8' });
    } else {
      // MDB Buffer
      return new Blob([result], { type: 'application/x-msaccess' });
    }
  }

  // ─── 3. SEND TO MACHINE ────────────────────────────────────────

  /**
   * "Upload the file to the machine over the network."
   *
   * Delegates to YilmazNetworkProtocol.uploadCuttingList()
   * which uses WebSocket to push to the machine controller.
   *
   * Requires a network config to be provided at construction time.
   */
  async sendToMachine(file: Blob): Promise<TransferStatus> {
    if (!this.networkProtocol) {
      return {
        success: false,
        error: 'No network configuration provided. Connect to the machine first.',
      };
    }

    try {
      // Convert Blob to string for the protocol
      const text = await file.text();
      const filename = `almona_${this.model}_${Date.now()}.${
        file.type.includes('csv') ? 'csv' : 'mdb'
      }`;

      // Ensure connected
      if (!this.networkProtocol.isConnectedToMachine()) {
        const connected = await this.networkProtocol.connect();
        if (!connected) {
          return {
            success: false,
            error: `Failed to connect to ${this.machineName}. Check network connection.`,
          };
        }
      }

      // Upload
      const success = await this.networkProtocol.uploadCuttingList(text, filename);

      if (success) {
        return {
          success: true,
          filename,
          bytesTransferred: text.length,
        };
      } else {
        return {
          success: false,
          error: `Upload to ${this.machineName} failed. Machine may be busy.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Transfer error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  /**
   * Extract CuttingPlan[] from a WindowUnit.
   *
   * If the unit has optimization data (from the Optimization tab),
   * we use that directly. Otherwise, we build a basic plan from
   * the unit's components.
   */
  private extractCuttingPlans(unit: WindowUnit): CuttingPlan[] {
    // Path A: Unit already has optimization results (preferred)
    if (unit.optimization?.cuttingPlan && unit.optimization.cuttingPlan.length > 0) {
      return unit.optimization.cuttingPlan;
    }

    // Path B: Build a basic cutting plan from components
    // This is the fallback when optimization hasn't been run yet.
    const cuts: Array<{ length: number; angle: number; componentId: string; waste: number }> =
      (unit.components || []).map((comp, i) => ({
        length: (comp as any).length || Math.max(unit.overallWidth, unit.overallHeight),
        angle: (comp as any).angle || 90,
        componentId: comp.type ? `${comp.type}-${i}` : `comp-${i}`,
        waste: 0,
      }));

    if (cuts.length === 0) {
      // Absolute fallback: create frame cuts from overall dimensions
      const w = unit.overallWidth;
      const h = unit.overallHeight;
      cuts.push(
        { length: w, angle: 45, componentId: 'frame-top', waste: 0 },
        { length: w, angle: 45, componentId: 'frame-bottom', waste: 0 },
        { length: h, angle: 45, componentId: 'frame-left', waste: 0 },
        { length: h, angle: 45, componentId: 'frame-right', waste: 0 },
      );
    }

    // Determine material type — default to 'aluminum'
    const materialRaw = (unit.type || 'aluminum').toLowerCase();
    const material: 'aluminum' | 'upvc' | 'wood' =
      materialRaw.includes('upvc') || materialRaw.includes('pvc')
        ? 'upvc'
        : materialRaw.includes('wood')
          ? 'wood'
          : 'aluminum';

    return [
      {
        profile: {
          id: unit.systemPackId || 'default',
          name: unit.systemPackId || 'Almona Profile',
          material,
          color: unit.color || 'RAL 9016',
          width: 60,
          height: 50,
          thickness: 2,
          costPerMeter: 0,
          cuttingAllowance: 0,
          stockQuantity: 0,
          minStockLevel: 0,
          supplier: 'Almona',
        },
        stockLength: 6000,
        cuts,
        totalWaste: 0,
        utilization: 0,
      },
    ];
  }

  /**
   * Get the underlying machine definition (for UI display).
   */
  getDefinition(): MachineDefinition {
    return this.definition;
  }

  /**
   * Get the Yilmaz model identifier.
   */
  getModel(): YilmazMachineModel {
    return this.model;
  }

  /**
   * Check if network connection is available.
   */
  isNetworkAvailable(): boolean {
    return this.networkProtocol !== null;
  }

  /**
   * Check if currently connected to the physical machine.
   */
  isConnected(): boolean {
    return this.networkProtocol?.isConnectedToMachine() ?? false;
  }
}

// ─── Factory ────────────────────────────────────────────────────────

/**
 * Create a driver for a specific Yilmaz machine.
 *
 * Usage:
 *   const driver = createYilmazDriver('ALM-6510');
 *   const result = driver.validate(windowUnit);
 *   const file = await driver.generateProductionFile(windowUnit);
 */
export function createYilmazDriver(
  model: YilmazMachineModel,
  networkConfig?: YilmazNetworkConfig
): YilmazMachineDriver {
  return new YilmazMachineDriver(model, networkConfig);
}

/**
 * Pre-configured drivers for the most common machines in Egyptian workshops.
 * These are offline-only (no network config) — call sendToMachine after connecting.
 */
export const DRIVERS = {
  ALM_6510: new YilmazMachineDriver('ALM-6510'),
  PIM_6509: new YilmazMachineDriver('PIM-6509'),
  AIM_3410: new YilmazMachineDriver('AIM-3410'),
} as const;
