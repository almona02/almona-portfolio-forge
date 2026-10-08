/**
 * Seed local Supabase for Admin Approvals Playwright chain.
 *
 * Creates customer + admin users, one caluminium-ps project/position.
 * Does NOT insert manufacturing authority (admin must approve via UI).
 *
 *   npx tsx scripts/e2e-seed-admin-approvals-chain.ts
 *
 * Env (optional overrides):
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD — customer
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD — admin
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const customerEmail = process.env.E2E_USER_EMAIL?.trim() || 'e2e.customer@almona.local';
const customerPassword = process.env.E2E_USER_PASSWORD?.trim() || 'E2eCustomer!pass1';
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim() || 'e2e.admin@almona.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim() || 'E2eAdmin!pass1';

const PROJECT_ID = 'a2000000-5466-4000-8000-000000000001';
const POSITION_ID = 'a2000000-5466-4000-8000-000000000002';

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

async function ensureUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  password: string,
  role: 'customer' | 'admin',
  fullName: string,
): Promise<string> {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  let userId = listed?.users?.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      console.error('createUser failed', email, error);
      process.exit(1);
    }
    userId = data.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }

  const { error: profileErr } = await admin.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    role: 'customer',
  });
  if (profileErr) {
    console.warn('profiles upsert warning', profileErr.message);
  }

  // Elevate admin via direct postgres (privilege trigger blocks PostgREST role writes).
  if (role === 'admin') {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString:
        process.env.SUPABASE_DB_URL ||
        'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    });
    try {
      await client.connect();
      await client.query(`UPDATE public.profiles SET role = 'admin', full_name = $2 WHERE id = $1`, [
        userId,
        fullName,
      ]);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
  return userId;
}

async function main() {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const customerId = await ensureUser(
    admin,
    customerEmail,
    customerPassword,
    'customer',
    'E2E Customer',
  );
  const adminId = await ensureUser(admin, adminEmail, adminPassword, 'admin', 'E2E Admin');

  // Clear any prior authority / requests for a clean UI path
  await admin
    .from('fabricator_manufacturing_approval_requests')
    .delete()
    .eq('position_id', POSITION_ID);
  await admin
    .from('fabricator_manufacturing_authority_revisions')
    .delete()
    .eq('system_pack_id', 'caluminium-ps');

  const { error: projectErr } = await admin.from('fabricator_projects_v2').upsert({
    id: PROJECT_ID,
    owner_user_id: customerId,
    project_code: 'ADM-E2E-66',
    project_name: 'Admin Approvals E2E',
    client_name: 'E2E',
    system_pack_id: 'caluminium-ps',
    status: 'design',
    meta: { fixture: 'admin-approvals-e2e' },
  });
  if (projectErr) {
    console.error('project upsert failed', projectErr);
    process.exit(1);
  }

  const windowUnit = {
    id: POSITION_ID,
    type: 'sliding_window_2sash',
    systemPackId: 'caluminium-ps',
    overallWidth: 1200,
    overallHeight: 1400,
    quantity: 1,
    grid: slidingGrid,
    components: [
      {
        id: 'c-frame',
        type: 'frame',
        profile: { id: 'PS-6601-FRAME', name: 'PS Frame', costPerMeter: 185 },
      },
      {
        id: 'c-sash',
        type: 'sash',
        profile: { id: 'PS-5600-SASH', name: 'PS Sash', costPerMeter: 155 },
      },
    ],
  };

  const { error: poseErr } = await admin.from('fabricator_positions_v2').upsert({
    id: POSITION_ID,
    project_id: PROJECT_ID,
    owner_user_id: customerId,
    order_number: 'ADM-E2E',
    pos_number: '1',
    type: 'sliding_window_2sash',
    overall_width_mm: 1200,
    overall_height_mm: 1400,
    color: 'White',
    system_pack_id: 'caluminium-ps',
    status: 'design',
    quantity: 1,
    qc_revision: 1,
    grid: slidingGrid,
    components: windowUnit.components,
    window_unit: windowUnit,
  });
  if (poseErr) {
    console.error('pose upsert failed', poseErr);
    process.exit(1);
  }

  console.log(`E2E_USER_EMAIL=${customerEmail}`);
  console.log(`E2E_USER_PASSWORD=${customerPassword}`);
  console.log(`E2E_ADMIN_EMAIL=${adminEmail}`);
  console.log(`E2E_ADMIN_PASSWORD=${adminPassword}`);
  console.log(`E2E_ADMIN_USER_ID=${adminId}`);
  console.log(`E2E_APPROVALS_PROJECT_ID=${PROJECT_ID}`);
  console.log(`E2E_APPROVALS_POSITION_ID=${POSITION_ID}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
