import { MachineExportProfile } from './types';

/**
 * Registry of built-in machine export profiles.
 *
 * Phase 1: keep this intentionally small and opinionated – just enough to
 * express a clean "generic saw CSV" and DXF layer conventions. More
 * vendor-specific profiles (Elumatec, Fom, Emmegi, Yilmaz, etc.) can be
 * added without touching the core generators.
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
];

export function getMachineProfile(id?: string | null): MachineExportProfile | undefined {
  if (!id) return undefined;
  return MACHINE_PROFILES.find((p) => p.id === id);
}


