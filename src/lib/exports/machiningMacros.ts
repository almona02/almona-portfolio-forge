/**
 * Machining Macro Library
 * ---------------------------------------------------------------------------
 * Parametric macro programming templates for CNC operations
 * Compatible with FANUC, Siemens, and Yilmaz machine controllers
 * 
 * These macros use FANUC-style G-code with parameter substitution
 * for flexible, reusable machining operations.
 */

export interface MachiningMacroDefinition {
  id: string;
  name: string;
  operation: 'slot' | 'drill' | 'pocket' | 'counterbore' | 'contour';
  description: string;
  parameters: {
    [key: string]: {
      description: string;
      unit: string;
      default?: number;
    };
  };
  gcodeTemplate: string;
  macroProgram?: string; // Full macro program O####
}

/**
 * Generic Hinge Slot Macro
 * Creates a rectangular pocket for hinge installation
 */
export const GENERIC_HINGE_SLOT_MACRO: MachiningMacroDefinition = {
  id: 'generic_hinge_slot_a',
  name: 'Generic Hinge Slot Type A',
  operation: 'pocket',
  description: 'Creates a rectangular pocket for standard hinge installation',
  parameters: {
    width: { description: 'Slot width (mm)', unit: 'mm', default: 22 },
    height: { description: 'Slot height (mm)', unit: 'mm', default: 5 },
    depth: { description: 'Slot depth (negative Z)', unit: 'mm', default: -3 },
    x_pos: { description: 'Center X position', unit: 'mm', default: 15 },
    y_pos: { description: 'Center Y position', unit: 'mm', default: 8 },
    tool_id: { description: 'Tool ID number', unit: 'number', default: 10 },
  },
  gcodeTemplate: `
G65 P9010 A#1 B#2 C#3 X#4 Y#5 T#20
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
`,
  macroProgram: `
O9010 (GENERIC HINGE POCKET MACRO)
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
#101 = #24 - (#1 / 2) ; START X (CURRENT_X - HALF_WIDTH)
#102 = #24 + (#1 / 2) ; END X (CURRENT_X + HALF_WIDTH)
#103 = #25 - (#2 / 2) ; START Y (CURRENT_Y - HALF_HEIGHT)
#104 = #25 + (#2 / 2) ; END Y (CURRENT_Y + HALF_HEIGHT)
T#20 M6 ; TOOL CHANGE
G00 X#4 Y#5 ; RAPID TO POCKET CENTER
G00 Z5.0 ; RAPID TO SAFE Z
G01 Z#3 F150 ; FEED TO DEPTH
G01 X#101 F200 ; MOVE TO START X
G01 Y#103 ; MOVE TO START Y
G01 X#102 ; MOVE TO END X
G01 Y#104 ; MOVE TO END Y
G01 X#101 ; MOVE BACK TO START X
G00 Z5.0 ; RETRACT
M99 ; END OF MACRO
`,
};

/**
 * Multi-Point Lock Pocket Macro
 * Creates a larger pocket for multi-point locking systems
 */
export const MULTI_POINT_LOCK_POCKET_MACRO: MachiningMacroDefinition = {
  id: 'multi_point_lock_pocket',
  name: 'Multi-Point Lock Pocket',
  operation: 'pocket',
  description: 'Creates a pocket for multi-point locking system installation',
  parameters: {
    width: { description: 'Pocket width (mm)', unit: 'mm', default: 40 },
    height: { description: 'Pocket height (mm)', unit: 'mm', default: 10 },
    depth: { description: 'Pocket depth (negative Z)', unit: 'mm', default: -5 },
    x_pos: { description: 'Center X position', unit: 'mm', default: 35 },
    y_pos: { description: 'Center Y position', unit: 'mm', default: 15 },
    tool_id: { description: 'Tool ID number', unit: 'number', default: 10 },
  },
  gcodeTemplate: `
G65 P9011 A#1 B#2 C#3 X#4 Y#5 T#20
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
`,
  macroProgram: `
O9011 (MULTI-POINT LOCK POCKET MACRO)
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
#101 = #24 - (#1 / 2) ; START X
#102 = #24 + (#1 / 2) ; END X
#103 = #25 - (#2 / 2) ; START Y
#104 = #25 + (#2 / 2) ; END Y
T#20 M6 ; TOOL CHANGE
G00 X#4 Y#5 ; RAPID TO POCKET CENTER
G00 Z5.0 ; RAPID TO SAFE Z
G01 Z#3 F100 ; FEED TO DEPTH (SLOWER FOR LARGER POCKET)
G01 X#101 F150 ; MOVE TO START X
G01 Y#103 ; MOVE TO START Y
G01 X#102 ; MOVE TO END X
G01 Y#104 ; MOVE TO END Y
G01 X#101 ; MOVE BACK TO START X
G01 Y#103 ; CLOSE POCKET
G00 Z5.0 ; RETRACT
M99 ; END OF MACRO
`,
};

/**
 * Drainage Slot Macro
 * Creates a small slot for water drainage
 */
