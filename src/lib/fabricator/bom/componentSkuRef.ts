/**
 * Structured component / kit identity for BOM qualification (AICS-001).
 * Display categories never substitute for a missing SKU.
 */

export type ComponentSkuRef = {
  /** Stable catalogue or pack kit id — empty means unresolved. */
  sku: string;
  /** Optional pack-scoped kit id when distinct from purchasing SKU. */
  kitId?: string;
  /** Display grouping only (hinge, handle, lock, …). */
  category: string;
  /** Provenance of the identity. */
  source: 'pack_hardware_kit' | 'system_profile_selection' | 'legacy_default' | 'unknown';
  /** When true, manufacturing qualification must fail-closed. */
  unresolved: boolean;
};

export function componentSkuRef(input: {
  sku?: string | null;
  kitId?: string | null;
  category: string;
  source?: ComponentSkuRef['source'];
}): ComponentSkuRef {
  const sku = String(input.sku ?? '').trim();
  const kitId = input.kitId ? String(input.kitId).trim() : undefined;
  const source = input.source ?? (sku ? 'legacy_default' : 'unknown');
  return {
    sku,
    kitId: kitId || undefined,
    category: String(input.category || 'unknown'),
    source: sku ? source : 'unknown',
    unresolved: !sku,
  };
}

export function assertResolvedSku(ref: ComponentSkuRef, label: string): void {
  if (ref.unresolved || !ref.sku) {
    throw new Error(`${label}: required component SKU is unresolved (category=${ref.category})`);
  }
}
