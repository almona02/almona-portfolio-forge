import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assessPatternPackFit,
  getCertifiedPatternsForPack,
  getLayoutTemplatesForSystem,
  isPatternCertifiedForPack,
} from './patternPackCompatibility';

const customPacks: { meta: { id: string }; windowSystemSpec: Record<string, unknown> }[] = [];

vi.mock('@/lib/fabricator/customSystemStorage', () => ({
  loadCustomSystems: () => customPacks,
}));

describe('patternPackCompatibility', () => {
  beforeEach(() => {
    customPacks.length = 0;
  });

  it('separates certified patterns from donor layout templates for caluminium-ps', () => {
    const certified = getCertifiedPatternsForPack('caluminium-ps');
    const templates = getLayoutTemplatesForSystem('caluminium-ps');
    expect(certified.length).toBe(0);
    expect(templates.length).toBeGreaterThan(0);
    expect(isPatternCertifiedForPack('sliding-2s', 'caluminium-ps')).toBe(false);
    expect(isPatternCertifiedForPack('sliding-2s', 'rock60')).toBe(true);
  });

  it('honours pack-owned certified_pattern_ids for owned workshop packs', () => {
    customPacks.push({
      meta: { id: 'custom-pack-ps' },
      windowSystemSpec: {
        certified_pattern_ids: ['sliding-2s'],
        default_pattern_id: 'sliding-2s',
      },
    });
    expect(isPatternCertifiedForPack('sliding-2s', 'custom-pack-ps')).toBe(true);
    expect(getCertifiedPatternsForPack('custom-pack-ps').some((p) => p.id === 'sliding-2s')).toBe(true);
  });

  it('marks donor patterns as layout_template requiring confirmation', () => {
    const fit = assessPatternPackFit({
      patternId: 'sliding-2s',
      systemPackId: 'caluminium-ps',
      widthMm: 1200,
      heightMm: 1400,
    });
    expect(fit.kind).toBe('layout_template');
    expect(fit.requiresConfirmation).toBe(true);
    expect(fit.canApplyAsTemplate).toBe(true);
    expect(fit.reasons.some((r) => /not certified/i.test(r))).toBe(true);
  });

  it('hard-blocks when pack dimensional limits are violated', () => {
    const fit = assessPatternPackFit({
      patternId: 'sliding-2s',
      systemPackId: 'caluminium-ps',
      widthMm: 200,
      heightMm: 200,
    });
    expect(fit.canApplyAsTemplate).toBe(false);
  });

  it('keeps rock60 sliding-2s certified when in range', () => {
    const fit = assessPatternPackFit({
      patternId: 'sliding-2s',
      systemPackId: 'rock60',
      widthMm: 1200,
      heightMm: 1400,
    });
    expect(fit.kind).toBe('certified');
  });
});
