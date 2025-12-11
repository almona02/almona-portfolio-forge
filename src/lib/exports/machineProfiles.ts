import { MachineExportProfile } from './types';

/**
 * Registry of built-in machine export profiles.
 *
 * Includes generic profiles and vendor-specific profiles for:
 * - Elumatec (SBZ 151 series)
 * - FOMM (Ultra series)
 * - Emmegi (Quasar series)
 */
export const MACHINE_PROFILES: MachineExportProfile[] = [
  {
    id: 'generic_saw_csv_v1',
    label: 'Generic Saw – CSV v1',
    description:
      'Flat cutting list for 1D saws: one row per cut with basic fields (bar, seq, length, angle, profile, component).',
    target: 'saw',
    format: 'csv',
    csvLayout: {
      headers: [
        'BAR_INDEX',
        'CUT_INDEX',
        'PROFILE_NAME',
        'COMPONENT_ID',
        'COMPONENT_TYPE',
        'LENGTH_MM',
        'ANGLE_DEG',
        'WASTE_MM',
      ],
    },
  },
  {
    id: 'generic_saw_dxf_v1',
    label: 'Generic Saw – DXF v1',
    description:
      'DXF layout for generic saw import: separate layers for cutting geometry, annotations, QR and barcodes.',
    target: 'saw',
    format: 'dxf',
    dxfLayout: {
      cuttingLayer: 'CUTTING_PLAN',
      annotationLayer: 'ANNOTATIONS',
      qrLayer: 'QR_CODE',
      barcodeLayer: 'BARCODES',
    },
  },
  // Elumatec SBZ 151 Series
  {
    id: 'elumatec_sbz_151',
    label: 'Elumatec SBZ 151',
    description: 'Elumatec SBZ 151 5-axis machining center with tool changer support',
    target: 'machining_center',
    format: 'dxf',
    manufacturer: 'Elumatec',
    capabilities: ['cutting', 'drilling', 'milling'],
    configuration: {
      toolChanger: true,
      maxSpindleSpeed: 18000,
      axisCount: 5,
      postProcessor: 'elumatec_sbz_151_post',
    },
    dxfLayout: {
      cuttingLayer: 'ELUMATEC_CUTTING',
      annotationLayer: 'ELUMATEC_ANNOTATIONS',
      qrLayer: 'ELUMATEC_QR',
      barcodeLayer: 'ELUMATEC_BARCODE',
      drillingLayer: 'ELUMATEC_DRILLING',
      millingLayer: 'ELUMATEC_MILLING',
    },
    csvLayout: {
      headers: [
        'PROFILE_CODE',
        'LENGTH_MM',
        'ANGLE_DEG',
        'OPERATION',
        'TOOL_NUMBER',
        'X_POS',
        'Y_POS',
        'Z_POS',
        'SPINDLE_SPEED',
        'FEED_RATE',
      ],
    },
  },
  // FOMM Ultra Series
  {
    id: 'fomm_ultra',
    label: 'FOMM Ultra Series',
    description: 'FOMM Ultra series with copy router and pantograph support',
    target: 'cnc_router',
    format: 'dxf',
    manufacturer: 'FOMM',
    capabilities: ['cutting', 'copy_routing'],
    configuration: {
      copyRouter: true,
      pantograph: true,
      templateBased: true,
    },
    dxfLayout: {
      cuttingLayer: 'FOMM_CUTTING',
      annotationLayer: 'FOMM_ANNOTATIONS',
      templateLayer: 'FOMM_TEMPLATE',
      qrLayer: 'FOMM_QR',
    },
    csvLayout: {
      headers: [
        'PROFILE_CODE',
        'LENGTH_MM',
        'ANGLE_DEG',
        'TEMPLATE_REF',
        'PANTAGRAPH_SCALE',
        'ROUTER_DEPTH',
      ],
    },
  },
  // Emmegi Quasar
  {
    id: 'emmegi_quasar',
    label: 'Emmegi Quasar',
    description: 'Emmegi Quasar multi-head machining center',
    target: 'machining_center',
    format: 'dxf',
    manufacturer: 'Emmegi',
    capabilities: ['cutting', 'drilling', 'tapping'],
    configuration: {
      multiHead: true,
      automaticToolChange: false,
      workingArea: '3000x1300',
    },
    dxfLayout: {
      cuttingLayer: 'EMMEGI_CUTTING',
      annotationLayer: 'EMMEGI_ANNOTATIONS',
      drillingLayer: 'EMMEGI_DRILLING',
      tappingLayer: 'EMMEGI_TAPPING',
      qrLayer: 'EMMEGI_QR',
    },
    csvLayout: {
      headers: [
        'PROFILE_CODE',
        'LENGTH_MM',
        'ANGLE_DEG',
        'HEAD_NUMBER',
        'OPERATION',
        'X_POS',
        'Y_POS',
        'Z_POS',
        'TOOL_TYPE',
      ],
    },
  },
  // Yılmaz AIM 3410 - Based on extracted Technical File PDF
  {
    id: 'yilmaz_aim_3410',
    label: 'Yılmaz AIM 3410',
    description: 'AIM 3410 4-axis CNC aluminium profile machining center with ISO G-code, AIMCAM programming, and macro support. Complete G-code and programmable macros configuration.',
    target: 'machining_center',
    format: 'gcode',
    manufacturer: 'Yılmaz',
    capabilities: ['cutting', 'drilling', 'milling', 'saw_cutting', 'slotting', 'notching', 'macro_programming'],
    configuration: {
      cncAxes: 4,
      maxXTravel: 3200,
      maxYTravel: 300,
      maxZTravel: 260,
      aAxisRange: { min: -95, max: 95 },
      maxSpindleSpeed: 24000,
      maxPowerS1: 7.5,
      maxPowerS6: 9,
      toolHolder: 'HSK F63',
      toolMagazineCapacity: 8,
      feedRates: { x: 60, y: 50, z: 50, a: 72 },
      servoMotors: { x: 1, y: 1, z: 1, a: 0.75 },
      standardClamps: 4,
      maxClamps: 6,
      automaticClampPositioning: true,
      programmingLanguage: 'ISO G-code',
      programmingSoftware: 'AIMCAM',
      macroSupport: true,
      postProcessor: 'yilmaz_aim_3410_gcode',
    },
    csvLayout: {
      headers: [
        'OPERATION',
        'TOOL_NUMBER',
        'X_POS',
        'Y_POS',
        'Z_POS',
        'A_ANGLE',
        'FEED_RATE',
        'SPINDLE_SPEED',
        'MACRO_TYPE',
        'PARAMETERS',
      ],
    },
  },
  // Yılmaz ALM 6510 - Based on extracted MDB structure
  {
    id: 'yilmaz_alm_6510',
    label: 'Yılmaz ALM 6510',
    description: 'ALM 6510 Aluminium Profile Machining Center - 8-axis CNC with operation codes (P1-P7). Exact MDB table structure alignment.',
    target: 'machining_center',
    format: 'mdb',
    manufacturer: 'Yılmaz',
    capabilities: ['cutting', 'drilling', 'milling', 'slotting', 'barrel_holes', 'marking'],
    configuration: {
      cncAxes: 8,
      maxXTravel: 6500,
      maxYTravel: 1200,
      maxZTravel: 300,
      maxProfileLength: 6500,
      minProfileLength: 700,
      maxProfileHeight: 180,
      maxProfileWidth: 130,
      operationCodes: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
      tools: [10, 11, 20, 30, 31, 32, 40, 50, 51, 60, 70, 71],
      dimensionFormat: {
        lengthMultiplier: 10, // 1200.5 mm → 12005
        angleMultiplier: 10, // 45.4° → 454
      },
      postProcessor: 'yilmaz_alm_6510_mdb',
    },
    mdbLayout: {
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
        LEFT_ANGLE: 900,
        RIGHT_ANGLE: 900,
        CUTTED: 1,
        PAIR: 1,
        BAR_NO: 1,
        PICE_NO: 1,
        TYPE: 'A',
        COLOR_CODE: '1',
        FRAME_NO: 1,
        ROBOT_VERTICAL: 0,
      },
    },
    csvLayout: {
      headers: [
        'PROGRAM_NO',
        'CUSTOMER_CODE',
        'CUSTOMER_NAME',
        'STOCK_CODE',
        'STOCK_NAME',
        'ORDER_NO',
        'LENGTH',
        'LEFT_ANGLE',
        'RIGHT_ANGLE',
        'HEIGHT',
        'WIDTH',
        'CODE',
      ],
    },
  },
];

export function getMachineProfile(id?: string | null): MachineExportProfile | undefined {
  if (!id) return undefined;
  return MACHINE_PROFILES.find((p) => p.id === id);
}


