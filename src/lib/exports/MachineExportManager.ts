/**
 * MachineExportManager
 * ---------------------------------------------------------------------------
 * Manages machine-specific export generation for different CNC machines
 * (Elumatec, FOMM, Emmegi, etc.)
 */

import type { Profile, OptimizationResult } from '@/types/fabricator';
import { MACHINE_PROFILES, getMachineProfile } from './machineProfiles';
import { DXFExportGenerator } from './DXFExportGenerator';
import { CSVExportGenerator } from './CSVExportGenerator';
import type { DXFExportOptions } from './types';

export interface MachiningMacro {
  id: string;
  name: string;
  operation: 'slot' | 'drill' | 'mill' | 'tap' | 'cut';
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    diameter?: number;
  };
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  toolSpecs?: {
    diameter?: number;
    type?: string;
  };
}

export interface ExportResult {
  gcode?: string;
  dxf?: Blob;
  csv?: Blob;
  metadata: {
    machine: string;
    profile: string;
    timestamp: string;
    format: string;
    fileSize?: number;
  };
}

/**
 * Machine Export Manager
 * Handles machine-specific export generation
 */
export class MachineExportManager {
  private machineProfiles: Map<string, typeof MACHINE_PROFILES[0]> = new Map();

  constructor() {
    // Initialize machine profiles map
    MACHINE_PROFILES.forEach((profile) => {
      this.machineProfiles.set(profile.id, profile);
    });
  }

  /**
   * Generate machine-ready export for a profile with operations
   */
  async generateMachineReadyExport(
    profile: Profile,
    machineType: string,
    operations: MachiningMacro[],
    optimization?: OptimizationResult
  ): Promise<ExportResult> {
    const machineProfile = getMachineProfile(machineType);

    if (!machineProfile) {
      throw new Error(`Unsupported machine type: ${machineType}`);
    }

    switch (machineType) {
      case 'elumatec_sbz_151':
        return this.generateElumatecExport(profile, machineProfile, operations, optimization);
      case 'fomm_ultra':
        return this.generateFommExport(profile, machineProfile, operations, optimization);
      case 'emmegi_quasar':
        return this.generateEmmegiExport(profile, machineProfile, operations, optimization);
      default:
        // Fallback to generic export
        return this.generateGenericExport(profile, machineProfile, operations, optimization);
    }
  }

  /**
   * Generate Elumatec SBZ 151 export
   */
  private async generateElumatecExport(
    profile: Profile,
    machineProfile: typeof MACHINE_PROFILES[0],
    operations: MachiningMacro[],
    optimization?: OptimizationResult
  ): Promise<ExportResult> {
    const dxfGenerator = new DXFExportGenerator();
    const _csvGenerator = new CSVExportGenerator();

    // Generate DXF with Elumatec-specific layers
    const dxfOptions: DXFExportOptions = {
      machineProfileId: 'elumatec_sbz_151',
      layerName: machineProfile.dxfLayout?.cuttingLayer,
      units: 'mm',
      includeAnnotations: true,
      includeDimensions: true,
    };

    // Create a mock WindowUnit for DXF generation
    const mockProject = {
      id: 'export-project',
      orderNumber: 'EXPORT-001',
      type: 'window',
      overallWidth: profile.width || 1000,
      overallHeight: profile.height || 1000,
      components: [],
    } as any;

    const dxfBlob = await dxfGenerator.generate(mockProject, optimization || null, dxfOptions);

    // Generate G-code for machining operations
    const gcode = this.buildElumatecGCode(profile, operations, machineProfile);

    return {
      gcode,
      dxf: dxfBlob,
      metadata: {
        machine: machineProfile.label,
        profile: profile.name || profile.id || 'Unknown',
        timestamp: new Date().toISOString(),
        format: 'dxf+gcode',
        fileSize: dxfBlob.size,
      },
    };
  }

