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
];

export function getMachineProfile(id?: string | null): MachineExportProfile | undefined {
  if (!id) return undefined;
  return MACHINE_PROFILES.find((p) => p.id === id);
}


