/**
 * AIM 3410 Machine Set Configuration
 * Based on extracted AIM 3410 Technical File PDF
 * 
 * This configuration ensures exact alignment with:
 * - AIM 3410 technical specifications
 * - ISO G-code programming language
 * - AIMCAM programming system
 * - Macro program support
 * - Optimization tab generator requirements
 */

/**
 * AIM 3410 Machine Specifications
 * Extracted from Technical File PDF
 */
export interface AIM3410Specs {
  // Working Capacity
  xAxis: number;        // 3200 mm
  yAxis: number;        // 300 mm (top + back side surface)
  zAxis: number;        // 260 mm
  aAxis: {
    min: number;        // -95°
    max: number;        // +95°
  };
  
  // Electro Spindle
  maxSpindleSpeed: number;  // 24,000 RPM
  maxPowerS1: number;       // 7.5 kW
  maxPowerS6: number;       // 9 kW
  toolHolder: string;      // HSK F63
  
  // Automatic Tool Magazine
  toolCapacity: number;    // 8 (7 cutters + 1 saw blade)
  magazineType: string;    // Mobile with bridge
  maxSawDiameter: number;  // 180 mm
  maxToolWeight: number;   // 3 kg
  
  // Feed Rates
  feedRates: {
    x: number;            // 60 m/min
    y: number;            // 50 m/min
    z: number;            // 50 m/min
    a: number;            // 72°/sec
  };
  
  // Servo Motors
  servoMotors: {
    x: number;            // 1 kW
    y: number;            // 1 kW
    z: number;            // 1 kW
    a: number;            // 0.75 kW
  };
  
  // Profile Clamping
  standardClamps: number;  // 4
  maxOptionalClamps: number; // 2 (total: 6)
  automaticClampPositioning: boolean; // true (via CAMPROX)
}

/**
 * ISO G-code Commands for AIM 3410
 * Standard ISO 'G' code programming language
 */
export enum AIM3410GCode {
  // Motion Commands
  G00 = 'G00', // Rapid positioning
  G01 = 'G01', // Linear interpolation
  G02 = 'G02', // Circular interpolation clockwise
  G03 = 'G03', // Circular interpolation counterclockwise
  G04 = 'G04', // Dwell
  
  // Coordinate System
  G17 = 'G17', // XY plane selection
  G18 = 'G18', // XZ plane selection
  G19 = 'G19', // YZ plane selection
  G20 = 'G20', // Inch units
  G21 = 'G21', // Metric units
  G28 = 'G28', // Return to reference point
  G53 = 'G53', // Machine coordinate system
  G54 = 'G54', // Work coordinate system 1
  G55 = 'G55', // Work coordinate system 2
  G56 = 'G56', // Work coordinate system 3
  G57 = 'G57', // Work coordinate system 4
  G58 = 'G58', // Work coordinate system 5
  G59 = 'G59', // Work coordinate system 6
  
  // Positioning Modes
  G90 = 'G90', // Absolute positioning
  G91 = 'G91', // Incremental positioning
  G92 = 'G92', // Set work coordinate system
  
  // Feed Rate Modes
  G93 = 'G93', // Inverse time feed rate
  G94 = 'G94', // Feed rate per minute
  G95 = 'G95', // Feed rate per revolution
  
  // Canned Cycles
  G80 = 'G80', // Cancel canned cycle
  G81 = 'G81', // Drilling cycle
  G82 = 'G82', // Drilling cycle with dwell
  G83 = 'G83', // Peck drilling cycle
  G84 = 'G84', // Tapping cycle
  G85 = 'G85', // Boring cycle
  G86 = 'G86', // Boring cycle with spindle stop
  G87 = 'G87', // Back boring cycle
  G88 = 'G88', // Boring cycle with dwell
  G89 = 'G89', // Boring cycle with feed retract
}

/**
 * M-codes for AIM 3410
 */
export enum AIM3410MCode {
  M00 = 'M00', // Program stop
  M01 = 'M01', // Optional stop
  M02 = 'M02', // Program end
  M03 = 'M03', // Spindle clockwise
  M04 = 'M04', // Spindle counterclockwise
  M05 = 'M05', // Spindle stop
  M06 = 'M06', // Tool change
  M07 = 'M07', // Coolant mist on
  M08 = 'M08', // Coolant flood on
  M09 = 'M09', // Coolant off
  M30 = 'M30', // Program end and rewind
  M98 = 'M98', // Subprogram call
  M99 = 'M99', // Subprogram end / return
}

