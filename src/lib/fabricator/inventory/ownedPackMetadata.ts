import type { Profile, SystemPack } from '@/types/fabricator';

/** Join by owned UUID only. Catalogue rows never supply balances or replace stock. */
export function applyOwnedPackMetadata(profiles: Profile[], packs: SystemPack[]): Profile[] {
  return profiles.map(profile => {
    const matches = packs.flatMap(pack => (pack.profiles || [])
      .filter(candidate => candidate.id === profile.id)
      .map(candidate => ({ packId: pack.meta.id, role: candidate.profileRole })));
    const roles = [...new Set(matches.map(match => match.role).filter(Boolean))];
    return {
      ...profile,
      profileRole: profile.profileRole ?? (roles.length === 1 ? roles[0] : undefined),
      systemPackIds: [...new Set([...(profile.systemPackIds || []), ...matches.map(match => match.packId)])],
    };
  });
}
