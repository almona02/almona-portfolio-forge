/**
 * ALMONA COMMERCIAL ENGINE - LABOR PRECISION
 * 
 * Defines standardized labor operations with precise time-study defaults.
 * Replaces loose "guesswork" with "Engineering Estimates".
 */

export interface LaborOperation {
  id: string;
  name: string;
  category: 'cutting' | 'machining' | 'assembly' | 'glazing' | 'install';
  defaultTimeSeconds: number; // Precise seconds
  baseRatePerHour: number; // Standard rate for this specific skill
  description?: string;
}

export const LABOR_CATALOG: Record<string, LaborOperation> = {
  // CUTTING
  'OP_CUT_PROFILE': {
    id: 'OP_CUT_PROFILE',
    name: 'Profile Cross Cut',
    category: 'cutting',
    defaultTimeSeconds: 45, // includes positioning
    baseRatePerHour: 120
  },
  'OP_CUT_MITER': {
    id: 'OP_CUT_MITER',
    name: 'Miter Cut (45°)',
    category: 'cutting',
    defaultTimeSeconds: 60,
    baseRatePerHour: 125
  },

  // MACHINING
  'OP_PUNCH': {
    id: 'OP_PUNCH',
    name: 'Pneumatic Punch',
    category: 'machining',
    defaultTimeSeconds: 15,
    baseRatePerHour: 110
  },
  'OP_MILL_LOCK': {
    id: 'OP_MILL_LOCK',
    name: 'Mill Lock Keep',
    category: 'machining',
    defaultTimeSeconds: 180, // CNC or Copy Router
    baseRatePerHour: 150
  },
  'OP_DRILL_HANDLE': {
    id: 'OP_DRILL_HANDLE',
    name: 'Drill Handle Holes',
    category: 'machining',
    defaultTimeSeconds: 120,
    baseRatePerHour: 120
  },

  // ASSEMBLY
  'OP_CRIMP_CORNER': {
    id: 'OP_CRIMP_CORNER',
    name: 'Corner Crimping',
    category: 'assembly',
    defaultTimeSeconds: 90,
    baseRatePerHour: 140
  },
  'OP_INSTALL_GASKET': {
    id: 'OP_INSTALL_GASKET',
    name: 'Install EPDM Gasket',
    category: 'assembly',
    defaultTimeSeconds: 30, // per meter (logic handles this)
    baseRatePerHour: 100
  },
  'OP_ASSEMBLE_FRAME': {
    id: 'OP_ASSEMBLE_FRAME',
    name: 'Frame Assembly (Screw)',
    category: 'assembly',
    defaultTimeSeconds: 300,
    baseRatePerHour: 120
  },

  // GLAZING
  'OP_SET_CLASS': {
    id: 'OP_SET_CLASS',
    name: 'Set Glass Unit',
    category: 'glazing',
    defaultTimeSeconds: 300,
    baseRatePerHour: 130
  },
  'OP_SEAL_GLASS': {
    id: 'OP_SEAL_GLASS',
    name: 'Wet Seal Glazing',
    category: 'glazing',
    defaultTimeSeconds: 120, // per meter
    baseRatePerHour: 130
  }
};

/**
 * Calculates labor cost based on specific operations
 */
export function calculateOperationCost(opId: string, quantity: number = 1, scalingFactor: number = 1): number {
  const op = LABOR_CATALOG[opId];
  if (!op) return 0;
  
  // (Seconds * Qty * Scale) / 3600 = Total Hours
  // Total Hours * Rate = Cost
  const totalHours = (op.defaultTimeSeconds * quantity * scalingFactor) / 3600;
  return totalHours * op.baseRatePerHour;
}

/**
 * Gets operation time in minutes for scheduling
 */
export function getOperationTimeMinutes(opId: string, quantity: number = 1): number {
  const op = LABOR_CATALOG[opId];
  if (!op) return 0;
  return (op.defaultTimeSeconds * quantity) / 60;
}
