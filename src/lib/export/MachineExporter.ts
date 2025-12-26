/**
 * MachineExporter - CNC Export for Actual Machines
 * 
 * Generates G-code and drill coordinates for:
 * - Manual single machine
 * - Automatic double-head machine
 * - Full cutting center
 * 
 * CRITICAL: Export for YOUR specific machines to validate 99.8% accuracy
 * 
 * @since Phase 4: Machine Testing (Week 24)
 */

import { HardwarePlacementEngine } from '@/lib/3d/hardware/HardwarePlacementEngine';
import type { WindowUnit } from '@/types/fabricator';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { getPatternById } from '@/lib/fabricator/presetUtils';
import { SYSTEM_PACKS } from '@/data/systemPacks';

export type MachineType = 'manual_single' | 'automatic_double_head' | 'full_cnc_center';

export interface GCodeExport {
  gcode: string[];
  toolChanges: number;
  estimatedTime: number; // minutes
  materialWaste: number; // percentage
}

export interface DrillCoordinates {
  hardware: string;
  x: number; // mm
  y: number; // mm
  z: number; // mm
  diameter: number; // mm
  depth: number; // mm
  tool: string;
}

export interface MachineExport {
  windowId: string;
  machineType: MachineType;
  gcode: GCodeExport;
  drillPoints: DrillCoordinates[];
  materialList: Array<{
    profile: string;
    length: number; // mm
    quantity: number;
    cutSequence: number[];
  }>;
  assemblySequence: Array<{
    step: number;
    action: string;
    time: number; // minutes
  }>;
}

/**
 * MachineExporter - Exports for actual workshop machines
 */
export class MachineExporter {
  private hardwarePlacement: HardwarePlacementEngine;
  private bomGenerator: PresetAwareBOMGenerator;

  constructor() {
    this.hardwarePlacement = new HardwarePlacementEngine();
    this.bomGenerator = new PresetAwareBOMGenerator();
  }

  /**
   * Generate complete export for window unit
   */
  async generateExport(
    windowUnit: WindowUnit,
    machineType: MachineType
  ): Promise<MachineExport> {
    // Get pattern and system pack
    const pattern = getPatternById(windowUnit.presetId || '');
    const systemPack = SYSTEM_PACKS.find(p => p.meta.id === windowUnit.systemPackId);

    if (!pattern || !systemPack) {
      throw new Error('Pattern or system pack not found');
    }

    // Generate BOM
    const bom = await this.bomGenerator.generateCompleteBOM(
      windowUnit,
      pattern,
      systemPack
    );

    // Get hardware placement
    const placement = this.hardwarePlacement.calculatePlacement(
      windowUnit,
      windowUnit.type || 'casement'
    );

    // Get drill coordinates
    const drillPoints = this.hardwarePlacement.getCNCDrillingCoordinates(placement);

    // Generate G-code
    const gcode = this.generateGCode(windowUnit, bom, machineType);

    // Generate material list with cut sequence
    const materialList = this.generateMaterialList(bom, machineType);

    // Generate assembly sequence
    const assemblySequence = this.generateAssemblySequence(bom, placement);

    return {
      windowId: windowUnit.id,
      machineType,
      gcode,
      drillPoints,
      materialList,
      assemblySequence
    };
  }

