import { describe, expect, it } from 'vitest';
import { allProfilesExplicitlyTuned } from './tuningReadiness';
describe('Tuning readiness', () => {
  it('blocks empty, missing and unresolved profile sets', () => {
    expect(allProfilesExplicitlyTuned([], new Set())).toBe(false);
    expect(allProfilesExplicitlyTuned(undefined, new Set())).toBe(false);
    expect(allProfilesExplicitlyTuned([{ id: '' }], new Set(['']))).toBe(false);
  });
  it('requires every actual profile to be explicitly tuned', () => {
    const profiles = [{ id: 'frame' }, { id: 'sash' }];
    expect(allProfilesExplicitlyTuned(profiles, new Set(['frame']))).toBe(false);
    expect(allProfilesExplicitlyTuned(profiles, new Set(['frame', 'sash']))).toBe(true);
  });
});
