import { describe, expect, it } from 'vitest';
import {
  mapProfileRowFromDb,
  profileInventoryValue,
} from './profileInventoryMapper';

describe('profileInventoryMapper (UP-09)', () => {
  it('maps snake_case stock and cost so inventory value is finite', () => {
    const profile = mapProfileRowFromDb({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Frame RC',
      material: 'aluminum',
      width: '60',
      stock_quantity: '12.5',
      min_stock_level: '2',
      cost_per_meter: '85.5',
      cutting_allowance: '3',
      system_brand: 'ROCK',
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      specifications: {},
    });

    expect(profile.costPerMeter).toBe(85.5);
    expect(profile.stockQuantity).toBe(12.5);
    expect(profile.minStockLevel).toBe(2);
    expect(profile.systemBrand).toBe('ROCK');
    expect(profileInventoryValue(profile)).toBeCloseTo(12.5 * 85.5);
    expect(Number.isFinite(profileInventoryValue(profile))).toBe(true);
  });

  it('never yields NaN when cost columns are missing', () => {
    const profile = mapProfileRowFromDb({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Unpriced',
      material: 'aluminum',
      width: 50,
      stock_quantity: 3,
      // cost_per_meter intentionally omitted
    });

    expect(profile.costPerMeter).toBe(0);
    expect(profileInventoryValue(profile)).toBe(0);
    expect(Number.isNaN(profileInventoryValue(profile))).toBe(false);
  });
});
