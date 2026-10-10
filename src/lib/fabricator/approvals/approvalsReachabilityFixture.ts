/**
 * Long-queue fixture for Approvals reachability browser tests.
 * Activated only via sessionStorage key set by Playwright (never production SQL).
 * AICS-001: presentation fixture — no manufacturing execution authority.
 */

export const APPROVALS_REACHABILITY_STORAGE_KEY = 'almona.approvalsReachabilityFixture';

export function isApprovalsReachabilityFixtureActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(APPROVALS_REACHABILITY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const LONG =
  '— long evidence reference for viewport wrap testing: catalogue binding, cutting rule revision, tolerance stack, kerf notes, and operator remarks that force multi-line cards on narrow phones and short landscape shells.';

export type ReachabilityPending = {
  id: string;
  owner_user_id: string;
  position_id: string;
  position_revision: number;
  system_pack_id: string;
  catalogue_reference: string;
  rule_reference: string;
  notes: string;
  status: string;
  approval_id: string | null;
  requested_at: string;
};

export type ReachabilityActive = {
  approval_id: string;
  system_pack_id: string;
  system_pack_revision: number;
  provenance: string;
  approved_at: string;
};

export type ReachabilityHardener = {
  id: string;
  position_id: string;
  position_revision: number;
  system_pack_id: string;
  proposed_hardener_code: string;
  opening_type: string | null;
  material: string | null;
  glass_thickness_mm: number | null;
  sash_width_mm: number | null;
  sash_height_mm: number | null;
  sash_weight_kg: number | null;
  compatibility_checks: Array<{ check?: string; passed?: boolean; detail?: string }>;
  missing_evidence: string[] | null;
  status: string;
  engineering_evidence: Record<string, unknown> | null;
};

/** Extra synthetic vendor rows rendered only under the reachability fixture. */
export const REACHABILITY_VENDOR_EXTRA = Array.from({ length: 8 }, (_, i) => ({
  id: `reachability-vendor-pack-${String(i + 1).padStart(2, '0')}`,
  label: `Reachability Pack ${i + 1} ${LONG.slice(0, 48)}`,
}));

export function buildReachabilityPending(count = 6): ReachabilityPending[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `11111111-1111-4111-8111-${String(i + 1).padStart(12, '0')}`,
    owner_user_id: '22222222-2222-4222-8222-000000000001',
    position_id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
    position_revision: 10 + i,
    system_pack_id: `reachability-pending-pack-${i + 1}`,
    catalogue_reference: `CAT-${i + 1} ${LONG}`,
    rule_reference: `RULE-${i + 1} ${LONG}`,
    notes: `Pending notes ${i + 1} ${LONG}`,
    status: 'pending',
    approval_id: null,
    requested_at: new Date(Date.now() - i * 3600_000).toISOString(),
  }));
}

export function buildReachabilityActive(count = 6): ReachabilityActive[] {
  return Array.from({ length: count }, (_, i) => ({
    approval_id: `44444444-4444-4444-8444-${String(i + 1).padStart(12, '0')}`,
    system_pack_id: `reachability-active-pack-${i + 1}`,
    system_pack_revision: 3 + i,
    provenance: i % 2 === 0 ? 'vendor' : 'admin',
    approved_at: new Date(Date.now() - i * 7200_000).toISOString(),
  }));
}

export function buildReachabilityHardener(count = 5): ReachabilityHardener[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `55555555-5555-4555-8555-${String(i + 1).padStart(12, '0')}`,
    position_id: `66666666-6666-4666-8666-${String(i + 1).padStart(12, '0')}`,
    position_revision: 2 + i,
    system_pack_id: `reachability-hardener-pack-${i + 1}`,
    proposed_hardener_code: `H-REACH-${i + 1}-${LONG.slice(0, 24)}`,
    opening_type: 'casement',
    material: 'aluminum',
    glass_thickness_mm: 6 + i,
    sash_width_mm: 900 + i * 40,
    sash_height_mm: 1200 + i * 30,
    sash_weight_kg: 18 + i,
    compatibility_checks: [
      { check: 'profile_match', passed: true, detail: LONG.slice(0, 80) },
      {
        check: 'weight_limit',
        passed: i % 3 !== 0,
        detail: i % 3 === 0 ? `FAIL detail ${LONG}` : 'within limit',
      },
    ],
    missing_evidence: i % 3 === 0 ? [`evidence-${i}`, `photo-${i}`] : [],
    status: 'pending',
    engineering_evidence: { note: LONG },
  }));
}
