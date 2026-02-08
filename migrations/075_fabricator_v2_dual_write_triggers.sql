-- migrations/075_fabricator_v2_dual_write_triggers.sql
-- Dual-write safety net (30-day window): mirror v2 -> v1
--
-- Goals:
-- - v2 is canonical write target; v1 is mirrored for rollback window
-- - conflict resolution: v2 wins (overwrite), but conflicts are logged
-- - dual-write can be disabled cleanly via DB GUC flag:
--     app.fabricator_dual_write_active = 'true' | 'false'
--   If not set, defaults to true (active).
--
-- Constitutional notes:
-- - Does NOT delete data (v2 deletes become v1 status/meta soft archive)
-- - Conflict logs are append-only into public.fabricator_migration_chain
--
BEGIN;

-- ============================================================================
-- 0) Preconditions
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_projects_v2') THEN
    RAISE EXCEPTION 'Missing fabricator_projects_v2. Run migrations/070_fabricator_v2_schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_positions_v2') THEN
    RAISE EXCEPTION 'Missing fabricator_positions_v2. Run migrations/070_fabricator_v2_schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_projects') THEN
    RAISE EXCEPTION 'Missing fabricator_projects (v1). Run migrations/009_fabricator_projects_and_team.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_positions') THEN
    RAISE EXCEPTION 'Missing fabricator_positions (v1). Run migrations/009_fabricator_projects_and_team.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_migration_chain') THEN
    RAISE EXCEPTION 'Missing fabricator_migration_chain. Run migrations/073_fabricator_v2_constitutional_chain.sql first.';
  END IF;
END $$;

-- ============================================================================
-- 1) Dual-write flag helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fabricator_dual_write_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.fabricator_dual_write_active', true), ''), 'true')::boolean;
$$;

COMMENT ON FUNCTION public.fabricator_dual_write_is_active() IS
  'Returns whether Fabricator v2->v1 dual-write mirroring is active. Controlled by DB setting app.fabricator_dual_write_active, default true if unset.';

