/**
 * Catalog provenance contracts (P1).
 *
 * Pricing and supplier packs are workshop data that flow into manufacturing
 * decisions, so every live value must answer: which version, set by whom,
 * when, from what source, and why. These types are the shared vocabulary for
 * the tuning studios, the admin catalog panel, and the costing read path.
 *
 * Storage:
 * - Pack provenance lives on the fabricator_system_packs row
 *   (version / updated_by / change_note) with snapshots in
 *   fabricator_system_pack_history. See
 *   supabase/migrations/20261106000000_admin_catalog_versioning.sql.
 * - Pricing provenance lives as the specifications.system_pricing_provenance
 *   sibling of specifications.system_pricing on fabricator_profiles, with
 *   snapshots in system_pricing_history (migration 060).
 */

/** Where a catalog value came from. */
export type CatalogProvenanceSource =
  | 'tuning_studio'
  | 'admin_catalog'
  | 'rollback'
  | 'initial_setup';

/** Provenance of one live supplier-pack row. */
export interface PackProvenance {
  version: number;
  updatedBy: string | null;
  updatedAt: string | null;
  changeNote: string | null;
  source: CatalogProvenanceSource;
}

/** Provenance of one live system_pricing block. */
export interface PricingProvenance {
  version: number;
  updatedBy: string | null;
  updatedAt: string | null;
  source: CatalogProvenanceSource;
  note: string | null;
  currency: string | null;
}

/** One immutable pack history entry. */
export interface PackHistoryEntry {
  id: string;
  packId: string;
  version: number;
  spec: unknown;
  changeNote: string | null;
  source: CatalogProvenanceSource;
  createdBy: string | null;
  createdAt: string;
}

export const CATALOG_VERSIONING_MIGRATION =
  'supabase/migrations/20261106000000_admin_catalog_versioning.sql';

/**
 * Detect a missing-DDL error (migration not applied yet): unknown column or
 * unknown table surface as PostgREST schema-cache errors (PGRST204) or raw
 * Postgres errors (42703 undefined_column, 42P01 undefined_table).
 */
export function isMissingCatalogDdlError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const part = (value: unknown): string => (typeof value === 'string' ? value : '');
  const haystack = `${part(record.code)} ${part(record.message)} ${part(record.details)}`.toLowerCase();
  return (
    haystack.includes('pgrst204') ||
    haystack.includes('42703') ||
    haystack.includes('42p01') ||
    (haystack.includes('schema cache') &&
      (haystack.includes('column') || haystack.includes('table')))
  );
}

export function catalogMigrationMissingMessage(what: string): string {
  return (
    `${what} needs the catalog versioning migration, which is not applied to ` +
    `this database yet. Apply ${CATALOG_VERSIONING_MIGRATION} with ` +
    `supabase db push, then retry. Unversioned saves keep working meanwhile.`
  );
}

/** Next monotonic version. Anything non-positive restarts at 1. */
export function nextCatalogVersion(current: unknown): number {
  return typeof current === 'number' && Number.isInteger(current) && current >= 1
    ? current + 1
    : 1;
}

export function buildPackProvenance(input: {
  version: number;
  updatedBy: string | null;
  updatedAt?: string;
  changeNote?: string | null;
  source: CatalogProvenanceSource;
}): PackProvenance {
  return {
    version: input.version,
    updatedBy: input.updatedBy,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    changeNote: input.changeNote ?? null,
    source: input.source,
  };
}

export function buildPricingProvenance(input: {
  version: number;
  updatedBy: string | null;
  updatedAt?: string;
  source: CatalogProvenanceSource;
  note?: string | null;
  currency?: string | null;
}): PricingProvenance {
  return {
    version: input.version,
    updatedBy: input.updatedBy,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    source: input.source,
    note: input.note ?? null,
    currency: input.currency ?? null,
  };
}
