import type { CatalogProfile } from '@/lib/catalog/UnifiedProfileCatalog';

export interface PurchaseItem {
  profile: CatalogProfile;
  quantity: number;
  lengthMm: number;
  color: string;
}

/** Catalogue codes are only unique inside their system pack. */
export function purchaseProfileKey(profile: CatalogProfile): string {
  return JSON.stringify([profile.systemPackId || profile.systemName, profile.profileCode]);
}

export function purchaseValidationError(cart: readonly PurchaseItem[]): string | null {
  if (!cart.length) return 'Add at least one profile before recording stock.';
  for (const item of cart) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      return `${item.profile.name}: bars must be a positive whole number.`;
    }
    if (!Number.isFinite(item.lengthMm) || item.lengthMm <= 0) {
      return `${item.profile.name}: stock length must be greater than zero.`;
    }
    if (!item.color.trim()) return `${item.profile.name}: enter a finish or color.`;
    if (!Number.isFinite(item.quantity * item.lengthMm)) return 'Stock total is too large.';
  }
  return null;
}