-- ============================================================================
-- 2) Conflict logging into migration chain (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fabricator_log_dual_write_conflict(
  p_owner_user_id UUID,
  p_project_id UUID,
  p_source_table TEXT,
  p_source_id UUID,
  p_target_table TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_details JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Append-only evidence entry (target_hash/source_hash set to hashes of evidence payload)
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
    constitutional_metadata,
    migration_timestamp
  ) VALUES (
    p_owner_user_id,
    p_project_id,
    p_source_table,
    p_source_id,
    jsonb_build_object(
      'type', 'dual_write_conflict',
      'reason', p_reason,
      'details', COALESCE(p_details, '{}'::jsonb),
      'recorded_at', NOW()
    ),
    encode(digest(jsonb_build_object('reason', p_reason, 'details', COALESCE(p_details, '{}'::jsonb))::text, 'sha256'), 'hex'),
    p_target_table,
    p_target_id,
    encode(digest(jsonb_build_object('reason', p_reason, 'details', COALESCE(p_details, '{}'::jsonb))::text, 'sha256'), 'hex'),
    jsonb_build_object(
      'migration_type', 'dual_write_conflict',
      'tier', 'Tier 3',
      'deterministic', true,
      'constitutional_version', 'AICS-001_v1.0.0'
    ),
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Do not block production writes for logging failures; surface via NOTICE.
    RAISE NOTICE 'fabricator_log_dual_write_conflict failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.fabricator_log_dual_write_conflict(UUID, UUID, TEXT, UUID, TEXT, UUID, TEXT, JSONB) IS
  'Append-only logging of v2->v1 dual-write conflicts into fabricator_migration_chain. SECURITY DEFINER for reliable insertion.';

-- ============================================================================
-- 3) Mirror triggers: projects_v2 -> projects (v1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mirror_fabricator_projects_v2_to_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  IF NOT public.fabricator_dual_write_is_active() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Append-only behavior: do not delete v1; mark as archived and record evidence in meta.
    UPDATE public.fabricator_projects
       SET status = 'archived',
           meta = jsonb_set(COALESCE(meta, '{}'::jsonb), '{dual_write_deleted_in_v2_at}', to_jsonb(NOW()::text), true),
           updated_at = NOW()
     WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Detect potential conflict: v1 row updated after v2 updated_at (legacy write path)
  SELECT *
    INTO v_existing
    FROM public.fabricator_projects
   WHERE id = NEW.id;

  IF FOUND AND v_existing.updated_at IS NOT NULL AND NEW.updated_at IS NOT NULL AND v_existing.updated_at > NEW.updated_at THEN
    PERFORM public.fabricator_log_dual_write_conflict(
      NEW.owner_user_id,
      NEW.id,
      'fabricator_projects_v2',
      NEW.id,
      'fabricator_projects',
      NEW.id,
      'v1_updated_more_recent_than_v2',
      jsonb_build_object(
        'v1_updated_at', v_existing.updated_at,
        'v2_updated_at', NEW.updated_at,
        'project_code', NEW.project_code
      )
    );
  END IF;

  BEGIN
    INSERT INTO public.fabricator_projects (
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
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.owner_user_id,
      NEW.project_code,
      NEW.project_name,
      NEW.client_name,
      NEW.site_name,
      COALESCE(NEW.currency, 'EGP'),
      COALESCE(NEW.region, 'global'),
      NEW.system_pack_id,
      COALESCE(NEW.status, 'draft'),
      COALESCE(NEW.meta, '{}'::jsonb),
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      owner_user_id = EXCLUDED.owner_user_id,
      project_code = EXCLUDED.project_code,
      project_name = EXCLUDED.project_name,
      client_name = EXCLUDED.client_name,
      site_name = EXCLUDED.site_name,
      currency = EXCLUDED.currency,
      region = EXCLUDED.region,
      system_pack_id = EXCLUDED.system_pack_id,
      status = EXCLUDED.status,
      meta = EXCLUDED.meta,
      updated_at = EXCLUDED.updated_at;
  EXCEPTION
    WHEN unique_violation THEN
      -- Most likely: v1 global UNIQUE(project_code) collision across tenants
      PERFORM public.fabricator_log_dual_write_conflict(
        NEW.owner_user_id,
        NEW.id,
        'fabricator_projects_v2',
        NEW.id,
        'fabricator_projects',
        NEW.id,
        'unique_violation_on_v1_project_code',
        jsonb_build_object(
          'project_code', NEW.project_code,
          'note', 'v1 enforces global unique project_code; v2 enforces per-tenant uniqueness.'
        )
      );
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_fabricator_projects_v2_to_v1_ins ON public.fabricator_projects_v2;
CREATE TRIGGER trg_mirror_fabricator_projects_v2_to_v1_ins
  AFTER INSERT ON public.fabricator_projects_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_fabricator_projects_v2_to_v1();

DROP TRIGGER IF EXISTS trg_mirror_fabricator_projects_v2_to_v1_upd ON public.fabricator_projects_v2;
CREATE TRIGGER trg_mirror_fabricator_projects_v2_to_v1_upd
  AFTER UPDATE ON public.fabricator_projects_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_fabricator_projects_v2_to_v1();

DROP TRIGGER IF EXISTS trg_mirror_fabricator_projects_v2_to_v1_del ON public.fabricator_projects_v2;
CREATE TRIGGER trg_mirror_fabricator_projects_v2_to_v1_del
  AFTER DELETE ON public.fabricator_projects_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_fabricator_projects_v2_to_v1();

-- ============================================================================
-- 4) Mirror triggers: positions_v2 -> positions (v1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mirror_fabricator_positions_v2_to_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_project_code TEXT;
  v_customer TEXT;
BEGIN
  IF NOT public.fabricator_dual_write_is_active() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Append-only behavior: do not delete v1; mark as archived and record evidence.
    UPDATE public.fabricator_positions
       SET status = 'archived',
           meta = jsonb_set(COALESCE(meta, '{}'::jsonb), '{dual_write_deleted_in_v2_at}', to_jsonb(NOW()::text), true),
           updated_at = NOW()
     WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- If position is not attached to a project, we cannot mirror (v1 requires project_id NOT NULL).
  IF NEW.project_id IS NULL THEN
    PERFORM public.fabricator_log_dual_write_conflict(
      NEW.owner_user_id,
      NULL,
      'fabricator_positions_v2',
      NEW.id,
      'fabricator_positions',
      NEW.id,
      'missing_project_id_in_v2_position',
      jsonb_build_object('position_id', NEW.id)
    );
    RETURN NEW;
  END IF;

  -- Pull project_code/customer for v1 denormalized columns if available
  SELECT project_code
    INTO v_project_code
    FROM public.fabricator_projects_v2
   WHERE id = NEW.project_id;

  v_customer := COALESCE(
    NEW.position_meta->>'customer',
    NEW.meta->>'customer',
    NEW.window_unit->'positionMeta'->>'customer',
    NEW.window_unit->>'customer'
  );

  -- Detect potential conflict (legacy v1 write newer than v2)
  SELECT *
    INTO v_existing
    FROM public.fabricator_positions
   WHERE id = NEW.id;

  IF FOUND AND v_existing.updated_at IS NOT NULL AND NEW.updated_at IS NOT NULL AND v_existing.updated_at > NEW.updated_at THEN
    PERFORM public.fabricator_log_dual_write_conflict(
      NEW.owner_user_id,
      NEW.project_id,
      'fabricator_positions_v2',
      NEW.id,
      'fabricator_positions',
      NEW.id,
      'v1_updated_more_recent_than_v2',
      jsonb_build_object(
        'v1_updated_at', v_existing.updated_at,
        'v2_updated_at', NEW.updated_at,
        'pos_number', NEW.pos_number
      )
    );
  END IF;

  INSERT INTO public.fabricator_positions (
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
    optimization,
    -- v059 columns (conditionally present in schema; safe because migration added them)
    components,
    grid,
    hardware,
    selected_preset,
    project_code,
    customer,
    meta,
    window_type,
    overall_width,
    overall_height,
    updated_at,
    created_at
  ) VALUES (
    NEW.id,
    NEW.project_id,
    NEW.owner_user_id,
    COALESCE(NEW.order_number, NEW.window_unit->>'orderNumber', 'UNKNOWN'),
    COALESCE(NEW.pos_number, NEW.window_unit->>'posNumber', NEW.window_unit->'positionMeta'->>'posNumber', 'UNKNOWN'),
    COALESCE(NEW.type, NEW.window_unit->>'type', 'unknown'),
    COALESCE(NEW.overall_width_mm, NULLIF((NEW.window_unit->>'overallWidth')::int, 0)),
    COALESCE(NEW.overall_height_mm, NULLIF((NEW.window_unit->>'overallHeight')::int, 0)),
    COALESCE(NEW.color, NEW.window_unit->>'color', 'unknown'),
    COALESCE(NEW.glazing, '{}'::jsonb),
    NEW.system_pack_id,
    COALESCE(NEW.status, 'measuring'),
    COALESCE(NEW.quantity, 1),
    COALESCE(NEW.position_meta, '{}'::jsonb),
    NEW.optimization,
    COALESCE(NEW.components, '[]'::jsonb),
    COALESCE(NEW.grid, '{}'::jsonb),
    COALESCE(NEW.hardware, '{}'::jsonb),
    NEW.selected_preset,
    v_project_code,
    v_customer,
    COALESCE(NEW.meta, '{}'::jsonb),
    COALESCE(NEW.type, NEW.window_unit->>'type', 'unknown'),
    COALESCE(NEW.overall_width_mm, NULLIF((NEW.window_unit->>'overallWidth')::int, 0)),
    COALESCE(NEW.overall_height_mm, NULLIF((NEW.window_unit->>'overallHeight')::int, 0)),
    COALESCE(NEW.updated_at, NOW()),
    COALESCE(NEW.created_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    owner_user_id = EXCLUDED.owner_user_id,
    order_number = EXCLUDED.order_number,
    pos_number = EXCLUDED.pos_number,
    type = EXCLUDED.type,
    overall_width_mm = EXCLUDED.overall_width_mm,
    overall_height_mm = EXCLUDED.overall_height_mm,
    color = EXCLUDED.color,
    glazing = EXCLUDED.glazing,
    system_pack_id = EXCLUDED.system_pack_id,
    status = EXCLUDED.status,
    quantity = EXCLUDED.quantity,
    position_meta = EXCLUDED.position_meta,
    optimization = EXCLUDED.optimization,
    components = EXCLUDED.components,
    grid = EXCLUDED.grid,
    hardware = EXCLUDED.hardware,
    selected_preset = EXCLUDED.selected_preset,
    project_code = EXCLUDED.project_code,
    customer = EXCLUDED.customer,
    meta = EXCLUDED.meta,
    window_type = EXCLUDED.window_type,
    overall_width = EXCLUDED.overall_width,
    overall_height = EXCLUDED.overall_height,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_fabricator_positions_v2_to_v1_ins ON public.fabricator_positions_v2;
CREATE TRIGGER trg_mirror_fabricator_positions_v2_to_v1_ins
  AFTER INSERT ON public.fabricator_positions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_fabricator_positions_v2_to_v1();

DROP TRIGGER IF EXISTS trg_mirror_fabricator_positions_v2_to_v1_upd ON public.fabricator_positions_v2;
CREATE TRIGGER trg_mirror_fabricator_positions_v2_to_v1_upd
  AFTER UPDATE ON public.fabricator_positions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_fabricator_positions_v2_to_v1();

DROP TRIGGER IF EXISTS trg_mirror_fabricator_positions_v2_to_v1_del ON public.fabricator_positions_v2;
CREATE TRIGGER trg_mirror_fabricator_positions_v2_to_v1_del
  AFTER DELETE ON public.fabricator_positions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_fabricator_positions_v2_to_v1();

COMMIT;

