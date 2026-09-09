/**
 * Catalog of Production Output capabilities that the UI may expose.
 * Availability is a statement of existing code paths — never implied.
 *
 * NCW is not implemented anywhere in this repository.
 */

export type MachineOutputCapabilityId =
  | 'cut-sheet'
  | 'bom'
  | 'labels'
  | 'design-preview'
  | 'cnc'
  | 'csv'
  | 'mdb'
  | 'ncw';

export interface MachineOutputCapability {
  id: MachineOutputCapabilityId;
  label: string;
  available: boolean;
  reason?: string;
}

export const MACHINE_OUTPUT_CAPABILITIES: readonly MachineOutputCapability[] = [
  {
    id: 'cut-sheet',
    label: 'Cut sheet',
    available: true,
  },
  {
    id: 'bom',
    label: 'BOM',
    available: true,
  },
  {
    id: 'labels',
    label: 'Labels',
    available: true,
  },
  {
    id: 'design-preview',
    label: 'Design preview',
    available: true,
  },
  {
    id: 'cnc',
    label: 'CNC / machine export',
    available: true,
  },
  {
    id: 'csv',
    label: 'CSV',
    available: true,
  },
  {
    id: 'mdb',
    label: 'MDB',
    available: true,
  },
  {
    id: 'ncw',
    label: 'NCW',
    available: false,
    reason: 'NCW export is not implemented. Not available / planned.',
  },
] as const;

export function isMachineOutputAvailable(id: MachineOutputCapabilityId): boolean {
  return MACHINE_OUTPUT_CAPABILITIES.some((c) => c.id === id && c.available);
}
