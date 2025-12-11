/**
 * ALM 6510 Machine Set Configuration
 * Based on extracted MDB table structure and ALM 6510 process documentation
 * 
 * This configuration ensures exact alignment with:
 * - MDB Table1 structure (37 columns)
 * - ALM 6510 operation codes (P1-P7)
 * - Optimization tab generator requirements
 */

export interface ALM6510MDBRecord {
  // Exact MDB table structure (37 columns)
  PROGRAM_NO: number;
  CUSTOMER_CODE: string;
  CUSTOMER_NAME: string;
  STOCK_CODE: string;
  STOCK_NAME: string;
  ORDER_NO: string;
  EXPLANATION1: string;
  EXPLANATION2: string;
  LENGTH: string; // mm as string (e.g., "10000")
  INCH_MM: number; // 0 = mm, 1 = inch
  FRAME_X: string; // mm as string
  FRAME_Y: string; // mm as string
  POSE_NO: number;
  TROLLEY: number;
  UNIT: number;
  LEFT_ANGLE: number; // 900 = 90° (format: angle * 10)
  RIGHT_ANGLE: number; // 900 = 90° (format: angle * 10)
  SIDE: number; // 1=left, 2=top, 3=right, 4=bottom
  CUTTED: number; // 0=not cut, 1=cut
  HEIGHT: number; // mm
  SELLER: string | null;
  IMAGE: string; // Image path (e.g., "IMAGE\\S4000064960.BMP")
  PAIR: number;
  BAR_NO: number;
  TOTAL_SIZE: string; // mm as string
  PICE_NO: number;
  GRUP: string | null;
  WIDTH: number; // mm
  TYPE: string; // "A" = Aluminum, "P" = PVC
  COLOR_CODE: string;
  STIL_LENGTH: string; // mm as string
  FRAME_NO: number;
  REMAINING_LENGTH: string | null;
  CODE: string | null; // Operation codes (P1-P7 format)
  ROBOT_Y: number; // mm
  ROBOT_Z: number; // mm
  ROBOT_VERTICAL: number; // 0 or 1
}

/**
 * Operation Code Types (P1-P7)
 * Based on ALM 6510 Process Documentation
 */
export enum ALM6510OperationType {
  P1 = 'P1', // Slot for lock
  P2 = 'P2', // Espagnolette slot with radius
  P3 = 'P3', // Water drain slot
  P4 = 'P4', // Left barrel hole
  P5 = 'P5', // Right barrel hole
  P6 = 'P6', // Drill hole
  P7 = 'P7', // Marking and drilling
}

/**
 * Tool Numbers (T10-T71)
 * Based on ALM 6510 Process Documentation
 */
export enum ALM6510ToolNumber {
  T10 = 10,
  T11 = 11,
  T20 = 20,
  T30 = 30,
  T31 = 31,
  T32 = 32,
  T40 = 40,
  T50 = 50,
  T51 = 51,
  T60 = 60,
  T70 = 70,
  T71 = 71,
}

/**
 * Operation Code Parser
 * Parses ALM 6510 operation codes from CODE field
 */
export interface ParsedOperation {
  type: ALM6510OperationType;
  tool: ALM6510ToolNumber;
  x: number; // X coordinate (mm)
  y: number; // Y coordinate (mm)
  z: number; // Z coordinate (mm)
  l?: number; // Length (mm) - for P1, P2, P3, P4, P5
  w?: number; // Width (mm) - for P1, P2, P4, P5
  d: number; // Depth (mm)
  r?: number; // Radius (mm) - for P2, P4, P5
  c?: number; // Diameter (mm) - for P4, P5, P6
}

/**
 * Parse operation code string
 * Format: P1T50X12000 Y300Z600L1760 W175D200//
 */
export function parseOperationCode(code: string): ParsedOperation[] {
  const operations: ParsedOperation[] = [];
  
  // Split by // separator
  const codeBlocks = code.split('//').filter(block => block.trim());
  
  for (const block of codeBlocks) {
    const match = block.match(/P(\d+)T(\d+)(.*)/);
    if (!match) continue;
    
    const [, pType, toolNum, params] = match;
    const operation: ParsedOperation = {
      type: `P${pType}` as ALM6510OperationType,
      tool: parseInt(toolNum, 10) as ALM6510ToolNumber,
      x: 0,
      y: 0,
      z: 0,
      d: 0,
    };
    
    // Parse parameters: X, Y, Z, L, W, D, R, C
    const paramMatches = params.matchAll(/([XYZWDLRC])(\d+)/g);
    for (const paramMatch of paramMatches) {
      const [, param, value] = paramMatch;
      const numValue = parseInt(value, 10);
      
      switch (param) {
        case 'X':
          operation.x = numValue;
          break;
        case 'Y':
          operation.y = numValue;
          break;
        case 'Z':
          operation.z = numValue;
          break;
        case 'L':
          operation.l = numValue;
          break;
        case 'W':
          operation.w = numValue;
          break;
        case 'D':
          operation.d = numValue;
          break;
        case 'R':
          operation.r = numValue;
          break;
        case 'C':
          operation.c = numValue;
          break;
      }
    }
    
    operations.push(operation);
  }
  
  return operations;
}

