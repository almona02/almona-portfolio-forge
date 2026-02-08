-- migrations/074_fabricator_v2_backfill_constitutional.sql
-- Constitutional backfill from Fabricator v1 -> v2 with cryptographic chain entries
--
-- Guarantees:
-- - Append-only migration chain (public.fabricator_migration_chain)
-- - Deterministic constitutional hashes for v2 rows
-- - Fails closed if re-executed (no partial replays)
--
BEGIN;
-- ============================================================================
-- Guardrails: ensure prerequisites and prevent re-execution
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'fabricator_migration_chain'
) THEN RAISE EXCEPTION 'Missing fabricator_migration_chain. Run migrations/073_fabricator_v2_constitutional_chain.sql first.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'fabricator_projects_v2'
) THEN RAISE EXCEPTION 'Missing fabricator_projects_v2. Run migrations/070_fabricator_v2_schema.sql first.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'fabricator_positions_v2'
) THEN RAISE EXCEPTION 'Missing fabricator_positions_v2. Run migrations/070_fabricator_v2_schema.sql first.';
END IF;
-- Append-only: refuse re-execution if any chain rows already exist
IF EXISTS (
  SELECT 1
  FROM public.fabricator_migration_chain
  LIMIT 1
) THEN RAISE EXCEPTION 'Constitutional backfill already executed (fabricator_migration_chain is non-empty). Re-execution is forbidden.';
END IF;
-- Append-only: refuse if v2 already contains rows (indicates partial run or manual inserts)
IF EXISTS (
  SELECT 1
  FROM public.fabricator_projects_v2
  LIMIT 1
)
OR EXISTS (
  SELECT 1
  FROM public.fabricator_positions_v2
  LIMIT 1
) THEN RAISE EXCEPTION 'fabricator_*_v2 tables are not empty. Backfill must run on empty v2 tables.';
END IF;
END $$;
-- ============================================================================
-- 1) Backfill projects (preserve IDs) + chain entries
-- ============================================================================
WITH inserted_projects AS (
  INSERT INTO public.fabricator_projects_v2 (
      id,
      owner_user_id,
      project_code,
      project_name,
      client_name,
      site_name,
      currency,
      region,
      system_pack_id,
      status,
      meta,
      tier,
      deterministic,
      constitutional_hash,
      audit_trail,
      last_validated_at,
      created_at,
      updated_at
    )
  SELECT p.id,
    p.owner_user_id,
    p.project_code,
    p.project_name,
    p.client_name,
    p.site_name,
    p.currency,
    p.region,
    p.system_pack_id,
    p.status,
    COALESCE(p.meta, '{}'::jsonb),
    'Tier 3',
    TRUE,
    encode(digest(row_to_json(p)::text, 'sha256'), 'hex'),
    jsonb_build_array(
      jsonb_build_object(
        'type',
        'legacy_migration',
        'source_table',
        'fabricator_projects',
        'source_id',
        p.id,
        'validated_at',
        NOW(),
        'constitutional_version',
        'AICS-001_v1.0.0'
      )
    ),
    NOW(),
    p.created_at,
    p.updated_at
  FROM public.fabricator_projects p
  WHERE p.owner_user_id IS NOT NULL
  RETURNING *
)
INSERT INTO public.fabricator_migration_chain (
    owner_user_id,
    project_id,
    source_table,
    source_id,
    source_entity,
    source_hash,
    target_table,
    target_id,
    target_hash,
    constitutional_metadata
  )
SELECT p.owner_user_id,
  p.id,
  'fabricator_projects',
  p.id,
  row_to_json(p)::jsonb,
  encode(digest(row_to_json(p)::text, 'sha256'), 'hex'),
  'fabricator_projects_v2',
  ip.id,
  encode(digest(row_to_json(ip)::text, 'sha256'), 'hex'),
  jsonb_build_object(
    'migration_type',
    'project_consolidation',
    'validation_status',
    'verified',
    'constitutional_version',
    'AICS-001_v1.0.0'
  )
FROM public.fabricator_projects p
  JOIN inserted_projects ip ON ip.id = p.id;
