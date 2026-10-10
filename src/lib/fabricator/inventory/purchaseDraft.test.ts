import { describe, expect, it } from 'vitest';
import { purchaseProfileKey, purchaseValidationError, type PurchaseItem } from './purchaseDraft';

const item: PurchaseItem = {
  profile: { profileCode: '100', name: 'Frame', systemName: 'Alpha', systemPackId: 'alpha', category: 'window', role: 'frame' },
  quantity: 2, lengthMm: 6000, color: 'White',
};

describe('purchase draft stock units', () => {
  it('keeps identical supplier codes from different packs separate', () => {
    expect(purchaseProfileKey(item.profile)).not.toBe(purchaseProfileKey({ ...item.profile, systemPackId: 'beta' }));
  });
  it('accepts valid bars with measured decimal stock lengths', () => {
    expect(purchaseValidationError([{ ...item, lengthMm: 6000.5 }])).toBeNull();
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid bar quantity %s', quantity => {
    expect(purchaseValidationError([{ ...item, quantity }])).toContain('positive whole number');
  });
  it.each([0, -100, NaN, Infinity])('rejects invalid stock length %s', lengthMm => {
    expect(purchaseValidationError([{ ...item, lengthMm }])).toContain('stock length');
  });
  it('rejects an empty cart and blank finish', () => {
    expect(purchaseValidationError([])).not.toBeNull();
    expect(purchaseValidationError([{ ...item, color: '  ' }])).toContain('finish');
  });
});
