/**
 * Versioned hardener applicability (client mirror of
 * fabricator_system_pack_hardener_applicability).
 *
 * Missing metadata ⇒ require hardener (fail-closed).
 * Name-based "%-no-hardener" exemptions are intentionally NOT honored.
 */

export interface HardenerApplicabilityRecord {
  systemPackId: string;
  requiresHardener: boolean;
  applicabilityVersion: number;
  reason: string;
  evidence: Record<string, unknown>;
}

/** Seeded estimate/sandbox N/A packs — keep in sync with migration seeds. */
export const HARDENER_APPLICABILITY_SEED: readonly HardenerApplicabilityRecord[] = [
  {
    systemPackId: 'sandbox-no-hardener',
    requiresHardener: false,
    applicabilityVersion: 1,
    reason: 'Sandbox estimate pack: hardener gate intentionally N/A for fixture tests',
    evidence: { kind: 'estimate_only', source: 'fixture', catalogueRef: 'sandbox-hardener-na-v1' },
  },
  {
    systemPackId: 'estimate-manual',
    requiresHardener: false,
    applicabilityVersion: 1,
    reason: 'Manual estimate pack: no catalogue hardener mapping required',
    evidence: { kind: 'estimate_only', source: 'catalogue', catalogueRef: 'estimate-manual-na-v1' },
  },
  {
    systemPackId: 'no-hardener',
    requiresHardener: false,
    applicabilityVersion: 1,
    reason: 'Legacy estimate alias: hardener N/A with versioned evidence',
    evidence: { kind: 'estimate_only', source: 'legacy_alias', catalogueRef: 'no-hardener-na-v1' },
  },
  {
    systemPackId: 'fixed-estimate-only',
    requiresHardener: false,
    applicabilityVersion: 1,
    reason: 'Fixed estimate-only pack: manufacturing hardener not applicable',
    evidence: { kind: 'estimate_only', source: 'catalogue', catalogueRef: 'fixed-estimate-only-na-v1' },
  },
] as const;

/**
 * Resolve whether a pack requires hardener verification.
 * Fail-closed: unknown / empty pack ids require hardener.
 * Does not treat "%-no-hardener" names as exemptions.
 */
export function packRequiresHardener(
  systemPackId: string | null | undefined,
  records: readonly HardenerApplicabilityRecord[] = HARDENER_APPLICABILITY_SEED,
): boolean {
  const id = (systemPackId || '').trim();
  if (!id) return true;

  const match = [...records]
    .filter((r) => r.systemPackId === id)
    .sort((a, b) => b.applicabilityVersion - a.applicabilityVersion)[0];

  if (!match) return true;
  return match.requiresHardener;
}
