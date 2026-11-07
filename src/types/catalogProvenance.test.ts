/**
 * Catalog provenance helpers — pure unit tests (no database).
 */
import { describe, expect, it } from 'vitest';
import {
  buildPackProvenance,
  buildPricingProvenance,
  catalogMigrationMissingMessage,
  isMissingCatalogDdlError,
  nextCatalogVersion,
} from './catalogProvenance';

describe('nextCatalogVersion', () => {
  it('increments a valid current version', () => {
    expect(nextCatalogVersion(1)).toBe(2);
    expect(nextCatalogVersion(41)).toBe(42);
  });

  it('restarts at 1 for missing or invalid versions', () => {
    expect(nextCatalogVersion(undefined)).toBe(1);
    expect(nextCatalogVersion(null)).toBe(1);
    expect(nextCatalogVersion(0)).toBe(1);
    expect(nextCatalogVersion(-3)).toBe(1);
    expect(nextCatalogVersion('7')).toBe(1);
  });
});

describe('isMissingCatalogDdlError', () => {
  it('detects schema-cache and undefined-column/table errors', () => {
    expect(isMissingCatalogDdlError({ code: 'PGRST204', message: "Could not find the 'version' column" })).toBe(true);
    expect(isMissingCatalogDdlError({ code: '42703', message: 'column does not exist' })).toBe(true);
    expect(isMissingCatalogDdlError({ code: '42P01', message: 'relation does not exist' })).toBe(true);
    expect(isMissingCatalogDdlError({ message: 'column "version" of relation "fabricator_system_packs" in schema cache' })).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isMissingCatalogDdlError({ code: 'PGRST116', message: 'no rows' })).toBe(false);
    expect(isMissingCatalogDdlError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingCatalogDdlError(null)).toBe(false);
    expect(isMissingCatalogDdlError('boom')).toBe(false);
  });

  it('names the migration in the guidance message', () => {
    expect(catalogMigrationMissingMessage('Pack versioning')).toMatch(/20261106000000_admin_catalog_versioning\.sql/);
  });
});

describe('provenance builders', () => {
  it('builds a pack provenance record with defaults', () => {
    const provenance = buildPackProvenance({ version: 3, updatedBy: 'user-1', source: 'admin_catalog' });
    expect(provenance).toMatchObject({ version: 3, updatedBy: 'user-1', source: 'admin_catalog', changeNote: null });
    expect(provenance.updatedAt).toBeTruthy();
  });

  it('builds a pricing provenance record with note and currency', () => {
    const provenance = buildPricingProvenance({
      version: 2, updatedBy: 'user-1', source: 'tuning_studio', note: 'Q4 update', currency: 'EGP',
    });
    expect(provenance).toMatchObject({ version: 2, note: 'Q4 update', currency: 'EGP' });
  });
});
