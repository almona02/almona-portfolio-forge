/**
 * Build a manufacturing-authority payload from a live SystemPack profile list.
 * Used when the pack is outside the closed vendor one-click allowlist.
 * AICS-001: deterministic catalogue binding — no invented profile codes when
 * the pack already carries profiles.
 */

import type { SystemPack, Profile } from '@/types/fabricator';
import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings';

export type PackAuthorityBuildResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

function profileRole(profile: Profile): string {
  const specs = profile.specifications as { profileRole?: string } | undefined;
  return String(specs?.profileRole || profile.type || 'frame').toLowerCase();
}

function stockLengthMm(profile: Profile): number {
  const specs = profile.specifications as { stockLengthMm?: number; barLength?: number } | undefined;
  const n = Number(profile.barLength ?? specs?.stockLengthMm ?? specs?.barLength ?? 6000);
  return Number.isFinite(n) && n > 0 ? n : 6000;
}

export type PackAuthoritySettings = {
  sawKerfMm: number;
  trimCutMm: number;
  /** When set, overrides per-profile stock length for all bound profiles. */
  stockLengthMm?: number;
};

/**
 * Construct authority JSON for admin approve-from-pack. Requires at least one
 * frame and one sash (or sliding sash) profile on the pack.
 */
export function buildAuthorityPayloadFromPack(
  pack: SystemPack,
  approvalId: string,
  revision: number,
  settings?: PackAuthoritySettings,
): PackAuthorityBuildResult {
  const packId = pack.meta?.id?.trim();
  if (!packId) return { ok: false, error: 'System pack id is required.' };
  const profiles = pack.profiles ?? [];
  if (profiles.length === 0) {
    return { ok: false, error: `Pack ${packId} has no profiles to bind into manufacturing authority.` };
  }

  const authorityProfiles = profiles
    .filter((p) => Boolean(p?.id))
    .map((profile, index) => ({
      role: profileRole(profile),
      profileId: profile.id,
      stockLengthMm: settings?.stockLengthMm ?? stockLengthMm(profile),
      evidenceStatus: 'approved' as const,
      approvalId: `b1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    }));

  const hasFrame = authorityProfiles.some((p) => p.role === 'frame' || p.role.includes('frame'));
  const hasSash = authorityProfiles.some(
    (p) => p.role === 'sash' || p.role.includes('sash') || p.role === 'casement' || p.role === 'sliding',
  );
  if (!hasFrame || !hasSash) {
    return {
      ok: false,
      error: `Pack ${packId} needs at least one frame and one sash profile before authority can be stamped.`,
    };
  }

  return {
    ok: true,
    payload: {
      schema: 'almona.manufacturing-authority',
      schemaVersion: 1,
      system: { id: packId },
      systemPack: {
        id: packId,
        revision,
        evidenceStatus: 'approved',
        approvalId,
      },
      profiles: authorityProfiles,
      cuttingRules: [
        {
          ruleId: `${packId}-cut`,
          revision: 1,
          evidenceStatus: 'approved',
          approvalId: 'c1000000-0000-4000-8000-000000000001',
          deductions: { endDeductionMm: 20 },
          allowances: { weldMm: 3 },
          applicability: { materials: ['aluminum', 'upvc'] },
        },
      ],
      toleranceRule: {
        ruleId: `${packId}-tolerance`,
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'c1000000-0000-4000-8000-000000000002',
      },
      manufacturingSettings: {
        sawKerfMm: settings?.sawKerfMm ?? PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm,
        trimCutMm: settings?.trimCutMm ?? PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm,
      },
    },
  };
}
