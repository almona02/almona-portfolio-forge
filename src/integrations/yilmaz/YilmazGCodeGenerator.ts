/**
 * Yilmaz G-code Generator
 * Complete G-code generation for all Yilmaz CNC series (AIM, ALM, PIM)
 * Supports machine-specific dialects and optimizations
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';
import { GCodeCommand } from '@/integrations/cnc/CNCController';

export type YilmazMachineModel = 
  | 'AIM-3410' 
  | 'AIM-7510' 
  | 'ALM-6510' 
  | 'ALM-7510'
  | 'PIM-6509'
  | 'PIM-7510';

export interface YilmazMachineSpecs {
  model: YilmazMachineModel;
  maxLength: number; // mm
  maxWidth: number; // mm
  maxHeight: number; // mm
  maxCutLength: number; // mm
  minCutLength: number; // mm
  supportedAngles: number[]; // degrees
  axes: number; // 4, 5, or 8
  toolMagazine: boolean;
  toolMagazineCapacity?: number;
  precision: number; // mm
  maxSpindleSpeed: number; // rpm
  maxFeedRate: number; // mm/min
}

export interface GCodeGenerationOptions {
  machineModel: YilmazMachineModel;
  optimizeToolChanges: boolean;
  minimizeWaste: boolean;
  safetyZones: boolean;
  includeComments: boolean;
  coordinateSystem: 'absolute' | 'relative';
  units: 'mm' | 'inch';
}

export interface ToolPath {
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  feedRate: number;
  spindleSpeed: number;
  toolNumber: number;
  operation: 'cut' | 'drill' | 'mill' | 'tap' | 'engrave';
}

/**
 * Machine specifications for each Yilmaz model
 */
export const MACHINE_SPECS: Record<YilmazMachineModel, YilmazMachineSpecs> = {
  'AIM-3410': {
    model: 'AIM-3410',
    maxLength: 7000,
    maxWidth: 400,
    maxHeight: 200,
    maxCutLength: 7000,
    minCutLength: 50,
    supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, 105, 112.5, 120, 135, 150, 165, 180],
    axes: 4,
    toolMagazine: true,
    toolMagazineCapacity: 12,
    precision: 0.1,
    maxSpindleSpeed: 24000,
    maxFeedRate: 5000
  },
  'AIM-7510': {
    model: 'AIM-7510',
    maxLength: 7500,
    maxWidth: 500,
    maxHeight: 250,
    maxCutLength: 7500,
    minCutLength: 50,
    supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, 105, 112.5, 120, 135, 150, 165, 180],
    axes: 5,
    toolMagazine: true,
    toolMagazineCapacity: 16,
    precision: 0.05,
    maxSpindleSpeed: 24000,
    maxFeedRate: 6000
  },
  'ALM-6510': {
    model: 'ALM-6510',
    maxLength: 6500,
    maxWidth: 400,
    maxHeight: 200,
    maxCutLength: 6500,
    minCutLength: 50,
    supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, 105, 112.5, 120, 135, 150, 165, 180],
    axes: 8,
    toolMagazine: true,
    toolMagazineCapacity: 20,
    precision: 0.1,
    maxSpindleSpeed: 24000,
    maxFeedRate: 5000
  },
  'ALM-7510': {
    model: 'ALM-7510',
    maxLength: 7500,
    maxWidth: 500,
    maxHeight: 250,
    maxCutLength: 7500,
    minCutLength: 50,
    supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, 105, 112.5, 120, 135, 150, 165, 180],
    axes: 8,
    toolMagazine: true,
    toolMagazineCapacity: 24,
    precision: 0.05,
    maxSpindleSpeed: 24000,
    maxFeedRate: 6000
  },
  'PIM-6509': {
    model: 'PIM-6509',
    maxLength: 6500,
    maxWidth: 400,
    maxHeight: 200,
    maxCutLength: 6500,
    minCutLength: 700, // PIM has higher minimum
    supportedAngles: [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180],
    axes: 8,
    toolMagazine: true,
    toolMagazineCapacity: 10,
    precision: 0.1,
    maxSpindleSpeed: 20000,
    maxFeedRate: 4000
  },
  'PIM-7510': {
    model: 'PIM-7510',
    maxLength: 7500,
    maxWidth: 500,
    maxHeight: 250,
    maxCutLength: 7500,
    minCutLength: 700,
    supportedAngles: [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180],
    axes: 8,
    toolMagazine: true,
    toolMagazineCapacity: 12,
    precision: 0.1,
    maxSpindleSpeed: 20000,
    maxFeedRate: 4000
  }
};

