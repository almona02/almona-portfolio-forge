import { describe, expect, it } from 'vitest';
import {
  readPackPatternConfig,
  withPackPatternConfig,
} from './packPatternConfig';
import type { SystemPack } from '@/types/fabricator';

const base = {
  meta: { id: 'custom-pack-test', name: 'Test', manufacturer: 't', region: 'eg' },
  windowSystemSpec: {},
  profiles: [],
} as unknown as SystemPack;

describe('packPatternConfig', () => {
  it('reads empty config by default', () => {
    expect(readPackPatternConfig(base)).toEqual({
      certifiedPatternIds: [],
      defaultPatternId: null,
    });
  });

  it('certifies known patterns and enforces default membership', () => {
    const next = withPackPatternConfig(base, {
      certifiedPatternIds: ['sliding-2s'],
      defaultPatternId: 'sliding-2s',
    });
    expect(readPackPatternConfig(next).defaultPatternId).toBe('sliding-2s');
    expect(() =>
      withPackPatternConfig(base, {
        certifiedPatternIds: ['sliding-2s'],
        defaultPatternId: 'fixed',
      }),
    ).toThrow(/default_pattern_id must be one of/i);
  });

  it('rejects unknown pattern ids', () => {
    expect(() =>
      withPackPatternConfig(base, {
        certifiedPatternIds: ['not-a-real-pattern'],
        defaultPatternId: null,
      }),
    ).toThrow(/Unknown pattern/i);
  });
});
