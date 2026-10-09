import { describe, expect, it } from 'vitest';
import {
  sha256Hex,
  validateOptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

const validPayload = {
  schema: 'almona.optimization-result' as const,
  schemaVersion: 1,
  cuttingPlan: [
    {
      stockLength: 6000,
      profile: { id: 'PS-FRAME' },
      cuts: [
        { cutId: 'c1', length: 1200, angle: 45 },
        { cutId: 'c2', length: 1400, angle: 45 },
      ],
    },
  ],
};

describe('validateOptimizationEvidencePayload', () => {
  it('accepts a well-formed placement', () => {
    const result = validateOptimizationEvidencePayload(validPayload, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.serverCutCount).toBe(2);
    expect(result.placementCanonical.length).toBeGreaterThan(8);
  });

  it('rejects stock overruns', () => {
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        cuttingPlan: [
          {
            stockLength: 2000,
            cuts: [
              { cutId: 'a', length: 1500 },
              { cutId: 'b', length: 1500 },
            ],
          },
        ],
      },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/stock overrun/i);
  });

  it('rejects cut_count mismatch and missing schema', () => {
    expect(validateOptimizationEvidencePayload(validPayload, 9).ok).toBe(false);
    expect(validateOptimizationEvidencePayload({ cuttingPlan: [] }, 0).ok).toBe(false);
  });

  it('hashes placement canonically', async () => {
    const a = validateOptimizationEvidencePayload(validPayload, 2);
    const b = validateOptimizationEvidencePayload(validPayload, 2);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(await sha256Hex(a.placementCanonical)).toBe(await sha256Hex(b.placementCanonical));
  });
});
