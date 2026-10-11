/**
 * Seed local Supabase for Playwright 10/18/>100-cut UI chain.
 *
 * Usage (local Supabase running; optional authority via
 * scripts/e2e-seed-manufacturing-authority-local.sql — not a migration):
 *   E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npx tsx scripts/e2e-seed-mfg-1018.ts
 *
 * Prints E2E_MFG_PROJECT_ID for the Playwright spec.
 *
 * Coupling note: fabricator-measure-design-reload owns pose 1 and SAVES it, while
 * fabricator-project-1018-cut-chain aggregates all 10 poses. Running both in one
 * session is therefore order dependent - re-seed between the two runs, or give each
 * spec its own seeded project before running them as a single suite.
 *
 * Poses are seeded WITH their saved cut ledger. The pooled cutting estimate
 * (optimizeProjectEstimate) is fail-closed and refuses any position whose
 * saved ledger length differs from countRequiredProfilePieces, so a fixture
 * with empty components can never satisfy the documented BOM -> optimize flow.
 * The ledger below follows the member breakdown documented in
 * src/lib/fabricator/bom/bomQualification.ts: frame 4 + sash perimeter 4/sash
 * + interlock (cols-1) + glazing bead 4/sash + sliding track pair 2.
 */
import { createClient } from '@supabase/supabase-js';
import { SYSTEM_PACKS } from '../src/data/systemPacks';
import { countRequiredProfilePieces } from '../src/lib/fabricator/bom/bomQualification';
import { PLATFORM_MANUFACTURING_DEFAULTS } from '../src/lib/fabricator/ManufacturingSettings';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  // Default local `supabase start` service role (public demo key)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const email = process.env.E2E_USER_EMAIL?.trim();
const password = process.env.E2E_USER_PASSWORD?.trim();
if (!email || !password) {
  console.error('Set E2E_USER_EMAIL and E2E_USER_PASSWORD');
  process.exit(1);
}

const PROJECT_ID = 'a1000000-1018-4000-8000-000000000001';
const SYSTEM_PACK_ID = 'caluminium-ps';

const slidingGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: '0-0', row: 0, col: 0, type: 'sash' },
    { id: '0-1', row: 0, col: 1, type: 'sash' },
  ],
  colWidths: [1, 1],
  rowHeights: [1],
};

/**
 * Mirrors patternForLedgerCount in
 * src/lib/fabricator/production/ProjectOptimizationEstimate.ts (that module is
 * Vite-bound via import.meta.env and cannot load in this Node seed).
 * Keep in step with it if the saved-ledger contract changes.
 */
function ledgerPattern(position: any) {
  return {
    id: 'saved-ledger:' + position.id,
    name: 'Saved design ledger (estimate)',
    type: 'sliding',
    openingMechanism: { type: 'sliding' },
    gridSpec: position.grid,
    mullions: [],
    transoms: [],
  } as any;
}

/** 1200x1400 two-sash sliding member lengths, comfortably inside 6000 mm stock. */
const MEMBER_CUTS: Array<{ role: string; cuts: number[] }> = [
  { role: 'frame', cuts: [1150, 1150, 1350, 1350] },              // 4
  { role: 'sash', cuts: [590, 590, 1090, 1090, 590, 590, 1090, 1090] }, // 8
  { role: 'interlock', cuts: [1350] },                            // 1
  { role: 'bead', cuts: [540, 540, 1040, 1040, 540, 540, 1040, 1040] }, // 8
  { role: 'track', cuts: [1150, 1150] },                          // 2
];

/**
 * Resolve a ledger role to a real pack profile using the same precedence the app
 * itself uses (id -> profileRole -> specifications.bomRole), so the seeded ledger
 * references the genuine member profiles rather than a name guess.
 * Sliding-only roles are interlock and track; casement/fixed ledgers have neither.
 */
const ROLE_ALIASES: Record<string, string[]> = {
  frame: ['frame'],
  sash: ['sash'],
  interlock: ['interlock'],
  bead: ['bead', 'glazing_bead', 'glazing'],
  track: ['track', 'screen_track'],
};

function pickProfile(pack: any, role: string) {
  const profiles: any[] = pack?.profiles ?? [];
  const aliases = ROLE_ALIASES[role] ?? [role];
  const norm = (value: unknown) => String(value ?? '').toLowerCase();
  return (
    profiles.find((candidate) => aliases.includes(norm(candidate.profileRole))) ??
    profiles.find((candidate) => aliases.includes(norm(candidate.specifications?.bomRole))) ??
    profiles.find((candidate) => aliases.includes(norm(candidate.type))) ??
    profiles.find((candidate) => new RegExp(role, 'i').test(String(candidate.id ?? '') + ' ' + String(candidate.name ?? ''))) ??
    profiles[0]
  );
}