  /**
   * Generate FOMM Ultra export
   */
  private async generateFommExport(
    profile: Profile,
    machineProfile: typeof MACHINE_PROFILES[0],
    operations: MachiningMacro[],
    optimization?: OptimizationResult
  ): Promise<ExportResult> {
    const dxfGenerator = new DXFExportGenerator();

    const dxfOptions: DXFExportOptions = {
      machineProfileId: 'fomm_ultra',
      layerName: machineProfile.dxfLayout?.cuttingLayer,
      units: 'mm',
      includeAnnotations: true,
    };

    const mockProject = {
      id: 'export-project',
      orderNumber: 'EXPORT-001',
      type: 'window',
      overallWidth: profile.width || 1000,
      overallHeight: profile.height || 1000,
      components: [],
    } as any;

    const dxfBlob = await dxfGenerator.generate(mockProject, optimization || null, dxfOptions);

    return {
      dxf: dxfBlob,
      metadata: {
        machine: machineProfile.label,
        profile: profile.name || profile.id || 'Unknown',
        timestamp: new Date().toISOString(),
        format: 'dxf',
        fileSize: dxfBlob.size,
      },
    };
  }

  /**
   * Generate Emmegi Quasar export
   */
  private async generateEmmegiExport(
    profile: Profile,
    machineProfile: typeof MACHINE_PROFILES[0],
    operations: MachiningMacro[],
    optimization?: OptimizationResult
  ): Promise<ExportResult> {
    const dxfGenerator = new DXFExportGenerator();
    const _csvGenerator = new CSVExportGenerator();

    const dxfOptions: DXFExportOptions = {
      machineProfileId: 'emmegi_quasar',
      layerName: machineProfile.dxfLayout?.cuttingLayer,
      units: 'mm',
      includeAnnotations: true,
    };

    const mockProject = {
      id: 'export-project',
      orderNumber: 'EXPORT-001',
      type: 'window',
      overallWidth: profile.width || 1000,
      overallHeight: profile.height || 1000,
      components: [],
    } as any;

    const dxfBlob = await dxfGenerator.generate(mockProject, optimization || null, dxfOptions);

    // Generate Emmegi-specific NC code
    const ncCode = this.buildEmmegiNCCode(profile, operations, machineProfile);

    return {
      gcode: ncCode,
      dxf: dxfBlob,
      metadata: {
        machine: machineProfile.label,
        profile: profile.name || profile.id || 'Unknown',
        timestamp: new Date().toISOString(),
        format: 'dxf+nc',
        fileSize: dxfBlob.size,
      },
    };
  }

  /**
   * Generate generic export (fallback)
   */
  private async generateGenericExport(
    profile: Profile,
    machineProfile: typeof MACHINE_PROFILES[0],
    operations: MachiningMacro[],
    optimization?: OptimizationResult
  ): Promise<ExportResult> {
    const dxfGenerator = new DXFExportGenerator();

    const dxfOptions: DXFExportOptions = {
      machineProfileId: machineProfile.id,
      layerName: machineProfile.dxfLayout?.cuttingLayer,
      units: 'mm',
    };

    const mockProject = {
      id: 'export-project',
      orderNumber: 'EXPORT-001',
      type: 'window',
      overallWidth: profile.width || 1000,
      overallHeight: profile.height || 1000,
      components: [],
    } as any;

    const dxfBlob = await dxfGenerator.generate(mockProject, optimization || null, dxfOptions);

    return {
      dxf: dxfBlob,
      metadata: {
        machine: machineProfile.label,
        profile: profile.name || profile.id || 'Unknown',
        timestamp: new Date().toISOString(),
        format: 'dxf',
        fileSize: dxfBlob.size,
      },
    };
  }

