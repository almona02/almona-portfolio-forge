import { describe, expect, it } from 'vitest';
import {
  approvedRuleContentFingerprint,
  authorityContentFingerprint,
  canonicalJsonbSerialize,
} from './validateOptimizationEvidencePayload';

/**
 * Golden vectors shared with supabase/tests/canonical_jsonb_serialize_test.sql.
 * Expected strings are the explicit contract — not Postgres jsonb::text.
 */
const VECTORS: Array<{ name: string; value: unknown; expected: string }> = [
  { name: 'null', value: null, expected: 'null' },
  { name: 'true', value: true, expected: 'true' },
  { name: 'false', value: false, expected: 'false' },
  { name: 'int', value: 4, expected: '4' },
  { name: 'zero', value: 0, expected: '0' },
  { name: 'decimal', value: 1.5, expected: '1.5' },
  { name: 'empty object', value: {}, expected: '{}' },
  { name: 'empty array', value: [], expected: '[]' },
  {
    name: 'key order independent',
    value: { trimCutMm: 0, sawKerfMm: 4 },
    expected: '{"sawKerfMm": 4, "trimCutMm": 0}',
  },
  {
    name: 'nested + unicode',
    value: {
      materials: ['aluminum', 'ألومنيوم'],
      note: 'café',
      nested: { z: 1, a: null },
    },
    expected:
      '{"materials": ["aluminum", "ألومنيوم"], "nested": {"a": null, "z": 1}, "note": "café"}',
  },
  {
    name: 'missing nested treated as null at call site',
    value: null,
    expected: 'null',
  },
  {
    name: 'array of objects',
    value: [{ b: 2, a: 1 }, { a: 3 }],
    expected: '[{"a": 1, "b": 2}, {"a": 3}]',
  },
];

describe('canonicalJsonbSerialize', () => {
  for (const vector of VECTORS) {
    it(`serializes ${vector.name}`, () => {
      expect(canonicalJsonbSerialize(vector.value)).toBe(vector.expected);
    });
  }

  it('treats undefined like null', () => {
    expect(canonicalJsonbSerialize(undefined)).toBe('null');
  });

  it('rule content fingerprint is stable under key reordering', async () => {
    const a = await approvedRuleContentFingerprint([
      {
        approvalId: 'a',
        ruleId: 'cut',
        revision: 1,
        evidenceStatus: 'approved',
        deductions: { endDeductionMm: 20, weld: { left: 1, right: 2 } },
        allowances: null,
        applicability: { materials: ['aluminum'] },
      },
    ]);
    const b = await approvedRuleContentFingerprint([
      {
        approvalId: 'a',
        ruleId: 'cut',
        revision: 1,
        evidenceStatus: 'approved',
        deductions: { weld: { right: 2, left: 1 }, endDeductionMm: 20 },
        allowances: null,
        applicability: { materials: ['aluminum'] },
      },
    ]);
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
  });

  it('authority fingerprint uses canonical settings serialization', async () => {
    const fp = await authorityContentFingerprint({
      manufacturingSettings: { trimCutMm: 0, sawKerfMm: 4 },
      permittedStockLengths: [6500, 6000],
      cuttingRules: [
        {
          approvalId: 'a',
          ruleId: 'cut',
          revision: 1,
          evidenceStatus: 'approved',
          deductions: { endDeductionMm: 20 },
        },
      ],
    });
    expect(fp).toHaveLength(64);
    // stocks sorted ascending in canonical
    const again = await authorityContentFingerprint({
      manufacturingSettings: { sawKerfMm: 4, trimCutMm: 0 },
      permittedStockLengths: [6000, 6500],
      cuttingRules: [
        {
          approvalId: 'a',
          ruleId: 'cut',
          revision: 1,
          evidenceStatus: 'approved',
          deductions: { endDeductionMm: 20 },
        },
      ],
    });
    expect(again).toBe(fp);
  });
});
