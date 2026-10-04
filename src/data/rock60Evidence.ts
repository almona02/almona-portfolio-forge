/**
 * FP-028 / Phase 0 — ROCK 60 rule evidence tags.
 *
 * Marks catalog rules in ROCK60_WINDOW_SYSTEM_TEMPLATE / ROCK60_SYSTEM_PACK as
 * evidence-backed, illustrative, or pending external fixture verification.
 *
 * Does not change cutting formulas. Manufacturing must not treat illustrative
 * or pending rules as approved authority.
 */

export type Rock60EvidenceStatus =
  | 'evidence_backed'
  | 'illustrative'
  | 'pending_external_fixture';

export interface Rock60EvidenceTag {
  ruleId: string;
  path: string;
  status: Rock60EvidenceStatus;
  /** Why this status was assigned (characterization note, not a formula change). */
  note: string;
  sourceHint?: string;
}

/**
 * Inventory of ROCK 60 manufacturing-adjacent rules and their evidence status.
 *
 * `drawing_reference: Page 24 - Draft Shop Drawing` is recorded as a catalog
 * hint only — until an approved external golden fixture exists, cut formulas
 * remain pending_external_fixture rather than manufacturing-ready.
 */
export const ROCK60_EVIDENCE_TAGS: readonly Rock60EvidenceTag[] = [
  {
    ruleId: 'drawing_reference',
    path: 'windowSystemSpec.drawing_reference',
    status: 'illustrative',
    note: 'Catalog page label present; not a verified golden fixture binding.',
    sourceHint: 'Page 24 - Draft Shop Drawing',
  },
  {
    ruleId: 'stock_length_mm',
    path: 'windowSystemSpec.stockLengthMm / meta.defaultStockLengthMm',
    status: 'illustrative',
    note: '6000 mm is a market stock hint, not an approved job stock length.',
  },
  {
    ruleId: 'structural_constraints',
    path: 'windowSystemSpec.constraints',
    status: 'illustrative',
    note: 'Comment in pack: can be tuned per market — not locked to approved evidence.',
  },
  {
    ruleId: 'legacy_profiles_cutting_list',
    path: 'windowSystemSpec.profiles_cutting_list',
    status: 'pending_external_fixture',
    note: 'Profile codes and L± / H± expressions cite shop drawing; lengths not golden-tested.',
    sourceHint: 'Page 24 - Draft Shop Drawing',
  },
  {
    ruleId: 'rock60_45_degree_config',
    path: 'windowSystemSpec.rock60_45_degree_config',
    status: 'pending_external_fixture',
    note: '45° miter cut formulas (L+60, L-44, bead deductions) await external fixture approval.',
    sourceHint: 'Page 24 - Draft Shop Drawing',
  },
  {
    ruleId: 'glass_cutting',
    path: 'windowSystemSpec.glass_cutting',
    status: 'pending_external_fixture',
    note: 'Double glass 24mm + L-167 / H-167 deductions not locked by golden job.',
    sourceHint: 'Page 24 - Draft Shop Drawing',
  },
  {
    ruleId: 'weight_calculation',
    path: 'windowSystemSpec.weight_calculation',
    status: 'illustrative',
    note: 'Linear weight formulas are catalog estimates; not manufacturing piece authority.',
  },
  {
    ruleId: 'accessories_list',
    path: 'windowSystemSpec.accessories_list',
    status: 'pending_external_fixture',
    note: 'Hardware/gasket SKUs listed; quantities like 21.4H not externally verified.',
    sourceHint: 'Page 24 - Draft Shop Drawing',
  },
  {
    ruleId: 'smart_draw_preset',
    path: 'ROCK60_SYSTEM_PACK.smartDrawPreset',
    status: 'illustrative',
    note: 'UI spacing heuristics for Smart Draw; not cutting authority.',
  },
  {
    ruleId: 'glass_allowances',
    path: 'ROCK60_SYSTEM_PACK.glassAllowances',
    status: 'illustrative',
    note: 'Edge clearance / bite defaults without approved fixture binding.',
  },
  {
    ruleId: 'default_grid',
    path: 'ROCK60_SYSTEM_PACK.defaultGrid',
    status: 'illustrative',
    note: '1×2 sash/fixed seed layout; must not overwrite saved geometry (see D2).',
  },
] as const;

export function getRock60EvidenceTag(ruleId: string): Rock60EvidenceTag | undefined {
  return ROCK60_EVIDENCE_TAGS.find((t) => t.ruleId === ruleId);
}

export function listRock60RulesByStatus(
  status: Rock60EvidenceStatus
): readonly Rock60EvidenceTag[] {
  return ROCK60_EVIDENCE_TAGS.filter((t) => t.status === status);
}

/** True when no ROCK 60 rule is currently manufacturing-authoritative. */
export function rock60HasManufacturingAuthority(): boolean {
  return ROCK60_EVIDENCE_TAGS.some((t) => t.status === 'evidence_backed');
}