export const DRAINAGE_SLOT_MACRO: MachiningMacroDefinition = {
  id: 'drainage_slot',
  name: 'Drainage Slot',
  operation: 'slot',
  description: 'Creates a small slot for water drainage in sliding systems',
  parameters: {
    width: { description: 'Slot width (mm)', unit: 'mm', default: 8 },
    height: { description: 'Slot height (mm)', unit: 'mm', default: 3 },
    depth: { description: 'Slot depth (negative Z)', unit: 'mm', default: -2 },
    x_pos: { description: 'Center X position', unit: 'mm', default: 20 },
    y_pos: { description: 'Center Y position', unit: 'mm', default: 5 },
    tool_id: { description: 'Tool ID number', unit: 'number', default: 3 },
  },
  gcodeTemplate: `
G65 P9012 A#1 B#2 C#3 X#4 Y#5 T#20
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
`,
  macroProgram: `
O9012 (DRAINAGE SLOT MACRO)
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
#101 = #24 - (#1 / 2) ; START X
#102 = #24 + (#1 / 2) ; END X
#103 = #25 - (#2 / 2) ; START Y
#104 = #25 + (#2 / 2) ; END Y
T#20 M6 ; TOOL CHANGE
G00 X#4 Y#5 ; RAPID TO SLOT CENTER
G00 Z5.0 ; RAPID TO SAFE Z
G01 Z#3 F200 ; FEED TO DEPTH
G01 X#101 F250 ; MOVE TO START X
G01 Y#103 ; MOVE TO START Y
G01 X#102 ; MOVE TO END X
G01 Y#104 ; MOVE TO END Y
G00 Z5.0 ; RETRACT
M99 ; END OF MACRO
`,
};

/**
 * Anchor Slot Macro (for Curtain Walls)
 * Creates a slot for structural anchor installation
 */
export const ANCHOR_SLOT_MACRO: MachiningMacroDefinition = {
  id: 'anchor_slot',
  name: 'Structural Anchor Slot',
  operation: 'slot',
  description: 'Creates a slot for structural anchor installation in curtain wall systems',
  parameters: {
    width: { description: 'Slot width (mm)', unit: 'mm', default: 30 },
    height: { description: 'Slot height (mm)', unit: 'mm', default: 8 },
    depth: { description: 'Slot depth (negative Z)', unit: 'mm', default: -5 },
    x_pos: { description: 'Center X position', unit: 'mm', default: 20 },
    y_pos: { description: 'Center Y position', unit: 'mm', default: 10 },
    tool_id: { description: 'Tool ID number', unit: 'number', default: 8 },
  },
  gcodeTemplate: `
G65 P9013 A#1 B#2 C#3 X#4 Y#5 T#20
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
`,
  macroProgram: `
O9013 (ANCHOR SLOT MACRO)
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
#101 = #24 - (#1 / 2) ; START X
#102 = #24 + (#1 / 2) ; END X
#103 = #25 - (#2 / 2) ; START Y
#104 = #25 + (#2 / 2) ; END Y
T#20 M6 ; TOOL CHANGE
G00 X#4 Y#5 ; RAPID TO SLOT CENTER
G00 Z5.0 ; RAPID TO SAFE Z
G01 Z#3 F120 ; FEED TO DEPTH (SLOWER FOR STRUCTURAL)
G01 X#101 F180 ; MOVE TO START X
G01 Y#103 ; MOVE TO START Y
G01 X#102 ; MOVE TO END X
G01 Y#104 ; MOVE TO END Y
G01 X#101 ; MOVE BACK TO START X
G00 Z5.0 ; RETRACT
M99 ; END OF MACRO
`,
};

/**
 * Macro Library Registry
 * Maps macro IDs to their definitions for easy lookup
 */
export const MACHINING_MACRO_LIBRARY: Record<string, MachiningMacroDefinition> = {
  [GENERIC_HINGE_SLOT_MACRO.id]: GENERIC_HINGE_SLOT_MACRO,
  [MULTI_POINT_LOCK_POCKET_MACRO.id]: MULTI_POINT_LOCK_POCKET_MACRO,
  [DRAINAGE_SLOT_MACRO.id]: DRAINAGE_SLOT_MACRO,
  [ANCHOR_SLOT_MACRO.id]: ANCHOR_SLOT_MACRO,
};

/**
 * Get a machining macro by ID
 */
export function getMachiningMacro(id: string): MachiningMacroDefinition | undefined {
  return MACHINING_MACRO_LIBRARY[id];
}

/**
 * Generate G-code from a macro definition with parameters
 */
export function generateMacroGCode(
  macro: MachiningMacroDefinition,
  parameters: Record<string, number>
): string {
  let gcode = macro.gcodeTemplate;
  
  // Replace parameter placeholders with actual values
  Object.entries(parameters).forEach(([key, value]) => {
    const paramKey = `#${key}`;
    gcode = gcode.replace(new RegExp(paramKey, 'g'), value.toString());
  });
  
  return gcode;
}