/**
 * ALM 6510 Machine Configuration
 * Aligned with optimization tab generator
 */
export interface ALM6510MachineConfig {
  machineId: 'alm-6510';
  name: string;
  model: string;
  brand: 'yilmaz';
  
  // Machine specifications
  maxXTravel: number; // 6500 mm
  maxYTravel: number; // 1200 mm
  maxZTravel: number; // 300 mm
  maxProfileLength: number; // 6500 mm
  minProfileLength: number; // 700 mm
  maxProfileHeight: number; // 180 mm
  maxProfileWidth: number; // 130 mm
  minProfileHeight: number; // 40 mm
  minProfileWidth: number; // 40 mm
  
  // Operation capabilities
  operations: {
    lockSlot: boolean; // P1
    espagnoletteSlot: boolean; // P2
    waterDrain: boolean; // P3
    leftBarrel: boolean; // P4
    rightBarrel: boolean; // P5
    drill: boolean; // P6
    marking: boolean; // P7
  };
  
  // Tool configuration
  tools: {
    [key in ALM6510ToolNumber]?: {
      name: string;
      diameter: number; // mm
      maxDepth: number; // mm
      operations: ALM6510OperationType[];
    };
  };
  
  // Dimensioning format
  dimensionFormat: {
    lengthMultiplier: number; // 10 (1200.5 mm → 12005)
    angleMultiplier: number; // 10 (45.4° → 454)
  };
  
  // MDB export configuration
  mdbExport: {
    tableName: string;
    columns: (keyof ALM6510MDBRecord)[];
    defaultValues: Partial<ALM6510MDBRecord>;
  };
}

/**
 * Default ALM 6510 Machine Configuration
 */
