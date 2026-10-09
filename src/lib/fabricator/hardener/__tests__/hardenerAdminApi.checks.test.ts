import { describe, expect, it } from 'vitest';
import {
  assertFullHardenerCompatibilityChecks,
  HARDENER_REQUIRED_COMPATIBILITY_CHECKS,
} from '../hardenerAdminApi';

describe('hardenerAdminApi compatibility checks (#68)', () => {
  it('requires the full named check set', () => {
    expect(() => assertFullHardenerCompatibilityChecks([])).toThrow(/empty rejected/);
    expect(() =>
      assertFullHardenerCompatibilityChecks([{ check: 'material', passed: true }]),
    ).toThrow(/system_profile/);
  });

  it('accepts the complete named set in canonical order', () => {
    const checks = HARDENER_REQUIRED_COMPATIBILITY_CHECKS.map((check) => ({
      check,
      passed: true,
    }));
    expect(assertFullHardenerCompatibilityChecks(checks).map((c) => c.check)).toEqual([
      ...HARDENER_REQUIRED_COMPATIBILITY_CHECKS,
    ]);
  });
});
