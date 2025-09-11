import { describe, it, expect } from 'vitest';
import { calculateTieredPrice, computeLineTotal, getAppliedDiscountRate } from './pricing';

// Using a base price of 100 for predictable expectations
const BASE = 100;

describe('pricing tier logic', () => {
  const cases: Array<[qty: number, expectedUnit: number, expectedDiscount: number]> = [
    [1, 100, 0],
    [4, 100, 0],
    [5, 95, 0.05],
    [9, 95, 0.05],
    [10, 90, 0.10],
    [24, 90, 0.10],
    [25, 85, 0.15],
  ];

  cases.forEach(([qty, expectedUnit, expectedDiscount]) => {
    it(`quantity ${qty} applies unit price ${expectedUnit} and discount ${(expectedDiscount*100).toFixed(0)}%`, () => {
      const unit = calculateTieredPrice(BASE, qty);
      expect(unit).toBeCloseTo(expectedUnit, 5);
      expect(getAppliedDiscountRate(qty)).toBeCloseTo(expectedDiscount, 5);
    });
  });

  it('computeLineTotal multiplies correctly with discount (qty 10 -> 900)', () => {
    expect(computeLineTotal(BASE, 10)).toBe(900);
  });

  it('computeLineTotal for qty 25 -> 2125', () => {
    expect(computeLineTotal(BASE, 25)).toBe(2125);
  });

  it('zero or negative quantity returns 0 unit price', () => {
    expect(calculateTieredPrice(BASE, 0)).toBe(0);
    expect(calculateTieredPrice(BASE, -5)).toBe(0);
  });
});