  /**
   * Build Elumatec G-code
   */
  private buildElumatecGCode(
    profile: Profile,
    operations: MachiningMacro[],
    machineProfile: typeof MACHINE_PROFILES[0]
  ): string {
    const config = machineProfile.configuration || {};
    const _maxSpindleSpeed = config.maxSpindleSpeed || 18000;
    const toolChanger = config.toolChanger || false;

    let gcode = '; Elumatec SBZ 151 G-code\n';
    gcode += `; Profile: ${profile.name || profile.id}\n`;
    gcode += `; Generated: ${new Date().toISOString()}\n\n`;

    gcode += 'G21 ; Metric units\n';
    gcode += 'G90 ; Absolute positioning\n';
    gcode += 'G17 ; XY plane\n\n';

    operations.forEach((op, index) => {
      const toolNumber = index + 1;
      const position = op.position || { x: 0, y: 0, z: 0 };

      if (toolChanger && index > 0) {
        gcode += `T${toolNumber} M6 ; Tool change\n`;
      }

      switch (op.operation) {
        case 'drill':
          gcode += `G0 X${position.x} Y${position.y} ; Rapid to position\n`;
          gcode += `G0 Z${position.z || 0} ; Rapid to Z\n`;
          gcode += `G1 Z${(position.z || 0) - (op.dimensions?.depth || 5)} F200 ; Drill\n`;
          gcode += 'G0 Z5 ; Retract\n';
          break;
        case 'slot':
          gcode += `G0 X${position.x} Y${position.y} ; Rapid to position\n`;
          gcode += `G0 Z${position.z || 0} ; Rapid to Z\n`;
          const width = op.dimensions?.width || 0;
          const depth = op.dimensions?.depth || 0;
          gcode += `G1 Z${(position.z || 0) - depth} F200 ; Plunge\n`;
          gcode += `G1 X${position.x + width} F500 ; Cut slot\n`;
          gcode += 'G0 Z5 ; Retract\n';
          break;
        case 'mill':
          gcode += `G0 X${position.x} Y${position.y} ; Rapid to position\n`;
          gcode += `G0 Z${position.z || 0} ; Rapid to Z\n`;
          gcode += `G1 Z${(position.z || 0) - (op.dimensions?.depth || 2)} F200 ; Mill\n`;
          gcode += 'G0 Z5 ; Retract\n';
          break;
      }
      gcode += '\n';
    });

    gcode += 'M30 ; Program end\n';

    return gcode;
  }

  /**
   * Build Emmegi NC code
   */
  private buildEmmegiNCCode(
    profile: Profile,
    operations: MachiningMacro[],
    machineProfile: typeof MACHINE_PROFILES[0]
  ): string {
    const config = machineProfile.configuration || {};
    const multiHead = config.multiHead || false;

    let ncCode = '; Emmegi Quasar NC code\n';
    ncCode += `; Profile: ${profile.name || profile.id}\n`;
    ncCode += `; Generated: ${new Date().toISOString()}\n\n`;

    ncCode += 'G21 ; Metric\n';
    ncCode += 'G90 ; Absolute\n\n';

    operations.forEach((op, index) => {
      const headNumber = multiHead ? (index % 2) + 1 : 1;
      const position = op.position || { x: 0, y: 0, z: 0 };

      ncCode += `; Operation: ${op.name}\n`;
      ncCode += `H${headNumber} ; Select head\n`;
      ncCode += `G0 X${position.x} Y${position.y}\n`;

      switch (op.operation) {
        case 'drill':
          ncCode += `G81 X${position.x} Y${position.y} Z${(position.z || 0) - (op.dimensions?.depth || 5)} R2 F200\n`;
          break;
        case 'tap':
          ncCode += `G84 X${position.x} Y${position.y} Z${(position.z || 0) - (op.dimensions?.depth || 5)} R2 F100\n`;
          break;
        case 'cut':
          ncCode += `G1 X${position.x} Y${position.y} Z${position.z || 0} F500\n`;
          break;
      }
      ncCode += '\n';
    });

    ncCode += 'M30 ; End\n';

    return ncCode;
  }

  /**
   * Get available machine profiles
   */
  getAvailableMachines(): typeof MACHINE_PROFILES {
    return MACHINE_PROFILES;
  }

  /**
   * Get machine profile by ID
   */
  getMachineProfile(id: string): typeof MACHINE_PROFILES[0] | undefined {
    return getMachineProfile(id);
  }
}

// Export singleton instance
export const machineExportManager = new MachineExportManager();