/**
 * Macro Program Types
 * Based on AIMCAM programming capabilities
 */
export enum AIM3410MacroType {
  MILLING = 'milling',
  DRILLING = 'drilling',
  SAW_CUT = 'saw_cut',
  SLOT = 'slot',
  NOTCH = 'notch',
  CLAMP_POSITION = 'clamp_position',
  TOOL_CHANGE = 'tool_change',
  PROFILE_POSITION = 'profile_position',
}

/**
 * Macro Program Definition
 */
export interface AIM3410Macro {
  id: string;
  name: string;
  type: AIM3410MacroType;
  description: string;
  parameters: MacroParameter[];
  gCodeTemplate: string;
  requiresTool: boolean;
  requiresClamp: boolean;
}

/**
 * Macro Parameter
 */
export interface MacroParameter {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
  default?: any;
  min?: number;
  max?: number;
  description: string;
}

/**
 * Tool Table Entry
 * Used for storing tool parameters and offsets
 */
export interface AIM3410ToolTableEntry {
  toolNumber: number;      // 1-8 (7 cutters + 1 saw)
  toolName: string;
  toolType: 'cutter' | 'saw';
  diameter: number;        // mm
  length: number;          // mm
  offsetX: number;         // mm
  offsetY: number;         // mm
  offsetZ: number;         // mm
  spindleSpeed: number;    // RPM
  feedRate: number;        // mm/min
  maxDepth: number;        // mm
  material: 'aluminum' | 'pvc' | 'steel';
}

/**
 * CNC Setting Table
 * Machine parameters for maintenance
 */
export interface AIM3410CNCSettings {
  // Axial lengths
  xAxisLength: number;     // mm
  yAxisLength: number;    // mm
  zAxisLength: number;    // mm
  aAxisRange: { min: number; max: number }; // degrees
  
  // Origins
  xOrigin: number;        // mm
  yOrigin: number;        // mm
  zOrigin: number;        // mm
  aOrigin: number;        // degrees
  
  // Clamp configuration
  numberOfClamps: number; // 4-6
  clampPositions: number[]; // X positions in mm
  
  // Magazine configuration
  numberOfMagazines: number; // 1
  magazineCapacity: number;  // 8
  
  // Correction values
  xCorrection: number;    // mm
  yCorrection: number;   // mm
  zCorrection: number;   // mm
  aCorrection: number;   // degrees
}

/**
 * Default AIM 3410 Machine Configuration
 */
export const AIM3410_CONFIG: AIM3410Specs = {
  xAxis: 3200,
  yAxis: 300,
  zAxis: 260,
  aAxis: {
    min: -95,
    max: 95,
  },
  maxSpindleSpeed: 24000,
  maxPowerS1: 7.5,
  maxPowerS6: 9,
  toolHolder: 'HSK F63',
  toolCapacity: 8,
  magazineType: 'Mobile with bridge',
  maxSawDiameter: 180,
  maxToolWeight: 3,
  feedRates: {
    x: 60,      // m/min
    y: 50,      // m/min
    z: 50,      // m/min
    a: 72,      // °/sec
  },
  servoMotors: {
    x: 1,       // kW
    y: 1,       // kW
    z: 1,       // kW
    a: 0.75,    // kW
  },
  standardClamps: 4,
  maxOptionalClamps: 2,
  automaticClampPositioning: true,
};

/**
 * Standard Macro Programs for AIM 3410
 * Based on AIMCAM programming capabilities
 */