export const ALM6510_CONFIG: ALM6510MachineConfig = {
  machineId: 'alm-6510',
  name: 'ALM 6510',
  model: 'ALM 6510',
  brand: 'yilmaz',
  
  maxXTravel: 6500,
  maxYTravel: 1200,
  maxZTravel: 300,
  maxProfileLength: 6500,
  minProfileLength: 700,
  maxProfileHeight: 180,
  maxProfileWidth: 130,
  minProfileHeight: 40,
  minProfileWidth: 40,
  
  operations: {
    lockSlot: true,
    espagnoletteSlot: true,
    waterDrain: true,
    leftBarrel: true,
    rightBarrel: true,
    drill: true,
    marking: true,
  },
  
  tools: {
    [ALM6510ToolNumber.T10]: {
      name: 'Marking Tool 10',
      diameter: 5,
      maxDepth: 50,
      operations: [ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T11]: {
      name: 'Marking Tool 11',
      diameter: 5,
      maxDepth: 50,
      operations: [ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T20]: {
      name: 'Water Drain Tool 20',
      diameter: 8,
      maxDepth: 200,
      operations: [ALM6510OperationType.P3, ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T30]: {
      name: 'Barrel/Drill Tool 30',
      diameter: 8,
      maxDepth: 250,
      operations: [ALM6510OperationType.P4, ALM6510OperationType.P5, ALM6510OperationType.P6, ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T31]: {
      name: 'Barrel/Drill Tool 31',
      diameter: 8,
      maxDepth: 250,
      operations: [ALM6510OperationType.P5, ALM6510OperationType.P6, ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T32]: {
      name: 'Barrel Tool 32',
      diameter: 8,
      maxDepth: 70,
      operations: [ALM6510OperationType.P4, ALM6510OperationType.P5],
    },
    [ALM6510ToolNumber.T40]: {
      name: 'Marking Tool 40',
      diameter: 5,
      maxDepth: 50,
      operations: [ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T50]: {
      name: 'Lock/Espagnolette Tool 50',
      diameter: 8,
      maxDepth: 200,
      operations: [ALM6510OperationType.P1, ALM6510OperationType.P2, ALM6510OperationType.P3, ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T51]: {
      name: 'Espagnolette Tool 51',
      diameter: 8,
      maxDepth: 200,
      operations: [ALM6510OperationType.P2],
    },
    [ALM6510ToolNumber.T60]: {
      name: 'Barrel/Drill Tool 60',
      diameter: 8,
      maxDepth: 200,
      operations: [ALM6510OperationType.P3, ALM6510OperationType.P4, ALM6510OperationType.P5, ALM6510OperationType.P6, ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T70]: {
      name: 'Water Drain Tool 70',
      diameter: 8,
      maxDepth: 200,
      operations: [ALM6510OperationType.P3, ALM6510OperationType.P5, ALM6510OperationType.P7],
    },
    [ALM6510ToolNumber.T71]: {
      name: 'Barrel Tool 71',
      diameter: 8,
      maxDepth: 200,
      operations: [ALM6510OperationType.P5, ALM6510OperationType.P7],
    },
  },
  
  dimensionFormat: {
    lengthMultiplier: 10, // 1200.5 mm → 12005
    angleMultiplier: 10, // 45.4° → 454
  },
  
  mdbExport: {
    tableName: 'Table1',
    columns: [
      'PROGRAM_NO',
      'CUSTOMER_CODE',
      'CUSTOMER_NAME',
      'STOCK_CODE',
      'STOCK_NAME',
      'ORDER_NO',
      'EXPLANATION1',
      'EXPLANATION2',
      'LENGTH',
      'INCH_MM',
      'FRAME_X',
      'FRAME_Y',
      'POSE_NO',
      'TROLLEY',
      'UNIT',
      'LEFT_ANGLE',
      'RIGHT_ANGLE',
      'SIDE',
      'CUTTED',
      'HEIGHT',
      'SELLER',
      'IMAGE',
      'PAIR',
      'BAR_NO',
      'TOTAL_SIZE',
      'PICE_NO',
      'GRUP',
      'WIDTH',
      'TYPE',
      'COLOR_CODE',
      'STIL_LENGTH',
      'FRAME_NO',
      'REMAINING_LENGTH',
      'CODE',
      'ROBOT_Y',
      'ROBOT_Z',
      'ROBOT_VERTICAL',
    ],
    defaultValues: {
      INCH_MM: 0,
      POSE_NO: 1,
      TROLLEY: 1,
      UNIT: 1,
      LEFT_ANGLE: 900, // 90°
      RIGHT_ANGLE: 900, // 90°
      CUTTED: 1,
      PAIR: 1,
      BAR_NO: 1,
      PICE_NO: 1,
      TYPE: 'A', // Aluminum
      COLOR_CODE: '1',
      FRAME_NO: 1,
      ROBOT_VERTICAL: 0,
    },
  },
};

/**
 * Convert cutting plan to ALM 6510 MDB record format
 */
export function convertToALM6510MDB(
  cuttingPlan: any,
  config: Partial<ALM6510MDBRecord> = {}
): ALM6510MDBRecord {
  const length = cuttingPlan.length || 0;
  const angle = cuttingPlan.angle || 90;
  
  return {
    PROGRAM_NO: config.PROGRAM_NO || 1,
    CUSTOMER_CODE: config.CUSTOMER_CODE || '',
    CUSTOMER_NAME: config.CUSTOMER_NAME || '',
    STOCK_CODE: config.STOCK_CODE || '',
    STOCK_NAME: config.STOCK_NAME || '',
    ORDER_NO: config.ORDER_NO || '',
    EXPLANATION1: config.EXPLANATION1 || '',
    EXPLANATION2: config.EXPLANATION2 || '',
    LENGTH: String(Math.round(length * ALM6510_CONFIG.dimensionFormat.lengthMultiplier)),
    INCH_MM: 0,
    FRAME_X: config.FRAME_X || '5000',
    FRAME_Y: config.FRAME_Y || '5000',
    POSE_NO: config.POSE_NO || 1,
    TROLLEY: config.TROLLEY || 1,
    UNIT: config.UNIT || 1,
    LEFT_ANGLE: Math.round(angle * ALM6510_CONFIG.dimensionFormat.angleMultiplier),
    RIGHT_ANGLE: Math.round(angle * ALM6510_CONFIG.dimensionFormat.angleMultiplier),
    SIDE: config.SIDE || 4,
    CUTTED: 1,
    HEIGHT: config.HEIGHT || 0,
    SELLER: config.SELLER || null,
    IMAGE: config.IMAGE || '',
    PAIR: config.PAIR || 1,
    BAR_NO: config.BAR_NO || 1,
    TOTAL_SIZE: config.TOTAL_SIZE || String(Math.round(length * ALM6510_CONFIG.dimensionFormat.lengthMultiplier)),
    PICE_NO: config.PICE_NO || 1,
    GRUP: config.GRUP || null,
    WIDTH: config.WIDTH || 0,
    TYPE: config.TYPE || 'A',
    COLOR_CODE: config.COLOR_CODE || '1',
    STIL_LENGTH: config.STIL_LENGTH || String(Math.round(length * ALM6510_CONFIG.dimensionFormat.lengthMultiplier)),
    FRAME_NO: config.FRAME_NO || 1,
    REMAINING_LENGTH: config.REMAINING_LENGTH || null,
    CODE: config.CODE || null,
    ROBOT_Y: config.ROBOT_Y || 0,
    ROBOT_Z: config.ROBOT_Z || 0,
    ROBOT_VERTICAL: config.ROBOT_VERTICAL || 0,
  };
}

/**
 * Generate operation code from operations
 */
export function generateOperationCode(operations: ParsedOperation[]): string {
  return operations
    .map(op => {
      let code = `${op.type}T${op.tool}X${op.x}Y${op.y}Z${op.z}`;
      if (op.l !== undefined) code += `L${op.l}`;
      if (op.w !== undefined) code += `W${op.w}`;
      if (op.d !== undefined) code += `D${op.d}`;
      if (op.r !== undefined) code += `R${op.r}`;
      if (op.c !== undefined) code += `C${op.c}`;
      return code + '//';
    })
    .join('');
}