export class YilmazGCodeGenerator {
  private specs: YilmazMachineSpecs;
  private options: GCodeGenerationOptions;
  private currentTool: number = 1;
  private lineNumber: number = 1;
  private currentPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  constructor(machineModel: YilmazMachineModel, options?: Partial<GCodeGenerationOptions>) {
    this.specs = MACHINE_SPECS[machineModel];
    this.options = {
      machineModel,
      optimizeToolChanges: options?.optimizeToolChanges ?? true,
      minimizeWaste: options?.minimizeWaste ?? true,
      safetyZones: options?.safetyZones ?? true,
      includeComments: options?.includeComments ?? true,
      coordinateSystem: options?.coordinateSystem ?? 'absolute',
      units: options?.units ?? 'mm'
    };
  }

  /**
   * Generate complete G-code program from cutting plans
   */
  generateGCode(cuttingPlans: CuttingPlan[]): GCodeCommand[] {
    const commands: GCodeCommand[] = [];
    this.lineNumber = 1;

    // Program header
    commands.push(...this.generateProgramHeader(cuttingPlans));

    // Safety initialization
    commands.push(...this.generateSafetyInit());

    // Home position
    commands.push(...this.generateHomePosition());

    // Process each cutting plan
    cuttingPlans.forEach((plan, planIndex) => {
      if (this.options.includeComments) {
        commands.push(this.createComment(`Processing plan ${planIndex + 1}: ${plan.profile.name}`));
      }

      // Tool path optimization
      const toolPaths = this.optimizeToolPaths(plan);
      
      // Generate G-code for each tool path
      toolPaths.forEach((toolPath, pathIndex) => {
        // Tool change if needed
        if (toolPath.toolNumber !== this.currentTool) {
          commands.push(...this.generateToolChange(toolPath.toolNumber));
          this.currentTool = toolPath.toolNumber;
        }

        // Generate operation commands
        commands.push(...this.generateOperationCommands(toolPath, plan.profile));
      });
    });

    // Program end
    commands.push(...this.generateProgramEnd());

    return commands;
  }