export const AIM3410_MACROS: AIM3410Macro[] = [
  {
    id: 'mill_slot',
    name: 'Mill Slot',
    type: AIM3410MacroType.SLOT,
    description: 'Mill a slot in the profile',
    parameters: [
      { name: 'x', type: 'number', unit: 'mm', description: 'X position' },
      { name: 'y', type: 'number', unit: 'mm', description: 'Y position' },
      { name: 'z', type: 'number', unit: 'mm', description: 'Z position' },
      { name: 'length', type: 'number', unit: 'mm', min: 0, description: 'Slot length' },
      { name: 'width', type: 'number', unit: 'mm', min: 0, description: 'Slot width' },
      { name: 'depth', type: 'number', unit: 'mm', min: 0, description: 'Slot depth' },
      { name: 'toolNumber', type: 'number', min: 1, max: 7, description: 'Tool number (1-7)' },
      { name: 'feedRate', type: 'number', unit: 'mm/min', default: 1000, description: 'Feed rate' },
    ],
    gCodeTemplate: `
G90 G21
G54
M06 T{toolNumber}
M03 S{spindleSpeed}
G00 X{x} Y{y} Z{z+5}
G01 Z{z-depth} F{feedRate}
G01 X{x+length} F{feedRate}
G00 Z{z+5}
M05
`,
    requiresTool: true,
    requiresClamp: true,
  },
  {
    id: 'drill_hole',
    name: 'Drill Hole',
    type: AIM3410MacroType.DRILLING,
    description: 'Drill a hole in the profile',
    parameters: [
      { name: 'x', type: 'number', unit: 'mm', description: 'X position' },
      { name: 'y', type: 'number', unit: 'mm', description: 'Y position' },
      { name: 'z', type: 'number', unit: 'mm', description: 'Z position' },
      { name: 'diameter', type: 'number', unit: 'mm', min: 0, description: 'Hole diameter' },
      { name: 'depth', type: 'number', unit: 'mm', min: 0, description: 'Hole depth' },
      { name: 'toolNumber', type: 'number', min: 1, max: 7, description: 'Tool number (1-7)' },
      { name: 'peckDepth', type: 'number', unit: 'mm', default: 5, description: 'Peck depth for deep holes' },
    ],
    gCodeTemplate: `
G90 G21
G54
M06 T{toolNumber}
M03 S{spindleSpeed}
G00 X{x} Y{y} Z{z+5}
G83 X{x} Y{y} Z{z-depth} R{z+2} Q{peckDepth} F{feedRate}
G80
G00 Z{z+5}
M05
`,
    requiresTool: true,
    requiresClamp: true,
  },
  {
    id: 'saw_cut',
    name: 'Saw Cut',
    type: AIM3410MacroType.SAW_CUT,
    description: 'Cut profile with saw blade (tool 8)',
    parameters: [
      { name: 'x', type: 'number', unit: 'mm', description: 'X position' },
      { name: 'y', type: 'number', unit: 'mm', description: 'Y position' },
      { name: 'z', type: 'number', unit: 'mm', description: 'Z position' },
      { name: 'angle', type: 'number', unit: 'degrees', min: -95, max: 95, description: 'Cut angle' },
      { name: 'length', type: 'number', unit: 'mm', min: 0, description: 'Cut length' },
    ],
    gCodeTemplate: `
G90 G21
G54
M06 T8
M03 S3000
G00 X{x} Y{y} Z{z+5}
G00 A{angle}
G01 Z{z} F500
G01 X{x+length} F2000
G00 Z{z+5}
G00 A0
M05
`,
    requiresTool: true,
    requiresClamp: true,
  },
  {
    id: 'clamp_position',
    name: 'Clamp Position',
    type: AIM3410MacroType.CLAMP_POSITION,
    description: 'Automatically position clamps (via CAMPROX)',
    parameters: [
      { name: 'clampNumber', type: 'number', min: 1, max: 6, description: 'Clamp number (1-6)' },
      { name: 'xPosition', type: 'number', unit: 'mm', description: 'X position for clamp' },
    ],
    gCodeTemplate: `
; Automatic clamp positioning via CAMPROX
; Clamp {clampNumber} to position X{xPosition}
`,
    requiresTool: false,
    requiresClamp: false,
  },
];

/**
 * Generate G-code from macro
 */
export function generateMacroGCode(
  macro: AIM3410Macro,
  parameters: Record<string, any>,
  toolTable: AIM3410ToolTableEntry[]
): string {
  let gCode = macro.gCodeTemplate;
  
  // Replace template variables
  for (const [key, value] of Object.entries(parameters)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    gCode = gCode.replace(regex, String(value));
  }
  
  // Get tool parameters if tool is required
  if (macro.requiresTool && parameters.toolNumber) {
    const tool = toolTable.find(t => t.toolNumber === parameters.toolNumber);
    if (tool) {
      gCode = gCode.replace(/{spindleSpeed}/g, String(tool.spindleSpeed));
      if (!parameters.feedRate) {
        gCode = gCode.replace(/{feedRate}/g, String(tool.feedRate));
      }
    }
  }
  
  return gCode.trim();
}

/**
 * Generate complete G-code program for AIM 3410
 */
