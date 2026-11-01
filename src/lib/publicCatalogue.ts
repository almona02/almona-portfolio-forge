import type { Machine } from '@/constants/yilmazMachines';

/** Validate public JSON before cards and filters access its fields. */
export function parsePublicCatalogue(value: unknown): Machine[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  if (!value.every(machine => machine && typeof machine === 'object' &&
    ['id', 'name', 'description', 'category', 'imageUrl'].every(key => typeof machine[key] === 'string') &&
    /^[a-zA-Z0-9_-]+$/.test(machine.id) && machine.powerSpec && machine.dimensions &&
    Array.isArray(machine.specifications) && machine.specifications.every((spec: unknown) => typeof spec === 'string')
  )) return undefined;
  return value as Machine[];
}

export function readCatalogueBootstrap(): Machine[] | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const source = document.getElementById('almona-catalog-data')?.textContent;
    return source ? parsePublicCatalogue(JSON.parse(source)) : undefined;
  } catch { return undefined; }
}
