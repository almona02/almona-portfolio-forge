/**
 * Supplier Pack Module - Public API
 * 
 * Phase 2: Precision Upgrade Plan
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

export * from './types';
export * from './SupplierPackValidator';
export * from './SupplierPackService';
export * from './SupplierPackCatalog';

// Re-export singleton instances for convenience
export { supplierPackValidator } from './SupplierPackValidator';
export { supplierPackService } from './SupplierPackService';
export {
  initializeSupplierPackCatalog,
  getSupplierPackById,
  getSupplierPacksByRegion,
  getSupplierPacksByTier,
  HIGH_VOLUME_SUPPLIER_PACKS,
} from './SupplierPackCatalog';