-- ============================================================================
-- 2) Backfill positions (preserve IDs) + chain entries
-- ============================================================================
WITH inserted_positions AS (
  INSERT INTO public.fabricator_positions_v2 (
      id,
      project_id,
      owner_user_id,
      order_number,
      pos_number,
      type,
      overall_width_mm,
      overall_height_mm,
      color,
      glazing,
      system_pack_id,
      status,
      quantity,
      position_meta,
      meta,
      optimization,
      grid,
      components,
      hardware,
      selected_preset,
      window_unit,
      tier,
      deterministic,
      constitutional_hash,
      audit_trail,
      last_validated_at,
      created_at,
      updated_at
    )
  SELECT pos.id,
    pos.project_id,
    pos.owner_user_id,
    pos.order_number,
    pos.pos_number,
    pos.type,
    pos.overall_width_mm,
    pos.overall_height_mm,
    pos.color,
    COALESCE(pos.glazing, '{}'::jsonb),
    COALESCE(pos.system_pack_id, proj.system_pack_id),
    pos.status,
    pos.quantity,
    COALESCE(pos.position_meta, '{}'::jsonb),
    COALESCE(pos.meta, '{}'::jsonb),
    pos.optimization,
    COALESCE(pos.grid, '{}'::jsonb),
    COALESCE(pos.components, '[]'::jsonb),
    COALESCE(pos.hardware, '{}'::jsonb),
    pos.selected_preset,
    -- Deterministic canonical payload capturing v1 state
    jsonb_build_object(
      'id',
      pos.id,
      'projectId',
      pos.project_id,
      'orderNumber',
      pos.order_number,
      'positionMeta',
      COALESCE(pos.position_meta, '{}'::jsonb),
      'posNumber',
      pos.pos_number,
      'type',
      pos.type,
      'overallWidth',
      pos.overall_width_mm,
      'overallHeight',
      pos.overall_height_mm,
      'color',
      pos.color,
      'glazing',
      COALESCE(pos.glazing, '{}'::jsonb),
      'systemPackId',
      COALESCE(pos.system_pack_id, proj.system_pack_id),
      'components',
      COALESCE(pos.components, '[]'::jsonb),
      'grid',
      COALESCE(pos.grid, '{}'::jsonb),
      'hardware',
      COALESCE(pos.hardware, '{}'::jsonb),
      'selectedPreset',
      pos.selected_preset,
      'optimization',
      COALESCE(pos.optimization, '{}'::jsonb)
    ),
    'Tier 3',
    TRUE,
    encode(digest(row_to_json(pos)::text, 'sha256'), 'hex'),
    jsonb_build_array(
      jsonb_build_object(
        'type',
        'legacy_migration',
        'source_table',
        'fabricator_positions',
        'source_id',
        pos.id,
        'validated_at',
        NOW(),
        'constitutional_version',
        'AICS-001_v1.0.0'
      )
    ),
    NOW(),
    pos.created_at,
    pos.updated_at
  FROM public.fabricator_positions pos
    JOIN public.fabricator_projects proj ON proj.id = pos.project_id
  WHERE pos.owner_user_id IS NOT NULL
  RETURNING *
)
INSERT INTO public.fabricator_migration_chain (
    owner_user_id,
    project_id,
    source_table,
    source_id,
    source_entity,
    source_hash,
    target_table,
    target_id,
    target_hash,
    constitutional_metadata
  )
SELECT src.owner_user_id,
  src.project_id,
  'fabricator_positions',
  src.id,
  row_to_json(src)::jsonb,
  encode(digest(row_to_json(src)::text, 'sha256'), 'hex'),
  'fabricator_positions_v2',
  ip.id,
  encode(digest(row_to_json(ip)::text, 'sha256'), 'hex'),
  jsonb_build_object(
    'migration_type',
    'position_consolidation',
    'validation_status',
    'verified',
    'constitutional_version',
    'AICS-001_v1.0.0'
  )
FROM public.fabricator_positions src
  JOIN inserted_positions ip ON ip.id = src.id;
COMMIT;