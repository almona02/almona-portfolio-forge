/**
 * Route/data contract for FINAL GOAL Profile Studio entry points:
 * Egyptian catalogue, Turkish catalogue, and custom Profile Studio Lite.
 * Does not claim live auth UI walk on almona02.com.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import {
  addCustomSystem,
  loadCustomSystems,
  type StoredSystemPack,
} from '@/lib/fabricator/customSystemStorage';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { buildStarterSystemPack } from '@/lib/fabricator/systemPackBuilder';

describe('Profile Studio entry points — route + catalogue contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes canonical Egyptian gallery and custom Profile Studio routes', () => {
    expect(fabricatorRoutes.studioDataProfiles()).toBe('/fabricator/studio/data/profiles');
    expect(fabricatorRoutes.studioDataProfileStudio()).toBe(
      '/fabricator/studio/data/profile-studio',
    );
    expect(fabricatorRoutes.studioData('profiles')).toBe('/fabricator/studio/data/profiles');
    expect(fabricatorRoutes.studioData('profile-studio')).toBe(
      '/fabricator/studio/data/profile-studio',
    );
  });

  it('includes Egyptian catalogue packs reachable via the profiles gallery', () => {
    const egyptian = SYSTEM_PACKS.filter((pack) =>
      (pack.meta.regions ?? []).map(String).includes('egypt'),
    );
    expect(egyptian.length).toBeGreaterThan(0);
    expect(egyptian.some((pack) => pack.meta.id === 'caluminium-ps')).toBe(true);
    expect(egyptian.some((pack) => pack.meta.id === 'panda-50' || pack.meta.id === 'panda-100')).toBe(
      true,
    );
  });

  it('includes Turkish catalogue packs reachable via the profiles gallery', () => {
    const turkish = SYSTEM_PACKS.filter((pack) =>
      (pack.meta.regions ?? []).map(String).includes('turkey'),
    );
    expect(turkish.length).toBeGreaterThan(0);
    expect(turkish.some((pack) => pack.meta.id === 'asas-cw100')).toBe(true);
    expect(
      turkish.some(
        (pack) =>
          pack.meta.id.startsWith('kale-') ||
          pack.meta.id.startsWith('anadolu-') ||
          pack.meta.id.startsWith('asas-'),
      ),
    ).toBe(true);
  });

  it('persists a custom system pack through local Profile Studio storage', () => {
    const starter = buildStarterSystemPack('Entry Point Custom Pack');
    const saved = addCustomSystem(starter);
    expect(saved.some((pack) => pack.meta.id === starter.meta.id)).toBe(true);

    const reloaded: StoredSystemPack[] = loadCustomSystems();
    expect(reloaded.some((pack) => pack.meta.id === starter.meta.id)).toBe(true);
    expect(reloaded.find((pack) => pack.meta.id === starter.meta.id)?.meta.name).toBe(
      'Entry Point Custom Pack',
    );
  });
});
