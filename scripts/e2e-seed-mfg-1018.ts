/**
 * Seed local Supabase for Playwright 10/18/>100-cut UI chain.
 *
 * Usage (local Supabase running, #54 seed applied):
 *   E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npx tsx scripts/e2e-seed-mfg-1018.ts
 *
 * Prints E2E_MFG_PROJECT_ID for the Playwright spec.
 */
import { createClient } from '@supabase/supabase-js';

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

  // Prefer deterministic owner UUID used in SQL fixtures when creating via SQL;
  // when Auth creates a user, use that id.
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
    system_pack_id: 'caluminium-ps',
    status: 'measuring',
    meta: { fixture: 'mfg-e2e-1018' },
  });
  if (projectErr) {
    console.error('project upsert failed', projectErr);
    process.exit(1);
  }

  // Clear prior poses for this project
  await admin.from('fabricator_positions_v2').delete().eq('project_id', PROJECT_ID);

  for (let i = 0; i < 10; i++) {
    const quantity = i < 8 ? 2 : 1;
    const poseId = `a1000000-1018-4000-8000-${String(i + 1).padStart(12, '0')}`;
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
      system_pack_id: 'caluminium-ps',
      status: 'design',
      quantity,
      qc_revision: 1,
      grid: slidingGrid,
      components: [],
      window_unit: {
        id: poseId,
        type: 'sliding_window_2sash',
        systemPackId: 'caluminium-ps',
        overallWidth: 1200,
        overallHeight: 1400,
        quantity,
        grid: slidingGrid,
        components: [],
      },
    });
    if (error) {
      console.error(`pose ${i + 1} insert failed`, error);
      process.exit(1);
    }
  }

  console.log(`E2E_MFG_PROJECT_ID=${PROJECT_ID}`);
  console.log(`E2E_USER_ID=${ownerId}`);
  console.log('Seeded 10 positions (18 units) for caluminium-ps sliding.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