  /**
   * Generate G-code for specific machine type
   */
  private generateGCode(
    windowUnit: WindowUnit,
    bom: any,
    machineType: MachineType
  ): GCodeExport {
    const gcode: string[] = [];
    let toolChanges = 0;
    let estimatedTime = 0;

    // G-code header
    gcode.push('; Almona Portfolio Forge - CNC Export');
    gcode.push(`; Window ID: ${windowUnit.id}`);
    gcode.push(`; Machine Type: ${machineType}`);
    gcode.push(`; Date: ${new Date().toISOString()}`);
    gcode.push('');
    gcode.push('G21 ; Set units to millimeters');
    gcode.push('G90 ; Absolute positioning');
    gcode.push('G94 ; Feed rate mode');
    gcode.push('');

    // Machine-specific setup
    switch (machineType) {
      case 'manual_single':
        gcode.push('; Manual Single Machine Setup');
        gcode.push('M06 T1 ; Tool change to cutting tool');
        toolChanges++;
        break;

      case 'automatic_double_head':
        gcode.push('; Automatic Double-Head Machine Setup');
        gcode.push('M06 T1 ; Tool change to head 1');
        gcode.push('M06 T2 ; Tool change to head 2');
        toolChanges += 2;
        break;

      case 'full_cnc_center':
        gcode.push('; Full CNC Cutting Center Setup');
        gcode.push('M06 T1 ; Tool change to cutting tool');
        gcode.push('M06 T2 ; Tool change to drilling tool');
        gcode.push('M06 T3 ; Tool change to milling tool');
        toolChanges += 3;
        break;
    }

    // Generate cutting operations from BOM profiles
    for (const profile of bom.profiles) {
      gcode.push(`; Profile: ${profile.role} - ${profile.length}mm`);
      gcode.push(`G00 X0 Y0 Z5 ; Rapid to start position`);
      gcode.push(`G01 Z-${profile.thickness || 1.5} F200 ; Cut to depth`);
      gcode.push(`G01 X${profile.length} F500 ; Cut length`);
      gcode.push('G00 Z5 ; Retract');
      estimatedTime += profile.length / 500; // Time based on feed rate
    }

    // Calculate material waste
    const totalMaterial = bom.profiles.reduce((sum: number, p: any) => sum + p.length, 0);
    const usedMaterial = bom.profiles.reduce((sum: number, p: any) => sum + p.length, 0);
    const waste = ((totalMaterial - usedMaterial) / totalMaterial) * 100;

    gcode.push('');
    gcode.push('M30 ; Program end');

    return {
      gcode,
      toolChanges,
      estimatedTime: Math.ceil(estimatedTime),
      materialWaste: waste
    };
  }

  /**
   * Generate material list with cut sequence
   */
  private generateMaterialList(
    bom: any,
    machineType: MachineType
  ): MachineExport['materialList'] {
    const materialList: MachineExport['materialList'] = [];

    for (const profile of bom.profiles) {
      materialList.push({
        profile: profile.role || 'unknown',
        length: profile.length || 0,
        quantity: profile.quantity || 1,
        cutSequence: this.optimizeCutSequence(profile, machineType)
      });
    }

    return materialList;
  }

  /**
   * Optimize cut sequence for machine type
   */
  private optimizeCutSequence(profile: any, machineType: MachineType): number[] {
    // Simple optimization: cut longest pieces first
    const cuts: number[] = [];
    const length = profile.length || 0;
    const quantity = profile.quantity || 1;

    // For double-head: parallel cuts
    if (machineType === 'automatic_double_head') {
      for (let i = 0; i < quantity; i++) {
        cuts.push(length);
      }
    } else {
      // Single machine: sequential cuts
      for (let i = 0; i < quantity; i++) {
        cuts.push(length);
      }
    }

    return cuts.sort((a, b) => b - a); // Longest first
  }

  /**
   * Generate assembly sequence
   */
  private generateAssemblySequence(
    bom: any,
    placement: any
  ): MachineExport['assemblySequence'] {
    const sequence: MachineExport['assemblySequence'] = [];

    // Step 1: Prepare profiles
    sequence.push({
      step: 1,
      action: 'Cut and prepare all profiles',
      time: 15
    });

    // Step 2: Assemble frame
    sequence.push({
      step: 2,
      action: 'Assemble main frame with mitered corners',
      time: 10
    });

    // Step 3: Install hardware
    sequence.push({
      step: 3,
      action: `Install hardware (${placement.totalCount} components)`,
      time: 5
    });

    // Step 4: Install glass
    sequence.push({
      step: 4,
      action: 'Install glazing unit',
      time: 5
    });

    // Step 5: Final assembly
    sequence.push({
      step: 5,
      action: 'Final assembly and quality check',
      time: 3
    });

    return sequence;
  }
}

