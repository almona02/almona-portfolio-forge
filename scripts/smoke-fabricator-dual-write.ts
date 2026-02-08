#!/usr/bin/env ts-node
/**
 * Smoke test: Fabricator dual-write mirroring (v2 -> v1)
 *
 * This script is intended for STAGING. It will INSERT test rows into:
 * - public.fabricator_projects_v2
 * - public.fabricator_positions_v2
 *
 * Then it verifies the v1 mirror rows exist:
 * - public.fabricator_projects
 * - public.fabricator_positions
 *
 * Safety:
 * - Requires ALLOW_DUAL_WRITE_SMOKE=true
 * - Marks inserted rows with status='test' and meta.smoke_test=true
 *
 * Usage:
 *   DATABASE_URL=postgres://... \
 *   OWNER_USER_ID=<uuid-of-existing-profiles-row> \
 *   ALLOW_DUAL_WRITE_SMOKE=true \
 *   ts-node scripts/smoke-fabricator-dual-write.ts
 */

import { Client } from 'pg';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var required`);
  return v;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function main() {
  const allow = process.env.ALLOW_DUAL_WRITE_SMOKE === 'true';
  if (!allow) {
    throw new Error('Refusing to run. Set ALLOW_DUAL_WRITE_SMOKE=true');
  }

  const databaseUrl = requireEnv('DATABASE_URL');
  const ownerUserId = requireEnv('OWNER_USER_ID');
  if (!isUuid(ownerUserId)) {
    throw new Error('OWNER_USER_ID must be a UUID (must exist in public.profiles)');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query('BEGIN');

    // Ensure dual-write is active for this session
    await client.query(`SELECT set_config('app.fabricator_dual_write_active', 'true', false);`);

    const projectCode = `TEST-DUALWRITE-${Date.now()}`;
    const posNumber = 'POS-TEST-1';

    // Insert v2 project
    const insertProjectRes = await client.query<{ id: string }>(
      `
      INSERT INTO public.fabricator_projects_v2 (
        owner_user_id,
        project_code,
        project_name,
        client_name,
        system_pack_id,
        status,
        meta
      ) VALUES (
        $1::uuid,
        $2::text,
        $2::text,
        'Smoke Test Client',
        'rock60',
        'test',
        jsonb_build_object('smoke_test', true, 'created_by', 'smoke-fabricator-dual-write.ts')
      )
      RETURNING id;
      `,
      [ownerUserId, projectCode],
    );

    const v2ProjectId = insertProjectRes.rows[0]?.id;
    if (!v2ProjectId) throw new Error('Failed to insert v2 project');

    // Insert v2 position
    const insertPosRes = await client.query<{ id: string }>(
      `
      INSERT INTO public.fabricator_positions_v2 (
        project_id,
        owner_user_id,
        order_number,
        pos_number,
        type,
        overall_width_mm,
        overall_height_mm,
        color,
        status,
        quantity,
        position_meta,
        meta,
        grid,
        components,
        hardware,
        selected_preset,
        window_unit
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::text,
        'fixed',
        1000,
        2000,
        'white',
        'test',
        1,
        jsonb_build_object('posNumber', $4, 'customer', 'Smoke Test Customer'),
        jsonb_build_object('smoke_test', true, 'poseId', $3 || '-pose-' || $4),
        '{}'::jsonb,
        '[]'::jsonb,
        '{}'::jsonb,
        NULL,
        jsonb_build_object(
          'id', gen_random_uuid(),
          'orderNumber', $3,
          'projectCode', $3,
          'type', 'fixed',
          'overallWidth', 1000,
          'overallHeight', 2000,
          'positionMeta', jsonb_build_object('posNumber', $4, 'customer', 'Smoke Test Customer')
        )
      )
      RETURNING id;
      `,
      [v2ProjectId, ownerUserId, projectCode, posNumber],
    );

    const v2PosId = insertPosRes.rows[0]?.id;
    if (!v2PosId) throw new Error('Failed to insert v2 position');

    // Verify v1 mirror: project
    const v1ProjectRes = await client.query<{ id: string; project_code: string }>(
      `
      SELECT id, project_code
      FROM public.fabricator_projects
      WHERE id = $1::uuid AND owner_user_id = $2::uuid
      LIMIT 1;
      `,
      [v2ProjectId, ownerUserId],
    );
    if (v1ProjectRes.rows.length !== 1) {
      throw new Error('v1 mirror project not found (dual-write trigger failed)');
    }

    // Verify v1 mirror: position
    const v1PosRes = await client.query<{ id: string; project_id: string; pos_number: string; project_code: string }>(
      `
      SELECT id, project_id, pos_number, project_code
      FROM public.fabricator_positions
      WHERE id = $1::uuid AND owner_user_id = $2::uuid
      LIMIT 1;
      `,
      [v2PosId, ownerUserId],
    );
    if (v1PosRes.rows.length !== 1) {
      throw new Error('v1 mirror position not found (dual-write trigger failed)');
    }

    await client.query('COMMIT');

    console.log('✅ Dual-write smoke test passed.');
    console.log(
      JSON.stringify(
        {
          projectCode,
          v2ProjectId,
          v2PosId,
          notes: 'Rows inserted with status=test and meta.smoke_test=true (staging only).',
        },
        null,
        2,
      ),
    );
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

