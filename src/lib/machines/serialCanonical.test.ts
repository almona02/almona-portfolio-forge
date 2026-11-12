import { describe, expect, it } from 'vitest';
import {
  preserveRawSerial,
  serialCanonicalV1,
  serialSeparatorInsensitiveV1,
  wouldFlagSeparatorInsensitiveReview,
} from './serialCanonical';

describe('serialCanonical PR1', () => {
  it('preserves raw text with only end trim', () => {
    expect(preserveRawSerial('  YM-5K-238492  ')).toBe('YM-5K-238492');
    expect(preserveRawSerial('')).toBeNull();
    expect(preserveRawSerial(null)).toBeNull();
  });

  it('default canonical retains separators', () => {
    expect(serialCanonicalV1('ym-5k-238492')).toBe('YM-5K-238492');
    expect(serialCanonicalV1('YM 5K 238492')).toBe('YM 5K 238492');
    expect(serialCanonicalV1('YM-5K-238492')).not.toBe(serialCanonicalV1('YM5K238492'));
  });

  it('separator-insensitive flag does not equal identity', () => {
    expect(serialSeparatorInsensitiveV1('YM-5K-238492')).toBe('YM5K238492');
    expect(wouldFlagSeparatorInsensitiveReview('YM-5K-238492', 'YM5K238492')).toBe(true);
    expect(wouldFlagSeparatorInsensitiveReview('YM-5K-238492', 'YM-5K-238492')).toBe(false);
    expect(wouldFlagSeparatorInsensitiveReview('AAA', 'BBB')).toBe(false);
  });
});
