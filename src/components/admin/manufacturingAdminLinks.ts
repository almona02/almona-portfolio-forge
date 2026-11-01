import { fabricatorRoutes } from '@/lib/fabricator/routes'
import { TIER3_MANUFACTURING_ALGORITHMS } from '@/lib/fabricator/manufacturingAuthority'
import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings'

/**
 * Admin sidebar → Manufacturing Config hub.
 *
 * One registry drives the hub cards, so every admin-editable manufacturing
 * configurator stays reachable from `/admin?tab=manufacturing`. Keep this list
 * in sync with the routes in `App.tsx`; the reachability test asserts each href
 * resolves through `fabricatorRoutes` (no hand-typed strings that can drift).
 */
export type ManufacturingAdminLinkGroup = 'authority' | 'workshop' | 'library' | 'platform'

export interface ManufacturingAdminLink {
  id: string
  group: ManufacturingAdminLinkGroup
  label: string
  href: string
  /** What an admin can change on this page. */
  edits: string
  /** True when the page itself enforces an admin-only RPC/role gate. */
  adminOnly?: boolean
}

export const MANUFACTURING_ADMIN_GROUP_LABELS: Record<ManufacturingAdminLinkGroup, string> = {
  authority: 'Manufacturing authority & approvals',
  workshop: 'Workshop configurator',
  library: 'System packs, layouts & BOM',
  platform: 'Platform settings',
}

export const MANUFACTURING_ADMIN_LINKS: readonly ManufacturingAdminLink[] = [
  {
    id: 'approvals',
    group: 'authority',
    label: 'Manufacturing approvals',
    href: fabricatorRoutes.studioApprovals(),
    edits:
      'Approve / reject pending authority requests (saw kerf, trim cut and stock length are set per approval), one-click vendor catalogue approval, revoke active revisions.',
    adminOnly: true,
  },
  {
    id: 'hardener',
    group: 'authority',
    label: 'Hardener approvals',
    href: `${fabricatorRoutes.studioApprovals()}#approvals-hardener`,
    edits: 'Review hardener proposals, admin overrides and system-pack hardener applicability.',
    adminOnly: true,
  },
  {
    id: 'factory-admin',
    group: 'workshop',
    label: 'Factory admin (team & roles)',
    href: '/fabricator-admin',
    edits: 'Workshop members and factory roles (technical office, operator, technician, supervisor, manager).',
  },
  {
    id: 'system-packs',
    group: 'library',
    label: 'System packs library',
    href: fabricatorRoutes.studioDataProfiles(),
    edits: 'Browse vendor packs, create / archive custom packs, open a pack in the tuning studio.',
  },
  {
    id: 'tuning-studio',
    group: 'library',
    label: 'Tuning studio (profiles, cross-section, BOM rules)',
    href: fabricatorRoutes.studioData('tuning'),
    edits:
      'Per-pack profile names and roles, cross-section / DXF tuning, workshop BOM component requirements (hinges, rollers, handles, gaskets) for owned packs.',
  },
  {
    id: 'accessories',
    group: 'library',
    label: 'Accessories kits',
    href: fabricatorRoutes.studioDataAccessories(),
    edits: 'Hardware kits per system pack and workshop unit-price overrides used by the manufacturing BOM.',
  },
  {
    id: 'profile-studio',
    group: 'library',
    label: 'Custom profile studio',
    href: fabricatorRoutes.studioDataProfileStudio(),
    edits: 'Create custom profiles / packs without DXF.',
  },
  {
    id: 'patterns',
    group: 'library',
    label: 'Pattern library',
    href: fabricatorRoutes.studioData('patterns'),
    edits: 'Window / door layout patterns offered in design.',
  },
  {
    id: 'stock',
    group: 'library',
    label: 'Stock / remnants',
    href: fabricatorRoutes.studioDataStock(),
    edits: 'Stock lengths and remnant inventory the optimizer may consume (fail-closed when missing).',
  },
  {
    id: 'app-settings',
    group: 'platform',
    label: 'Platform configuration (app settings)',
    href: '/admin?tab=configuration',
    edits: 'Pricing, regional, feature flags, SLA and content settings.',
    adminOnly: true,
  },
]

export interface ManufacturingConstraint {
  id: string
  label: string
  value: string
  why: string
}

/**
 * Read-only guarantees. Shown in the hub so admins understand what is NOT
 * configurable, with the governing section. Never render these as inputs.
 */
export const MANUFACTURING_READ_ONLY_CONSTRAINTS: readonly ManufacturingConstraint[] = [
  {
    id: 'tier3-algorithms',
    label: 'Tier-3 manufacturing algorithms',
    value: TIER3_MANUFACTURING_ALGORITHMS.join(' | '),
    why: 'AICS-001 / FP-016: genetic or stochastic selections are advisory only and fail closed before production, CNC or QC (AlgorithmSelector + manufacturingAuthority).',
  },
  {
    id: 'authority-fail-closed',
    label: 'Production kerf / trim source',
    value: 'Approved manufacturing authority payload',
    why: 'AICS-001 / FP-023A: cutting evidence must match the approved authority (server RPC authority_machining_settings fails closed). Workshop tuning defaults are proposals that pre-fill an approval — they never bypass it.',
  },
  {
    id: 'cut-ledger',
    label: 'Cut-ledger identity',
    value: 'Derived from the saved design revision',
    why: 'Yilmaz / production exports reconcile the cut list to the saved design; mismatches block export (PR #122 batches).',
  },
  {
    id: 'stock-fail-closed',
    label: 'Stock acknowledgement',
    value: 'Required before Tier-3 cutting',
    why: 'Missing or unacknowledged stock blocks optimization instead of silently defaulting.',
  },
  {
    id: 'intelligence-gate',
    label: 'Adaptive intelligence',
    value: 'Behind IntelligenceGate',
    why: 'AICS-001: no advisory inference in execution paths; adaptive features cannot be toggled into Tier-3 from admin UI.',
  },
  {
    id: 'platform-defaults',
    label: 'Platform defaults (code)',
    value: `kerf ${PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm} mm · trim ${PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm} mm · remnant ≥ ${PLATFORM_MANUFACTURING_DEFAULTS.minimumReusableLengthMm} mm`,
    why: 'FP-023A named profile fallback used when no approval, machine or system-pack override exists. Change via code review, not admin UI.',
  },
]