  /**
   * Generate program header with metadata
   */
  private generateProgramHeader(cuttingPlans: CuttingPlan[]): GCodeCommand[] {
    const commands: GCodeCommand[] = [];
    const timestamp = new Date().toISOString();
    const totalCuts = cuttingPlans.reduce((sum, plan) => sum + plan.cuts.length, 0);

    if (this.options.includeComments) {
      commands.push(this.createComment(`Yilmaz ${this.specs.model} G-code Program`));
      commands.push(this.createComment(`Generated: ${timestamp}`));
      commands.push(this.createComment(`Total plans: ${cuttingPlans.length}`));
      commands.push(this.createComment(`Total cuts: ${totalCuts}`));
    }

    // Set units
    commands.push({
      command: this.options.units === 'mm' ? 'G21' : 'G20',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    // Set coordinate system
    commands.push({
      command: this.options.coordinateSystem === 'absolute' ? 'G90' : 'G91',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    return commands;
  }

  /**
   * Generate safety initialization commands
   */
  private generateSafetyInit(): GCodeCommand[] {
    const commands: GCodeCommand[] = [];

    // Emergency stop reset
    commands.push({
      command: 'M30',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    // Spindle stop
    commands.push({
      command: 'M5',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    // Coolant off
    commands.push({
      command: 'M9',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    return commands;
  }

  /**
   * Generate home position command
   */
  private generateHomePosition(): GCodeCommand[] {
    const commands: GCodeCommand[] = [];

    if (this.options.includeComments) {
      commands.push(this.createComment('Move to home position'));
    }

    // Rapid move to home (safe Z first)
    commands.push({
      command: 'G0',
      parameters: { Z: 50 },
      lineNumber: this.lineNumber++
    });

    // Move to X=0, Y=0
    commands.push({
      command: 'G0',
      parameters: { X: 0, Y: 0 },
      lineNumber: this.lineNumber++
    });

    this.currentPosition = { x: 0, y: 0, z: 50 };

    return commands;
  }

  /**
   * Optimize tool paths for efficiency
   */
  private optimizeToolPaths(plan: CuttingPlan): ToolPath[] {
    const toolPaths: ToolPath[] = [];

    // Group cuts by angle and operation type
    const groupedCuts = this.groupCutsByOperation(plan.cuts);

    groupedCuts.forEach((group) => {
      group.cuts.forEach((cut) => {
        const toolPath = this.cutToToolPath(cut, plan.profile);
        toolPaths.push(toolPath);
      });
    });

    // Optimize tool changes if enabled
    if (this.options.optimizeToolChanges) {
      return this.optimizeToolChangeSequence(toolPaths);
    }

    return toolPaths;
  }

  /**
   * Group cuts by operation type for optimization
   */
  private groupCutsByOperation(cuts: Cut[]): Array<{ cuts: Cut[]; angle: number; operation: string }> {
    const groups = new Map<string, Cut[]>();

    cuts.forEach((cut) => {
      const operation = this.determineOperation(cut);
      const key = `${operation}_${cut.angle}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(cut);
    });

    return Array.from(groups.entries()).map(([key, cuts]) => {
      const [operation, angleStr] = key.split('_');
      return {
        cuts,
        angle: parseFloat(angleStr),
        operation
      };
    });
  }

  /**
   * Determine operation type from cut
   */
  private determineOperation(cut: Cut): string {
    if (cut.angle === 90) {
      return 'cut';
    } else if (cut.angle === 0 || cut.angle === 180) {
      return 'cut';
    } else {
      return 'mill'; // Angled cuts require milling
    }
  }

  /**
   * Convert cut to tool path
   */
  private cutToToolPath(cut: Cut, profile: Profile): ToolPath {
    const feedRate = this.calculateFeedRate(profile.material);
    const spindleSpeed = this.calculateSpindleSpeed(profile.material);
    const toolNumber = this.selectTool(cut, profile);

    // Calculate start and end points based on angle
    const { startPoint, endPoint } = this.calculateCutPoints(cut, profile);

    return {
      startPoint,
      endPoint,
      feedRate,
      spindleSpeed,
      toolNumber,
      operation: cut.angle === 90 ? 'cut' : 'mill'
    };
  }

  /**
   * Calculate cut start and end points
   */
  private calculateCutPoints(cut: Cut, profile: Profile): {
    startPoint: { x: number; y: number; z: number };
    endPoint: { x: number; y: number; z: number };
  } {
    const angleRad = (cut.angle * Math.PI) / 180;
    const length = cut.length;
    const profileWidth = profile.width || 50;
    const profileHeight = profile.height || 50;

    // Start at current position or origin
    const startX = this.currentPosition.x;
    const startY = this.currentPosition.y;
    const startZ = -profileHeight / 2; // Center on profile

    // Calculate end point based on angle
    const endX = startX + length * Math.cos(angleRad);
    const endY = startY + length * Math.sin(angleRad);
    const endZ = startZ;

    return {
      startPoint: { x: startX, y: startY, z: startZ },
      endPoint: { x: endX, y: endY, z: endZ }
    };
  }

  /**
   * Select appropriate tool for operation
   */
  private selectTool(cut: Cut, profile: Profile): number {
    // Tool selection logic based on operation and material
    if (cut.angle === 90) {
      return 1; // Standard cutting tool
    } else if (cut.angle !== 0 && cut.angle !== 90 && cut.angle !== 180) {
      return 2; // Milling tool for angles
    } else {
      return 1; // Default cutting tool
    }
  }

  /**
   * Optimize tool change sequence
   */
  private optimizeToolChangeSequence(toolPaths: ToolPath[]): ToolPath[] {
    // Group by tool number
    const toolGroups = new Map<number, ToolPath[]>();
    
    toolPaths.forEach((path) => {
      const tool = path.toolNumber;
      if (!toolGroups.has(tool)) {
        toolGroups.set(tool, []);
      }
      toolGroups.get(tool)!.push(path);
    });

    // Reorder: process all operations for tool 1, then tool 2, etc.
    const optimized: ToolPath[] = [];
    const sortedTools = Array.from(toolGroups.keys()).sort((a, b) => a - b);

    sortedTools.forEach((tool) => {
      optimized.push(...toolGroups.get(tool)!);
    });

    return optimized;
  }

  /**
   * Generate tool change commands
   */
  private generateToolChange(toolNumber: number): GCodeCommand[] {
    const commands: GCodeCommand[] = [];

    if (this.options.includeComments) {
      commands.push(this.createComment(`Tool change to T${toolNumber}`));
    }

    // Move to safe Z
    commands.push({
      command: 'G0',
      parameters: { Z: 50 },
      lineNumber: this.lineNumber++
    });

    // Tool change
    commands.push({
      command: 'M6',
      parameters: { T: toolNumber },
      lineNumber: this.lineNumber++
    });

    // Wait for tool change
    commands.push({
      command: 'M0',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    return commands;
  }

  /**
   * Generate operation commands for a tool path
   */
  private generateOperationCommands(toolPath: ToolPath, profile: Profile): GCodeCommand[] {
    const commands: GCodeCommand[] = [];

    if (this.options.includeComments) {
      commands.push(this.createComment(`${toolPath.operation.toUpperCase()} operation`));
    }

    // Rapid move to start position (safe Z first)
    commands.push({
      command: 'G0',
      parameters: { Z: 50 },
      lineNumber: this.lineNumber++
    });

    commands.push({
      command: 'G0',
      parameters: {
        X: toolPath.startPoint.x,
        Y: toolPath.startPoint.y
      },
      lineNumber: this.lineNumber++
    });

    // Move to cutting depth
    commands.push({
      command: 'G0',
      parameters: { Z: toolPath.startPoint.z },
      lineNumber: this.lineNumber++
    });

    // Start spindle
    commands.push({
      command: 'M3',
      parameters: { S: toolPath.spindleSpeed },
      lineNumber: this.lineNumber++
    });

    // Coolant on
    commands.push({
      command: 'M8',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    // Cutting move
    commands.push({
      command: 'G1',
      parameters: {
        X: toolPath.endPoint.x,
        Y: toolPath.endPoint.y,
        Z: toolPath.endPoint.z,
        F: toolPath.feedRate
      },
      lineNumber: this.lineNumber++
    });

    // Update current position
    this.currentPosition = toolPath.endPoint;

    // Retract to safe Z
    commands.push({
      command: 'G0',
      parameters: { Z: 50 },
      lineNumber: this.lineNumber++
    });

    // Stop spindle
    commands.push({
      command: 'M5',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    // Coolant off
    commands.push({
      command: 'M9',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    return commands;
  }

  /**
   * Generate program end commands
   */
  private generateProgramEnd(): GCodeCommand[] {
    const commands: GCodeCommand[] = [];

    if (this.options.includeComments) {
      commands.push(this.createComment('Program end'));
    }

    // Return to home
    commands.push({
      command: 'G0',
      parameters: { Z: 50 },
      lineNumber: this.lineNumber++
    });

    commands.push({
      command: 'G0',
      parameters: { X: 0, Y: 0 },
      lineNumber: this.lineNumber++
    });

    // Program end
    commands.push({
      command: 'M30',
      parameters: {},
      lineNumber: this.lineNumber++
    });

    return commands;
  }

  /**
   * Calculate feed rate based on material
   */
  private calculateFeedRate(material: string): number {
    const materialLower = material.toLowerCase();
    
    if (materialLower.includes('aluminum') || materialLower.includes('alüminyum')) {
      return Math.min(3000, this.specs.maxFeedRate);
    } else if (materialLower.includes('upvc') || materialLower.includes('pvc')) {
      return Math.min(4000, this.specs.maxFeedRate);
    } else if (materialLower.includes('wood') || materialLower.includes('ahşap')) {
      return Math.min(5000, this.specs.maxFeedRate);
    }
    
    return Math.min(3000, this.specs.maxFeedRate);
  }

  /**
   * Calculate spindle speed based on material
   */
  private calculateSpindleSpeed(material: string): number {
    const materialLower = material.toLowerCase();
    
    if (materialLower.includes('aluminum') || materialLower.includes('alüminyum')) {
      return Math.min(18000, this.specs.maxSpindleSpeed);
    } else if (materialLower.includes('upvc') || materialLower.includes('pvc')) {
      return Math.min(20000, this.specs.maxSpindleSpeed);
    } else if (materialLower.includes('wood') || materialLower.includes('ahşap')) {
      return Math.min(24000, this.specs.maxSpindleSpeed);
    }
    
    return Math.min(18000, this.specs.maxSpindleSpeed);
  }

  /**
   * Create comment command
   */
  private createComment(text: string): GCodeCommand {
    return {
      command: `(${text})`,
      parameters: {},
      lineNumber: this.lineNumber++
    };
  }

  /**
   * Convert G-code commands to string format
   */
  static commandsToString(commands: GCodeCommand[]): string {
    return commands.map((cmd) => {
      let line = `N${cmd.lineNumber} ${cmd.command}`;
      
      // Add parameters
      Object.entries(cmd.parameters).forEach(([key, value]) => {
        line += ` ${key.toUpperCase()}${value}`;
      });

      return line;
    }).join('\n');
  }

  /**
   * Get machine specifications
   */
  getMachineSpecs(): YilmazMachineSpecs {
    return { ...this.specs };
  }
}