export function generateAIM3410Program(
  operations: Array<{
    macro: AIM3410Macro;
    parameters: Record<string, any>;
  }>,
  toolTable: AIM3410ToolTableEntry[],
  _settings: Partial<AIM3410CNCSettings> = {}
): string {
  const lines: string[] = [];
  
  // Program header
  lines.push('; AIM 3410 G-code Program');
  lines.push('; Generated automatically');
  lines.push(`; Date: ${new Date().toISOString()}`);
  lines.push('');
  
  // Initialize
  lines.push('G21'); // Metric units
  lines.push('G90'); // Absolute positioning
  lines.push('G94'); // Feed rate per minute
  lines.push('G54'); // Work coordinate system
  lines.push('');
  
  // Tool table setup (if needed)
  if (toolTable.length > 0) {
    lines.push('; Tool Table');
    for (const tool of toolTable) {
      lines.push(`; T${tool.toolNumber}: ${tool.toolName} (D${tool.diameter}mm)`);
    }
    lines.push('');
  }
  
  // Generate operations
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    lines.push(`; Operation ${i + 1}: ${op.macro.name}`);
    const gCode = generateMacroGCode(op.macro, op.parameters, toolTable);
    lines.push(gCode);
    lines.push('');
  }
  
  // Program end
  lines.push('M30');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Parse G-code program
 */
export function parseAIM3410GCode(gCode: string): {
  commands: Array<{
    line: number;
    command: string;
    parameters: Record<string, number | string>;
  }>;
  errors: string[];
} {
  const commands: any[] = [];
  const errors: string[] = [];
  const lines = gCode.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith(';')) {
      continue;
    }
    
    // Parse G/M codes
    const match = line.match(/([GM]\d+)(.*)/);
    if (match) {
      const [, command] = match;
      const parameters: Record<string, number | string> = {};
      
      // Parse parameters (X, Y, Z, A, F, S, T, etc.)
      const paramMatches = line.matchAll(/([XYZAFSTPQRIJK])(-?\d+\.?\d*)/g);
      for (const paramMatch of paramMatches) {
        const [, param, value] = paramMatch;
        parameters[param] = parseFloat(value);
      }
      
      commands.push({
        line: i + 1,
        command,
        parameters,
      });
    }
  }
  
  return { commands, errors };
}

/**
 * Validate G-code for AIM 3410
 */
export function validateAIM3410GCode(
  gCode: string,
  config: AIM3410Specs = AIM3410_CONFIG
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseAIM3410GCode(gCode);
  
  for (const cmd of parsed.commands) {
    // Check X axis limits
    if (cmd.parameters.X !== undefined) {
      const x = cmd.parameters.X as number;
      if (x < 0 || x > config.xAxis) {
        errors.push(`Line ${cmd.line}: X position ${x} out of range (0-${config.xAxis}mm)`);
      }
    }
    
    // Check Y axis limits
    if (cmd.parameters.Y !== undefined) {
      const y = cmd.parameters.Y as number;
      if (y < 0 || y > config.yAxis) {
        errors.push(`Line ${cmd.line}: Y position ${y} out of range (0-${config.yAxis}mm)`);
      }
    }
    
    // Check Z axis limits
    if (cmd.parameters.Z !== undefined) {
      const z = cmd.parameters.Z as number;
      if (z < 0 || z > config.zAxis) {
        errors.push(`Line ${cmd.line}: Z position ${z} out of range (0-${config.zAxis}mm)`);
      }
    }
    
    // Check A axis limits
    if (cmd.parameters.A !== undefined) {
      const a = cmd.parameters.A as number;
      if (a < config.aAxis.min || a > config.aAxis.max) {
        errors.push(`Line ${cmd.line}: A angle ${a} out of range (${config.aAxis.min}°-${config.aAxis.max}°)`);
      }
    }
    
    // Check spindle speed
    if (cmd.parameters.S !== undefined) {
      const s = cmd.parameters.S as number;
      if (s > config.maxSpindleSpeed) {
        warnings.push(`Line ${cmd.line}: Spindle speed ${s} exceeds maximum ${config.maxSpindleSpeed} RPM`);
      }
    }
    
    // Check tool number
    if (cmd.parameters.T !== undefined) {
      const t = cmd.parameters.T as number;
      if (t < 1 || t > config.toolCapacity) {
        errors.push(`Line ${cmd.line}: Tool number ${t} out of range (1-${config.toolCapacity})`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

