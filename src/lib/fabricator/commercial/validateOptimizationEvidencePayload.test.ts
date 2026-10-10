import { describe, expect, it } from 'vitest';
import {
  approvedRuleContentFingerprint,
  canonicalApprovedRuleVersion,
  sha256Hex,
  validateOptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

const requiredCuts = [
  { cutId: 'c1', profileId: 'PS-FRAME', length: 1200, angle: 45 },
  { cutId: 'c2', profileId: 'PS-FRAME', length: 1400, angle: 45 },
];

const validPayload = {
  schema: 'almona.optimization-result' as const,
  schemaVersion: 2,
  kerfMm: 4,
  trimMm: 0,
  requiredCuts,
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
  it('accepts a well-formed placement reconciled to the design ledger', () => {
    const result = validateOptimizationEvidencePayload(validPayload, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.serverCutCount).toBe(2);
    expect(result.placementCanonical.length).toBeGreaterThan(8);
    expect(result.designCanonical.length).toBeGreaterThan(8);
  });

  it('rejects schemaVersion < 2', () => {
    const result = validateOptimizationEvidencePayload(
      { ...validPayload, schemaVersion: 1 },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/schemaVersion must be >= 2/i);
  });

  it('rejects raw length overruns', () => {
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        cuttingPlan: [
          {
            stockLength: 2000,
            profile: { id: 'PS-FRAME' },
            cuts: [
              { cutId: 'c1', length: 1500, angle: 45 },
              { cutId: 'c2', length: 1500, angle: 45 },
            ],
          },
        ],
        requiredCuts: [
          { cutId: 'c1', profileId: 'PS-FRAME', length: 1500, angle: 45 },
          { cutId: 'c2', profileId: 'PS-FRAME', length: 1500, angle: 45 },
        ],
      },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/stock overrun/i);
  });

  it('rejects kerf-only overruns where lengths fit but saw consumption does not', () => {
    // lengths 1000+1000 = 2000 == stock; with kerf 4×2 = 8 → consumed 2008
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        kerfMm: 4,
        trimMm: 0,
        requiredCuts: [
          { cutId: 'c1', profileId: 'PS-FRAME', length: 1000, angle: 0 },
          { cutId: 'c2', profileId: 'PS-FRAME', length: 1000, angle: 0 },
        ],
        cuttingPlan: [
          {
            stockLength: 2000,
            profile: { id: 'PS-FRAME' },
            cuts: [
              { cutId: 'c1', length: 1000, angle: 0 },
              { cutId: 'c2', length: 1000, angle: 0 },
            ],
          },
        ],
      },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/kerf\/trim/i);
  });

  it('rejects missing design-ledger cuts', () => {
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        cuttingPlan: [
          {
            stockLength: 6000,
            profile: { id: 'PS-FRAME' },
            cuts: [{ cutId: 'c1', length: 1200, angle: 45 }],
          },
        ],
      },
      1,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/missing cut|cut count mismatch/i);
  });

  it('rejects duplicate placed cuts', () => {
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        requiredCuts: [{ cutId: 'c1', profileId: 'PS-FRAME', length: 1200, angle: 45 }],
        cuttingPlan: [
          {
            stockLength: 6000,
            profile: { id: 'PS-FRAME' },
            cuts: [
              { cutId: 'c1', length: 1200, angle: 45 },
              { cutId: 'c1', length: 1200, angle: 45 },
            ],
          },
        ],
      },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/duplicate cut|cut count mismatch/i);
  });

  it('rejects substituted profile', () => {
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        cuttingPlan: [
          {
            stockLength: 6000,
            profile: { id: 'PS-SASH' },
            cuts: [
              { cutId: 'c1', length: 1200, angle: 45 },
              { cutId: 'c2', length: 1400, angle: 45 },
            ],
          },
        ],
      },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/substituted profile|missing cut|unexpected cut/i);
  });

  it('rejects wrongly sized cuts', () => {
    const result = validateOptimizationEvidencePayload(
      {
        ...validPayload,
        cuttingPlan: [
          {
            stockLength: 6000,
            profile: { id: 'PS-FRAME' },
            cuts: [
              { cutId: 'c1', length: 999, angle: 45 },
              { cutId: 'c2', length: 1400, angle: 45 },
            ],
          },
        ],
      },
      2,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/wrongly sized|missing cut|unexpected cut/i);
  });

  it('rejects cut_count mismatch and missing schema', () => {
    expect(validateOptimizationEvidencePayload(validPayload, 9).ok).toBe(false);
    expect(validateOptimizationEvidencePayload({ cuttingPlan: [] }, 0).ok).toBe(false);
  });

  it('hashes placement and design canonically', async () => {
    const a = validateOptimizationEvidencePayload(validPayload, 2);
    const b = validateOptimizationEvidencePayload(validPayload, 2);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(await sha256Hex(a.placementCanonical)).toBe(await sha256Hex(b.placementCanonical));
    expect(await sha256Hex(a.designCanonical)).toBe(await sha256Hex(b.designCanonical));
  });

  it('binds rule version to approved content, not free-form labels', async () => {
    const rules = [
      { approvalId: 'b2000000-0000-4000-8000-000000000020', ruleId: 'ps-default', revision: 1 },
    ];
    const label = canonicalApprovedRuleVersion(rules);
    const content = await approvedRuleContentFingerprint(rules);
    expect(label).toContain('ps-default');
    expect(content).toHaveLength(64);
    expect(label).not.toBe('rules-fixture');
    expect(content).not.toBe('rules-fixture');
  });
});
