import type { Machine } from '@/types/machine';

/** Manufacturer serial for display — never an ALM- internal ref. */
export function manufacturerSerialLabel(machine: Pick<Machine, 'serial_number' | 'serial_number_raw'>): string | null {
  const raw = machine.serial_number_raw ?? machine.serial_number;
  if (!raw || String(raw).trim() === '') return null;
  if (String(raw).toUpperCase().startsWith('ALM-')) return null;
  return String(raw);
}

/** Internal provisional asset ref — support/record-keeping only. */
export function internalAlmLabel(machine: Pick<Machine, 'provisional_asset_ref'>): string | null {
  const ref = machine.provisional_asset_ref;
  if (!ref || !String(ref).toUpperCase().startsWith('ALM-')) return null;
  return String(ref);
}

export function formatMachineOptionLabel(machine: Machine): string {
  const mfr = manufacturerSerialLabel(machine);
  const alm = internalAlmLabel(machine);
  const catalog = machine.catalog_link_status && machine.catalog_link_status !== 'linked'
    ? ` · ${machine.catalog_link_status}`
    : '';
  if (mfr) return `${machine.model} · serial ${mfr}${catalog}`;
  if (alm) return `${machine.model} · internal ${alm} (no plate serial)${catalog}`;
  return `${machine.model} · id ${machine.id.slice(0, 8)}…${catalog}`;
}