function buildLedger(pack: any) {
  const components = MEMBER_CUTS.map((member) => {
    const profile = pickProfile(pack, member.role);
    if (!profile?.id) throw new Error(`caluminium-ps pack has no profile for role ${member.role}`);
    return {
      id: `${member.role}-ledger`,
      type: member.role,
      profile,
      cuttingLengths: member.cuts.slice(),
    };
  });
  return components;
}

async function main() {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  let userId = listed?.users?.find((u) => u.email === email)?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'MFG E2E 1018' },
    });
    if (error || !data.user) {
      console.error('createUser failed', error);
      process.exit(1);
    }
    userId = data.user.id;
  }

  const ownerId = userId;

  const { error: profileErr } = await admin.from('profiles').upsert({
    id: ownerId,
    full_name: 'MFG E2E 1018',
    role: 'customer',
  });
  if (profileErr) {
    console.warn('profiles upsert warning', profileErr.message);
  }

  const { error: projectErr } = await admin.from('fabricator_projects_v2').upsert({
    id: PROJECT_ID,
    owner_user_id: ownerId,
    project_code: 'MFG-E2E-1018',
    project_name: 'MFG E2E 10/18 cuts',
    client_name: 'E2E',
    system_pack_id: SYSTEM_PACK_ID,
    status: 'measuring',
    meta: { fixture: 'mfg-e2e-1018' },
  });
  if (projectErr) {
    console.error('project upsert failed', projectErr);
    process.exit(1);
  }

  // Clear prior poses for this project
  await admin.from('fabricator_positions_v2').delete().eq('project_id', PROJECT_ID);

  const pack = SYSTEM_PACKS.find((candidate) => candidate.meta.id === SYSTEM_PACK_ID);
  if (!pack) {
    console.error(`SYSTEM_PACKS does not define ${SYSTEM_PACK_ID}; the estimate cannot resolve the pack.`);
    process.exit(1);
  }

  const roleMap: Record<string, string> = {};
  for (const member of MEMBER_CUTS) roleMap[member.role] = String(pickProfile(pack as any, member.role)?.id);
  console.log('ledger role -> pack profile: ' + JSON.stringify(roleMap));
  const distinct = new Set(Object.values(roleMap));
  if (distinct.size !== Object.keys(roleMap).length) {
    console.warn('WARNING: ledger roles did not resolve to distinct pack profiles: ' + JSON.stringify(roleMap));
  }

  for (let i = 0; i < 10; i++) {
    const quantity = i < 8 ? 2 : 1;
    const poseId = `a1000000-1018-4000-8000-${String(i + 1).padStart(12, '0')}`;
    const components = buildLedger(pack as any);

    const windowUnit = {
      id: poseId,
      posNumber: String(i + 1),
      type: 'sliding_window_2sash',
      systemPackId: SYSTEM_PACK_ID,
      overallWidth: 1200,
      overallHeight: 1400,
      quantity,
      grid: slidingGrid,
      components,
    };

    // Self-check against the estimate contract using only Node-safe modules.
    const expected = countRequiredProfilePieces(windowUnit as any, ledgerPattern(windowUnit) as any);
    const actual = components.reduce((sum, component) => sum + component.cuttingLengths.length, 0);
    if (actual !== expected) {
      console.error(`pose ${i + 1}: ledger ${actual}/${expected} pieces would be rejected by the estimate contract`);
      process.exit(1);
    }
    for (const component of components) {
      const specs = (component.profile as any).specifications ?? {};
      const stock = Number((component.profile as any).barLength ?? specs.barLength ?? 6000);
      const kerf = Number(specs.sawKerf ?? PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm);
      const trim = Number(specs.barEndTrim ?? PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm);
      const allowance = Number((component.profile as any).cuttingAllowance ?? 0);
      const longest = Math.max(...component.cuttingLengths);
      if (!(longest + allowance + kerf + trim <= stock)) {
        console.error(`pose ${i + 1}: ${component.type} cut ${longest} does not fit stock ${stock} after kerf/trim`);
        process.exit(1);
      }
    }

    const { error } = await admin.from('fabricator_positions_v2').insert({
      id: poseId,
      project_id: PROJECT_ID,
      owner_user_id: ownerId,
      order_number: 'MFG-E2E',
      pos_number: String(i + 1),
      type: 'sliding_window_2sash',
      overall_width_mm: 1200,
      overall_height_mm: 1400,
      color: 'White',
      system_pack_id: SYSTEM_PACK_ID,
      status: 'design',
      quantity,
      qc_revision: 1,
      grid: slidingGrid,
      components,
      window_unit: windowUnit,
    });
    if (error) {
      console.error(`pose ${i + 1} insert failed`, error);
      process.exit(1);
    }
    console.log(`pose ${i + 1}: ledger ${actual} pieces / ${components.length} components (qty ${quantity})`);
  }

  console.log(`E2E_MFG_PROJECT_ID=${PROJECT_ID}`);
  console.log(`E2E_USER_ID=${ownerId}`);
  console.log(`Seeded 10 positions (18 units) for ${SYSTEM_PACK_ID} sliding with complete saved ledgers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});