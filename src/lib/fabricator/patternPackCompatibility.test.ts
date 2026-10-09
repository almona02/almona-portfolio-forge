import { describe, expect, it } from 'vitest';
import {
  assessPatternPackFit,
  getCertifiedPatternsForPack,
  getLayoutTemplatesForSystem,
  isPatternCertifiedForPack,
} from './patternPackCompatibility';

describe('patternPackCompatibility', () => {
  it('separates certified patterns from donor layout templates for caluminium-ps', () => {
    const certified = getCertifiedPatternsForPack('caluminium-ps');
    const templates = getLayoutTemplatesForSystem('caluminium-ps');
    expect(certified.length).toBe(0);
    expect(templates.length).toBeGreaterThan(0);
    expect(isPatternCertifiedForPack('sliding-2s', 'caluminium-ps')).toBe(false);
    expect(isPatternCertifiedForPack('sliding-2s', 'rock60')).toBe(true);
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
