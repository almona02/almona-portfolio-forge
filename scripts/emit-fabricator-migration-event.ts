#!/usr/bin/env ts-node
/**
 * Emit human-verified Fabricator migration events (service-side).
 *
 * Responsibilities:
 * - Validate fabricator_migration_chain integrity (cryptographic recompute + linkage)
 * - Compute migration certificate payload + certificate_hash
 * - Emit RealityOS migration completion event via DB function realityos_record_event()
 * - Insert append-only certificate row referencing chain head + RealityOS anchor
 *
 * Usage:
 *   DATABASE_URL=postgres://... \
 *   OPERATOR_ID=operator_001 \
 *   COMPLETION_PHOTO_HASH=<sha256hex> \
 *   ts-node scripts/emit-fabricator-migration-event.ts
 */

import { Client } from 'pg';

type ChainIntegrityResult = {
  total_rows: number;
  link_breaks: number;
  hash_mismatches: number;
  head_hash: string | null;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const operatorId = process.env.OPERATOR_ID || 'operator_unknown';
  const completionPhotoHash = process.env.COMPLETION_PHOTO_HASH;

  if (!databaseUrl) {
    console.error('DATABASE_URL env var required');
    process.exit(1);
  }
  if (!completionPhotoHash || !/^[a-f0-9]{64}$/i.test(completionPhotoHash)) {
    console.error('COMPLETION_PHOTO_HASH env var required (SHA-256 hex, 64 chars)');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    // 1) Verify chain integrity (linkage + recompute hash)
    const integritySql = `
      WITH ordered AS (
        SELECT
          chain_position,
          owner_user_id,
          project_id,
          source_table,
          source_id,
          target_table,
          target_id,
          source_hash,
          target_hash,
          constitutional_metadata,
          migration_timestamp,
          previous_hash,
          migration_hash,
          lag(migration_hash) OVER (ORDER BY chain_position) AS expected_previous_hash,
          encode(
            digest(
              COALESCE(previous_hash, '') || '|' || jsonb_build_object(
                'owner_user_id', owner_user_id,
                'project_id', project_id,
                'source_table', source_table,
                'source_id', source_id,
                'target_table', target_table,
                'target_id', target_id,
                'source_hash', source_hash,
                'target_hash', target_hash,
                'migration_timestamp', migration_timestamp,
                'constitutional_metadata', constitutional_metadata,
                'previous_hash', previous_hash
              )::text,
              'sha256'
            ),
            'hex'
          ) AS expected_hash
        FROM public.fabricator_migration_chain
        ORDER BY chain_position
      )
      SELECT
        (SELECT count(*) FROM ordered) AS total_rows,
        (SELECT count(*) FROM ordered WHERE chain_position = 1 AND previous_hash IS NOT NULL) +
        (SELECT count(*) FROM ordered WHERE chain_position > 1 AND previous_hash IS DISTINCT FROM expected_previous_hash) AS link_breaks,
        (SELECT count(*) FROM ordered WHERE migration_hash IS DISTINCT FROM expected_hash) AS hash_mismatches,
        (SELECT migration_hash FROM ordered ORDER BY chain_position DESC LIMIT 1) AS head_hash;
    `;

    const integrityRes = await client.query<ChainIntegrityResult>(integritySql);
    const integrity = integrityRes.rows[0];
    if (!integrity || integrity.total_rows === 0) {
      throw new Error('fabricator_migration_chain is empty; cannot emit migration completion event.');
    }
    if (integrity.link_breaks > 0 || integrity.hash_mismatches > 0) {
      throw new Error(
        `Migration chain integrity failed. link_breaks=${integrity.link_breaks}, hash_mismatches=${integrity.hash_mismatches}`
      );
    }

    // 2) Build certificate payload + certificate_hash deterministically in DB
    const certificateSql = `
      WITH chain_head AS (
        SELECT migration_hash AS head_hash
        FROM public.fabricator_migration_chain
        ORDER BY chain_position DESC
        LIMIT 1
      ),
      counts AS (
        SELECT
          (SELECT count(*) FROM public.fabricator_projects_v2) AS projects_v2,
          (SELECT count(*) FROM public.fabricator_positions_v2) AS positions_v2,
          (SELECT count(*) FROM public.fabricator_projects) AS projects_v1,
          (SELECT count(*) FROM public.fabricator_positions) AS positions_v1
      ),
      latest_drift AS (
        SELECT drift_rate, mismatch_count, sample_size, created_at
        FROM public.fabricator_dual_write_consistency_reports
        ORDER BY created_at DESC
        LIMIT 1
      ),
      payload AS (
        SELECT jsonb_build_object(
          'migration_id', 'fabricator_v1_to_v2_cutover',
          'source_tables', jsonb_build_array('fabricator_projects', 'fabricator_positions'),
          'target_tables', jsonb_build_array('fabricator_projects_v2', 'fabricator_positions_v2'),
          'row_counts', jsonb_build_object(
            'projects_v1', counts.projects_v1,
            'positions_v1', counts.positions_v1,
            'projects_v2', counts.projects_v2,
            'positions_v2', counts.positions_v2
          ),
          'cryptographic_chain_head', chain_head.head_hash,
          'validation_status', 'valid',
          'constitutional_health_score', 100,
          'latest_drift', (
            SELECT CASE
              WHEN latest_drift.created_at IS NULL THEN NULL
              ELSE jsonb_build_object(
                'drift_rate', latest_drift.drift_rate,
                'mismatch_count', latest_drift.mismatch_count,
                'sample_size', latest_drift.sample_size,
                'checked_at', latest_drift.created_at
              )
            END
            FROM latest_drift
          ),
          'generated_at', NOW(),
          'valid_until', NOW() + interval '30 days'
        ) AS certificate_payload
        FROM chain_head, counts
      )
      SELECT
        payload.certificate_payload,
        encode(digest(payload.certificate_payload::text, 'sha256'), 'hex') AS certificate_hash,
        (payload.certificate_payload->>'cryptographic_chain_head')::text AS chain_head_hash,
        (payload.certificate_payload->>'valid_until')::timestamptz AS valid_until
      FROM payload;
    `;

    const certRes = await client.query(certificateSql);
    const certificatePayload = certRes.rows[0]?.certificate_payload;
    const certificateHash = certRes.rows[0]?.certificate_hash as string | undefined;
    const chainHeadHash = certRes.rows[0]?.chain_head_hash as string | undefined;
    const validUntil = certRes.rows[0]?.valid_until as string | undefined;

    if (!certificateHash || !chainHeadHash || !validUntil) {
      throw new Error('Failed to construct migration certificate payload.');
    }

    // 3) Emit RealityOS migration completion event (append-only)
    const recordedAt = new Date().toISOString();
    const entityId = `fabricator_migration_complete_${chainHeadHash.slice(0, 16)}`;
    const verticalId = 'almona_vertical';

    const proof = {
      verified_by: operatorId,
      timestamp: recordedAt,
      location: null,
      photoHashes: [completionPhotoHash],
    };

    const payload = {
      almona_event_type: 'FabricatorMigrationCompleted',
      entity_data: {
        migrationId: 'fabricator_v1_to_v2_cutover',
        chainHeadHash,
        certificateHash,
      },
      human_verification_required: true,
      constitutional_note:
        'Fabricator migration completion event. Append-only RealityOS ledger anchor for event-derived mode.',
    };

    const emitSql = `
      SELECT * FROM public.realityos_record_event(
        'ON'::core_event_type,
        $1::varchar,
        $2::varchar,
        $3::jsonb,
        $4::jsonb,
        $5::timestamptz
      );
    `;
    const emitRes = await client.query(emitSql, [entityId, verticalId, proof, payload, recordedAt]);
    const realityEventHash = emitRes.rows[0]?.event_hash as string | undefined;

    if (!realityEventHash) {
      throw new Error('Failed to emit RealityOS migration completion event.');
    }

    // 4) Insert append-only certificate row (references chain head + RealityOS anchor)
    const insertCertSql = `
      INSERT INTO public.fabricator_migration_certificates (
        certificate_hash,
        chain_head_hash,
        reality_os_event_hash,
        reality_os_recorded_at,
        migration_summary,
        valid_until
      ) VALUES ($1::char(64), $2::char(64), $3::char(64), $4::timestamptz, $5::jsonb, $6::timestamptz)
      RETURNING id;
    `;
    const insRes = await client.query(insertCertSql, [
      certificateHash,
      chainHeadHash,
      realityEventHash,
      recordedAt,
      certificatePayload,
      validUntil,
    ]);

    console.log('Migration completion emitted successfully.');
    console.log(JSON.stringify({
      chainHeadHash,
      certificateHash,
      realityEventHash,
      certificateId: insRes.rows[0]?.id,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

