/**
 * ApexEngineV2 - Gold Tier Calculation Engine
 * 
 * Engineering-grade parametric system for fenestration design and fabrication.
 * Generates visual geometry and fabrication data based on FenestrationSystem schema.
 * 
 * Key Features:
 * - Material-specific calculations (Aluminum vs UPVC vs Steel)
 * - Region-specific physics (GCC thermal expansion, Turkish seismic)
 * - Manufacturing process rules (kerf, welding, miter)
 * - Hierarchical component system with parametric propagation
 * - Micron-level precision (all dimensions in microns)
 * 
 * @since Gold Tier Phase 1, Task 2.1
 * @see FenestrationSystem for input schema
 * @see GoldTierOrchestrator for routing
 */

import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import type { WindowUnit } from '@/types/fabricator';
import type { FenestrationSystem } from '@/types/fenestration';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';

/**
 * Manufacturing parameters calculated from system rules and window dimensions
 */
export interface ManufacturingParameters {
  /** Frame dimensions (microns) */
  frame: {
    width: number;
    height: number;
    cutLengths: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  /** Sash dimensions (microns) */
  sash: {
    width: number;
    height: number;
    cutLengths: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  /** Mullion dimensions (if applicable) */
  mullions?: Array<{
    position: number; // Position from left (microns)
    width: number;   // Mullion width (microns)
    height: number;  // Mullion height (microns)
    cutLength: number;
  }>;
  /** Transom dimensions (if applicable) */
  transoms?: Array<{
    position: number; // Position from bottom (microns)
    width: number;     // Transom width (microns)
    height: number;    // Transom height (microns)
    cutLength: number;
  }>;
  /** Glazing dimensions (microns) */
  glazing: {
    width: number;
    height: number;
    thickness: number;
  };
  /** Material-specific adjustments */
  materialAdjustments: {
    thermalExpansion?: number; // Thermal expansion compensation (microns)
    weldingShrinkage?: number; // UPVC welding shrinkage (microns)
    seismicAllowance?: number;  // Turkish seismic allowance (microns)
  };
}

/**
 * Hierarchical component structure
 */
export interface ComponentNode {
  id: string;
  type: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazingBead' | 'glazing';
  role: string;
  dimensions: {
    width: number;  // microns
    height: number; // microns
    length?: number; // microns (for linear components)
  };
  position: {
    x: number; // microns
    y: number; // microns
    z?: number; // microns (for 3D)
  };
  children: ComponentNode[];
  fabricationData: {
    cutLength: number;      // microns
    stockLength: number;     // microns
    waste: number;           // microns
    weight: number;          // kg
    cost: number;            // currency
    machiningOperations?: string[];
  };
}

/**
 * Visual geometry for rendering
 */
export interface FrameGeometry {
  frame: {
    outline: Array<{ x: number; y: number }>; // mm
    corners: Array<{ x: number; y: number; angle: number }>;
    mullions?: Array<{ x: number; y1: number; y2: number }>;
    transoms?: Array<{ y: number; x1: number; x2: number }>;
  };
  sashes: Array<{
    id: string;
    outline: Array<{ x: number; y: number }>; // mm
    position: { x: number; y: number };
    openingDirection?: 'left' | 'right' | 'up' | 'down';
  }>;
  glazing: Array<{
    id: string;
    outline: Array<{ x: number; y: number }>; // mm
    thickness: number; // mm
  }>;
}

/**
 * Fabrication data for manufacturing
 */
export interface FabricationData {
  /** Bill of Materials */
  bom: {
    profiles: Array<{
      profileCode: string;
      role: string;
      quantity: number;
      cutLength: number;      // microns
      totalLength: number;    // microns
      weight: number;         // kg
      cost: number;           // currency
    }>;
    hardware: Array<{
      hardwareId: string;
      category: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    glazing: Array<{
      type: string;
      width: number;  // mm
      height: number; // mm
      thickness: number; // mm
      area: number;   // m²
      cost: number;   // currency
    }>;
    gaskets: Array<{
      gasketId: string;
      length: number; // mm
      cost: number;   // currency
    }>;
  };
  /** Cutting list */
  cutList: Array<{
    profileCode: string;
    role: string;
    cutLength: number;      // microns
    quantity: number;
    angle?: number;         // degrees (for miter cuts)
    machining?: string[];   // Additional operations
  }>;
  /** Assembly instructions */
  assembly: {
    steps: Array<{
      step: number;
      description: string;
      components: string[];
      tools?: string[];
      torque?: number; // Nm
    }>;
  };
  /** Quality checks */
  qualityChecks: Array<{
    check: string;
    expected: number | string;
    tolerance?: number;
  }>;
}

/**
 * ApexEngineV2 - Core Calculation Engine
 */
export class ApexEngineV2 {
  private system: FenestrationSystem;
  private unit: WindowUnit;

  constructor(system: FenestrationSystem, unit: WindowUnit) {
    this.system = system;
    this.unit = unit;
  }

  /**
   * Generate complete assembly with visual geometry and fabrication data
   */
  public generateAssembly(): {
    visualGeometry: FrameGeometry;
    fabricationData: FabricationData;
    performance: {
      calculationTimeMs: number;
      cacheHit: boolean;
    };
  } {
    const startTime = performance.now();

    try {
      // 1. Calculate Manufacturing Parameters
      const params = this.calculateManufacturingParameters();

      // 2. Generate Hierarchical Components
      const assembly = this.generateHierarchicalComponents(params);

      // 3. Generate Outputs
      const visualGeometry = this.createVisualGeometry(assembly);
      const fabricationData = this.createFabricationData(assembly, params);

      const calculationTime = performance.now() - startTime;
      GoldTierPerformanceMonitor.record('apex_engine_v2_generate', calculationTime, undefined, true);

      // Audit log
      logFabricatorAudit({
        action: 'VALIDATE',
        tableName: 'fenestration_systems',
        recordId: this.system.id,
        status: 'success',
        operationDurationMs: calculationTime,
        operationType: 'apex_engine_v2_generate',
        newValues: {
          systemId: this.system.id,
          windowUnitId: this.unit.id,
          calculationTimeMs: calculationTime,
        },
      });

      return {
        visualGeometry,
        fabricationData,
        performance: {
          calculationTimeMs: calculationTime,
          cacheHit: false, // TODO: Implement caching
        },
      };
    } catch (error) {
      const calculationTime = performance.now() - startTime;
      GoldTierPerformanceMonitor.record('apex_engine_v2_generate', calculationTime, undefined, false, error instanceof Error ? error.message : String(error));

      // Audit log error
      logFabricatorAudit({
        action: 'VALIDATE',
        tableName: 'fenestration_systems',
        recordId: this.system.id,
        status: 'failed',
        operationDurationMs: calculationTime,
        operationType: 'apex_engine_v2_generate',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'APEX-001',
      });

      throw error;
    }
  }

  /**
   * Calculate manufacturing parameters from system rules and window dimensions
   * 
   * This is the core "physics engine" that applies:
   * - Material-specific calculations
   * - Region-specific physics
   * - Manufacturing process rules
   */
  private calculateManufacturingParameters(): ManufacturingParameters {
    const startTime = performance.now();

    const { fabricationRules, regionalPhysics } = this.system;
    const { overallWidth, overallHeight } = this.unit;

    // Convert mm to microns
    const widthMicrons = overallWidth * 1000;
    const heightMicrons = overallHeight * 1000;

    // Calculate frame dimensions (accounting for clearances)
    const frameWidth = widthMicrons;
    const frameHeight = heightMicrons;

    // Calculate frame cut lengths (accounting for miter allowance)
    const miterAllowance = fabricationRules.cutting.miterAllowance;
    const frameCutLengths = {
      top: frameWidth + miterAllowance,
      bottom: frameWidth + miterAllowance,
      left: frameHeight + miterAllowance,
      right: frameHeight + miterAllowance,
    };

    // Calculate sash dimensions (accounting for frame clearance)
    const frameClearance = fabricationRules.assembly.frameClearance;
    const sashWidth = frameWidth - (frameClearance * 2);
    const sashHeight = frameHeight - (frameClearance * 2);

    // Calculate sash cut lengths
    const sashCutLengths = {
      top: sashWidth + miterAllowance,
      bottom: sashWidth + miterAllowance,
      left: sashHeight + miterAllowance,
      right: sashHeight + miterAllowance,
    };

    // Material-specific adjustments
    const materialAdjustments: ManufacturingParameters['materialAdjustments'] = {};

    // Thermal expansion (GCC)
    if (regionalPhysics.thermalExpansionCoefficient) {
      const tempDelta = regionalPhysics.operatingTemperatureRange
        ? regionalPhysics.operatingTemperatureRange.max - 20 // 20°C reference
        : 25; // Default 25°C delta
      const expansion = (widthMicrons / 1000000) * regionalPhysics.thermalExpansionCoefficient * tempDelta;
      materialAdjustments.thermalExpansion = expansion;
    }

    // UPVC welding shrinkage
    if (fabricationRules.welding && this.system.material === 'upvc') {
      const burnOff = fabricationRules.welding.burnOff;
      const coolingFactor = fabricationRules.welding.coolingFactor;
      const shrinkage = (burnOff * 2) * (coolingFactor / 100); // Per corner
      materialAdjustments.weldingShrinkage = shrinkage;
    }

    // Turkish seismic allowance
    if (regionalPhysics.seismicRating && this.system.region === 'TUR') {
      // Seismic allowance based on rating (A = 0, B = 500μm, C = 1000μm)
      const seismicMap: Record<string, number> = {
        A: 0,
        B: 500,
        C: 1000,
      };
      materialAdjustments.seismicAllowance = seismicMap[regionalPhysics.seismicRating] || 0;
    }

    // Calculate glazing dimensions (accounting for glazing clearance)
    const glazingClearance = fabricationRules.assembly.glazingClearance;
    const glazingWidth = sashWidth - (glazingClearance * 2);
    const glazingHeight = sashHeight - (glazingClearance * 2);

    // Extract glazing thickness from unit (default 24mm for double glazing)
    const glazingThickness = this.unit.glazing?.thickness || 24;

    const params: ManufacturingParameters = {
      frame: {
        width: frameWidth,
        height: frameHeight,
        cutLengths: frameCutLengths,
      },
      sash: {
        width: sashWidth,
        height: sashHeight,
        cutLengths: sashCutLengths,
      },
      glazing: {
        width: glazingWidth,
        height: glazingHeight,
        thickness: glazingThickness * 1000, // Convert mm to microns
      },
      materialAdjustments,
    };

    // Add mullions if present in grid
    if (this.unit.grid) {
      params.mullions = this.calculateMullions(widthMicrons, heightMicrons);
      params.transoms = this.calculateTransoms(widthMicrons, heightMicrons);
    }

    const calculationTime = performance.now() - startTime;
    GoldTierPerformanceMonitor.record('calculate_manufacturing_params', calculationTime, undefined, true);

    return params;
  }

  /**
   * Calculate mullion positions and dimensions
   */
  private calculateMullions(widthMicrons: number, heightMicrons: number): ManufacturingParameters['mullions'] {
    if (!this.unit.grid || this.unit.grid.cols <= 1) {
      return undefined;
    }

    const mullions: ManufacturingParameters['mullions'] = [];
    const mullionWidth = this.system.profiles.mullion?.dimensions.width || 60; // Default 60mm
    const mullionWidthMicrons = mullionWidth * 1000;

    // Calculate equal spacing
    const totalMullionWidth = mullionWidthMicrons * (this.unit.grid.cols - 1);
    const availableWidth = widthMicrons - totalMullionWidth;
    const sashWidth = availableWidth / this.unit.grid.cols;

    // Position mullions
    for (let i = 0; i < this.unit.grid.cols - 1; i++) {
      const position = (i + 1) * sashWidth + (i * mullionWidthMicrons) + (mullionWidthMicrons / 2);
      mullions.push({
        position,
        width: mullionWidthMicrons,
        height: heightMicrons,
        cutLength: heightMicrons + this.system.fabricationRules.cutting.miterAllowance,
      });
    }

    return mullions;
  }

  /**
   * Calculate transom positions and dimensions
   */
  private calculateTransoms(widthMicrons: number, heightMicrons: number): ManufacturingParameters['transoms'] {
    if (!this.unit.grid || this.unit.grid.rows <= 1) {
      return undefined;
    }

    const transoms: ManufacturingParameters['transoms'] = [];
    const transomHeight = this.system.profiles.transom?.dimensions.width || 60; // Default 60mm
    const transomHeightMicrons = transomHeight * 1000;

    // Calculate equal spacing
    const totalTransomHeight = transomHeightMicrons * (this.unit.grid.rows - 1);
    const availableHeight = heightMicrons - totalTransomHeight;
    const sashHeight = availableHeight / this.unit.grid.rows;

    // Position transoms
    for (let i = 0; i < this.unit.grid.rows - 1; i++) {
      const position = (i + 1) * sashHeight + (i * transomHeightMicrons) + (transomHeightMicrons / 2);
      transoms.push({
        position,
        width: widthMicrons,
        height: transomHeightMicrons,
        cutLength: widthMicrons + this.system.fabricationRules.cutting.miterAllowance,
      });
    }

    return transoms;
  }

  /**
   * Generate hierarchical component tree
   */
  private generateHierarchicalComponents(params: ManufacturingParameters): ComponentNode {
    const rootFrame: ComponentNode = {
      id: 'frame-root',
      type: 'frame',
      role: 'frame',
      dimensions: {
        width: params.frame.width,
        height: params.frame.height,
      },
      position: { x: 0, y: 0, z: 0 },
      children: [],
      fabricationData: {
        cutLength: params.frame.cutLengths.top + params.frame.cutLengths.bottom + params.frame.cutLengths.left + params.frame.cutLengths.right,
        stockLength: this.system.profiles.frame.standardStockLength * 1000, // Convert to microns
        waste: 0, // Calculated later
        weight: 0, // Calculated later
        cost: 0, // Calculated later
      },
    };

    // Add sashes
    if (this.unit.grid) {
      this.unit.grid.cells.forEach((cell, index) => {
        if (cell.type !== 'fixed') {
          const sash: ComponentNode = {
            id: `sash-${index}`,
            type: 'sash',
            role: 'sash',
            dimensions: {
              width: params.sash.width,
              height: params.sash.height,
            },
            position: { x: 0, y: 0 }, // Position calculated from grid
            children: [],
            fabricationData: {
              cutLength: params.sash.cutLengths.top + params.sash.cutLengths.bottom + params.sash.cutLengths.left + params.sash.cutLengths.right,
              stockLength: this.system.profiles.sash.standardStockLength * 1000,
              waste: 0,
              weight: 0,
              cost: 0,
            },
          };

          // Add glazing as child
          const glazing: ComponentNode = {
            id: `glazing-${index}`,
            type: 'glazing',
            role: 'glazing',
            dimensions: {
              width: params.glazing.width,
              height: params.glazing.height,
              length: params.glazing.thickness,
            },
            position: { x: 0, y: 0 },
            children: [],
            fabricationData: {
              cutLength: 0, // Glazing is not cut
              stockLength: 0,
              waste: 0,
              weight: 0,
              cost: 0,
            },
          };

          sash.children.push(glazing);
          rootFrame.children.push(sash);
        }
      });
    }

    // Add mullions
    if (params.mullions) {
      params.mullions.forEach((mullion, index) => {
        const mullionNode: ComponentNode = {
          id: `mullion-${index}`,
          type: 'mullion',
          role: 'mullion',
          dimensions: {
            width: mullion.width,
            height: mullion.height,
            length: mullion.cutLength,
          },
          position: { x: mullion.position, y: 0 },
          children: [],
          fabricationData: {
            cutLength: mullion.cutLength,
            stockLength: this.system.profiles.mullion?.standardStockLength || 6000 * 1000,
            waste: 0,
            weight: 0,
            cost: 0,
          },
        };
        rootFrame.children.push(mullionNode);
      });
    }

    // Add transoms
    if (params.transoms) {
      params.transoms.forEach((transom, index) => {
        const transomNode: ComponentNode = {
          id: `transom-${index}`,
          type: 'transom',
          role: 'transom',
          dimensions: {
            width: transom.width,
            height: transom.height,
            length: transom.cutLength,
          },
          position: { x: 0, y: transom.position },
          children: [],
          fabricationData: {
            cutLength: transom.cutLength,
            stockLength: this.system.profiles.transom?.standardStockLength || 6000 * 1000,
            waste: 0,
            cost: 0,
            weight: 0,
          },
        };
        rootFrame.children.push(transomNode);
      });
    }

    return rootFrame;
  }

  /**
   * Create visual geometry for rendering
   */
  private createVisualGeometry(assembly: ComponentNode): FrameGeometry {
    // Convert microns to mm for rendering
    const toMm = (microns: number) => microns / 1000;

    const frameOutline = [
      { x: 0, y: 0 },
      { x: toMm(assembly.dimensions.width), y: 0 },
      { x: toMm(assembly.dimensions.width), y: toMm(assembly.dimensions.height) },
      { x: 0, y: toMm(assembly.dimensions.height) },
    ];

    const corners = [
      { x: 0, y: 0, angle: 90 },
      { x: toMm(assembly.dimensions.width), y: 0, angle: 90 },
      { x: toMm(assembly.dimensions.width), y: toMm(assembly.dimensions.height), angle: 90 },
      { x: 0, y: toMm(assembly.dimensions.height), angle: 90 },
    ];

    const sashes = assembly.children
      .filter(c => c.type === 'sash')
      .map(sash => ({
        id: sash.id,
        outline: [
          { x: toMm(sash.position.x), y: toMm(sash.position.y) },
          { x: toMm(sash.position.x + sash.dimensions.width), y: toMm(sash.position.y) },
          { x: toMm(sash.position.x + sash.dimensions.width), y: toMm(sash.position.y + sash.dimensions.height) },
          { x: toMm(sash.position.x), y: toMm(sash.position.y + sash.dimensions.height) },
        ],
        position: { x: toMm(sash.position.x), y: toMm(sash.position.y) },
        openingDirection: this.unit.grid?.cells.find(c => c.id === sash.id)?.openingDirection as 'left' | 'right' | 'up' | 'down' | undefined,
      }));

    const glazing = assembly.children
      .flatMap(c => c.type === 'sash' ? c.children : [])
      .filter(c => c.type === 'glazing')
      .map(glz => ({
        id: glz.id,
        outline: [
          { x: toMm(glz.position.x), y: toMm(glz.position.y) },
          { x: toMm(glz.position.x + glz.dimensions.width), y: toMm(glz.position.y) },
          { x: toMm(glz.position.x + glz.dimensions.width), y: toMm(glz.position.y + glz.dimensions.height) },
          { x: toMm(glz.position.x), y: toMm(glz.position.y + glz.dimensions.height) },
        ],
        thickness: toMm(glz.dimensions.length || 0),
      }));

    const mullions = assembly.children
      .filter(c => c.type === 'mullion')
      .map(m => ({
        x: toMm(m.position.x),
        y1: 0,
        y2: toMm(assembly.dimensions.height),
      }));

    const transoms = assembly.children
      .filter(c => c.type === 'transom')
      .map(t => ({
        y: toMm(t.position.y),
        x1: 0,
        x2: toMm(assembly.dimensions.width),
      }));

    return {
      frame: {
        outline: frameOutline,
        corners,
        mullions: mullions.length > 0 ? mullions : undefined,
        transoms: transoms.length > 0 ? transoms : undefined,
      },
      sashes,
      glazing,
    };
  }

  /**
   * Create fabrication data for manufacturing
   */
  private createFabricationData(assembly: ComponentNode, params: ManufacturingParameters): FabricationData {
    const bom = {
      profiles: [] as FabricationData['bom']['profiles'],
      hardware: [] as FabricationData['bom']['hardware'],
      glazing: [] as FabricationData['bom']['glazing'],
      gaskets: [] as FabricationData['bom']['gaskets'],
    };

    // Extract profile BOM
    const profileMap = new Map<string, { quantity: number; totalLength: number; weight: number; cost: number }>();

    const processNode = (node: ComponentNode) => {
      if (node.type !== 'glazing') {
        const profile = this.getProfileForRole(node.role);
        if (profile) {
          const existing = profileMap.get(profile.code) || { quantity: 0, totalLength: 0, weight: 0, cost: 0 };
          existing.quantity += 1;
          existing.totalLength += node.fabricationData.cutLength;
          existing.weight += (node.fabricationData.cutLength / 1000000) * profile.weightPerMeter; // Convert microns to meters
          existing.cost += (node.fabricationData.cutLength / 1000000) * profile.costPerMeter;
          profileMap.set(profile.code, existing);
        }
      }

      node.children.forEach(processNode);
    };

    processNode(assembly);

    bom.profiles = Array.from(profileMap.entries()).map(([code, data]) => ({
      profileCode: code,
      role: this.getRoleForProfile(code),
      quantity: data.quantity,
      cutLength: data.totalLength / data.quantity, // Average cut length
      totalLength: data.totalLength,
      weight: data.weight,
      cost: data.cost,
    }));

    // Extract hardware BOM
    const hardwareKit = this.system.hardwareKit;
    bom.hardware = [
      {
        hardwareId: hardwareKit.hinges.defaultId,
        category: 'hinge',
        quantity: hardwareKit.hinges.quantityCalculator(this.unit),
        unitCost: 0, // TODO: Get from hardware spec
        totalCost: 0,
      },
      {
        hardwareId: hardwareKit.lockingSystem.defaultId,
        category: 'lock',
        quantity: hardwareKit.lockingSystem.quantityCalculator(this.unit),
        unitCost: 0,
        totalCost: 0,
      },
      {
        hardwareId: hardwareKit.handle.defaultId,
        category: 'handle',
        quantity: hardwareKit.handle.quantityCalculator(this.unit),
        unitCost: 0,
        totalCost: 0,
      },
    ];

    // Extract glazing BOM
    const glazingArea = (params.glazing.width / 1000000) * (params.glazing.height / 1000000); // Convert to m²
    bom.glazing = [{
      type: this.unit.glazing?.type || 'double',
      width: params.glazing.width / 1000, // Convert to mm
      height: params.glazing.height / 1000,
      thickness: params.glazing.thickness / 1000,
      area: glazingArea,
      cost: 0, // TODO: Calculate from glazing type
    }];

    // Extract gaskets
    if (hardwareKit.gaskets.glazingGasket) {
      const gasketLength = (params.frame.width + params.frame.height) * 2 / 1000; // Perimeter in mm
      bom.gaskets.push({
        gasketId: hardwareKit.gaskets.glazingGasket.id,
        length: gasketLength,
        cost: gasketLength * hardwareKit.gaskets.glazingGasket.unitCost,
      });
    }

    // Generate cut list
    const cutList: FabricationData['cutList'] = [];
    const processNodeForCutList = (node: ComponentNode) => {
      if (node.type !== 'glazing' && node.fabricationData.cutLength > 0) {
        const profile = this.getProfileForRole(node.role);
        if (profile) {
          cutList.push({
            profileCode: profile.code,
            role: node.role,
            cutLength: node.fabricationData.cutLength,
            quantity: 1,
            angle: this.system.fabricationRules.connectionType === 'miter' ? 45 : 90,
            machining: node.fabricationData.machiningOperations,
          });
        }
      }
      node.children.forEach(processNodeForCutList);
    };
    processNodeForCutList(assembly);

    // Generate assembly instructions
    const assemblySteps: FabricationData['assembly']['steps'] = [
      {
        step: 1,
        description: 'Cut frame profiles to length',
        components: ['frame-top', 'frame-bottom', 'frame-left', 'frame-right'],
        tools: ['saw', 'miter_box'],
      },
      {
        step: 2,
        description: 'Assemble frame corners',
        components: ['frame'],
        tools: ['corner_key', 'screwdriver'],
        torque: 2.5, // Nm
      },
      {
        step: 3,
        description: 'Install hardware',
        components: ['hinges', 'lock', 'handle'],
        tools: ['drill', 'screwdriver'],
      },
      {
        step: 4,
        description: 'Install glazing',
        components: ['glazing', 'gaskets'],
        tools: ['glazing_tool'],
      },
    ];

    // Quality checks
    const qualityChecks: FabricationData['qualityChecks'] = [
      {
        check: 'Frame squareness',
        expected: 90,
        tolerance: 0.5, // degrees
      },
      {
        check: 'Glazing clearance',
        expected: this.system.fabricationRules.assembly.glazingClearance / 1000, // Convert to mm
        tolerance: 0.1, // mm
      },
    ];

    return {
      bom,
      cutList,
      assembly: {
        steps: assemblySteps,
      },
      qualityChecks,
    };
  }

  /**
   * Helper: Get profile for role
   */
  private getProfileForRole(role: string): FenestrationSystem['profiles'][keyof FenestrationSystem['profiles']] | undefined {
    const profiles = this.system.profiles;
    switch (role) {
      case 'frame': return profiles.frame;
      case 'sash': return profiles.sash;
      case 'mullion': return profiles.mullion;
      case 'transom': return profiles.transom;
      case 'glazingBead': return profiles.glazingBead;
      default: return undefined;
    }
  }

  /**
   * Helper: Get role for profile code
   */
  private getRoleForProfile(code: string): string {
    const profiles = this.system.profiles;
    if (profiles.frame.code === code) return 'frame';
    if (profiles.sash.code === code) return 'sash';
    if (profiles.mullion?.code === code) return 'mullion';
    if (profiles.transom?.code === code) return 'transom';
    if (profiles.glazingBead.code === code) return 'glazingBead';
    return 'unknown';
  }
}

