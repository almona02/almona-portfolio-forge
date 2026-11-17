-- Lane B: job-only routine version pins (local-authorized implementation).
-- Contract tip: da4bcb4a331175bce674291b6a3a802fdc7d8f84
-- Contract SHA-256: 806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed
-- Binding choices (non-policy): see docs/operations/service-workflow/LANE_B_BINDING_CHOICES.md
-- Does not authorize staging apply, merge, production, or FR-1 changes.

-- ---------------------------------------------------------------------------
-- 1) Job-level permanent first-start boundary (schema placement choice)
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_jobs
  ADD COLUMN IF NOT EXISTS work_started_boundary_at timestamptz;

COMMENT ON COLUMN public.service_jobs.work_started_boundary_at IS
  'Lane B: set once when any visit on this job first enters in_progress; never cleared. Freezes pin/replace/unpin.';

-- ---------------------------------------------------------------------------
-- 2) Job-only pin store (append-only history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_job_routine_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.service_routines(id),
  routine_version_id uuid NOT NULL REFERENCES public.service_routine_versions(id),
  status text NOT NULL CHECK (status IN ('active', 'replaced', 'unpinned')),
  reason text NOT NULL,
  pinned_by uuid NOT NULL REFERENCES public.profiles(id),
  pinned_at timestamptz NOT NULL DEFAULT now(),
  replaced_by_pin_id uuid REFERENCES public.service_job_routine_pins(id),
  unpinned_by uuid REFERENCES public.profiles(id),
  unpinned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_job_routine_pins_one_active_per_job
  ON public.service_job_routine_pins (job_id)
  WHERE status = 'active';

-- Future-proof partial unique: one active per (job_id, routine_id) when multi-routine lands.
-- Slice-1 cardinality remains one active per job via index above; this index is compatible.
CREATE UNIQUE INDEX IF NOT EXISTS service_job_routine_pins_one_active_per_job_routine
  ON public.service_job_routine_pins (job_id, routine_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS service_job_routine_pins_job_idx
  ON public.service_job_routine_pins (job_id, pinned_at DESC);

CREATE INDEX IF NOT EXISTS service_job_routine_pins_version_idx
  ON public.service_job_routine_pins (routine_version_id);

COMMENT ON TABLE public.service_job_routine_pins IS
  'Lane B job-only routine version pins. Visits read job pin; no visit dual-write.';

ALTER TABLE public.service_job_routine_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_job_routine_pins_select ON public.service_job_routine_pins;
CREATE POLICY service_job_routine_pins_select ON public.service_job_routine_pins
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_jobs j
    WHERE j.id = job_id
      AND admin_private.can_read_ticket_workflow(j.ticket_id)
      AND admin_private.caller_role() IN ('admin', 'support', 'technician')
  )
);

DROP POLICY IF EXISTS service_job_routine_pins_no_client_insert ON public.service_job_routine_pins;
CREATE POLICY service_job_routine_pins_no_client_insert ON public.service_job_routine_pins
FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS service_job_routine_pins_no_client_update ON public.service_job_routine_pins;
CREATE POLICY service_job_routine_pins_no_client_update ON public.service_job_routine_pins
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS service_job_routine_pins_no_client_delete ON public.service_job_routine_pins;
CREATE POLICY service_job_routine_pins_no_client_delete ON public.service_job_routine_pins
FOR DELETE TO authenticated USING (false);

REVOKE ALL ON TABLE public.service_job_routine_pins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.service_job_routine_pins TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Authz assert (closes contract §4.2 gap)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.assert_can_mutate_job_routine_pin(p_job_id uuid)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_job public.service_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found'
      USING ERRCODE = 'P0002', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  IF admin_private.caller_role() IS DISTINCT FROM 'admin'
     AND admin_private.caller_role() IS DISTINCT FROM 'support' THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  IF NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION admin_private.assert_can_mutate_job_routine_pin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_private.assert_can_mutate_job_routine_pin(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Work-start boundary helpers + visit trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.mark_job_routine_pin_work_started(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.service_jobs
  SET work_started_boundary_at = COALESCE(work_started_boundary_at, now()),
      updated_at = now()
  WHERE id = p_job_id
    AND work_started_boundary_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.trg_visit_in_progress_pin_freeze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  IF NEW.state = 'in_progress' AND (TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM 'in_progress') THEN
    PERFORM admin_private.mark_job_routine_pin_work_started(NEW.job_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_in_progress_pin_freeze ON public.service_job_visits;
CREATE TRIGGER trg_visit_in_progress_pin_freeze
  AFTER INSERT OR UPDATE OF state ON public.service_job_visits
  FOR EACH ROW
  EXECUTE FUNCTION admin_private.trg_visit_in_progress_pin_freeze();

-- ---------------------------------------------------------------------------
-- 5) Raise helpers (frozen DETAIL codes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.raise_job_pin_authz(
  p_ticket_id uuid,
  p_entity_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_job_routine_pin', p_entity_id, p_actor_id, p_actor_role,
    'routine_job_pin_authz_denied', NULL, NULL, NULL,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object('detail_code', 'routine_job_pin_authz_denied')
  );
  RAISE EXCEPTION 'Not permitted to mutate job routine pin'
    USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.raise_job_pin_denied(
  p_ticket_id uuid,
  p_entity_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_detail_code text,
  p_message text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_job_routine_pin', p_entity_id, p_actor_id, p_actor_role,
    'routine_job_pin_denied', NULL, NULL, NULL,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object('detail_code', p_detail_code)
  );
  RAISE EXCEPTION '%', p_message
    USING ERRCODE = '22023', DETAIL = p_detail_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Applicability / machine gate
-- Binding: machines.model is the family token; brand = manufacturer; catalog_model_id exact.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.assert_job_routine_pin_applicability(
  p_job_id uuid,
  p_routine_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket public.service_tickets%ROWTYPE;
  v_machine public.machines%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
  v_families text[];
  v_brand text;
  v_family text;
  v_ok boolean := false;
BEGIN
  SELECT t.* INTO v_ticket
  FROM public.service_tickets t
  JOIN public.service_jobs j ON j.ticket_id = t.id
  WHERE j.id = p_job_id;

  IF v_ticket.machine_id IS NULL THEN
    RAISE EXCEPTION 'Machine unlinked on ticket'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_machine_unlinked';
  END IF;

  SELECT * INTO v_machine FROM public.machines WHERE id = v_ticket.machine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Machine unlinked on ticket'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_machine_unlinked';
  END IF;

  IF v_machine.catalog_link_status IS DISTINCT FROM 'linked'
     OR nullif(btrim(COALESCE(v_machine.catalog_model_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Machine uncatalogued'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_machine_uncatalogued';
  END IF;

  SELECT * INTO v_routine FROM public.service_routines WHERE id = p_routine_id;
  v_families := admin_private.routine_family_set(p_routine_id);
  v_brand := lower(btrim(COALESCE(v_machine.brand, '')));
  v_family := btrim(COALESCE(v_machine.model, ''));

  IF nullif(v_family, '') IS NULL THEN
    RAISE EXCEPTION 'Machine uncatalogued'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_machine_uncatalogued';
  END IF;

  IF cardinality(v_routine.manufacturer_deny_list) > 0
     AND v_brand <> ''
     AND v_brand = ANY (SELECT lower(btrim(x)) FROM unnest(v_routine.manufacturer_deny_list) AS x) THEN
    RAISE EXCEPTION 'Applicability denied'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_applicability_denied';
  END IF;

  IF cardinality(v_routine.manufacturer_allow_list) > 0
     AND (
       v_brand = ''
       OR NOT (v_brand = ANY (SELECT lower(btrim(x)) FROM unnest(v_routine.manufacturer_allow_list) AS x))
     ) THEN
    RAISE EXCEPTION 'Applicability denied'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_applicability_denied';
  END IF;

  -- Exact catalog-model match (Lane A metadata).
  IF EXISTS (
    SELECT 1 FROM public.service_routine_applicability a
    WHERE a.routine_id = p_routine_id
      AND a.kind = 'catalog_model'
      AND a.value = btrim(v_machine.catalog_model_id)
      AND (a.value_family IS NULL OR a.value_family = ANY (v_families))
  ) THEN
    v_ok := true;
  END IF;

  -- Manufacturer + family coherence.
  IF NOT v_ok AND EXISTS (
    SELECT 1 FROM public.service_routine_applicability a
    WHERE a.routine_id = p_routine_id
      AND a.kind = 'manufacturer'
      AND lower(a.value) = v_brand
      AND a.value_family = ANY (v_families)
      AND v_family = ANY (v_families)
  ) THEN
    v_ok := true;
  END IF;

  -- Family token match via machines.model.
  IF NOT v_ok AND EXISTS (
    SELECT 1 FROM public.service_routine_applicability a
    WHERE a.routine_id = p_routine_id
      AND a.kind = 'family'
      AND a.value = v_family
  ) AND v_family = ANY (v_families) THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Applicability denied'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_applicability_denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Shared pin mutation core
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.lock_and_load_job_for_pin(p_job_id uuid)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_job public.service_jobs%ROWTYPE;
  v_hier record;
BEGIN
  -- Prefer B3 hierarchy lock when present; fallback FOR UPDATE on job.
  BEGIN
    SELECT * INTO v_hier FROM admin_private.lock_job_hierarchy(p_job_id);
    RETURN v_hier.job;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLSTATE = '42883' THEN
        NULL; -- function does not exist
      ELSE
        RAISE;
      END IF;
  END;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  -- Also lock parent ticket when present (serialize vs visit start when B3 lock absent).
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.load_pin_target_version(p_version_id uuid)
RETURNS public.service_routine_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  o_version public.service_routine_versions%ROWTYPE;
BEGIN
  SELECT * INTO o_version FROM public.service_routine_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found' USING ERRCODE = 'P0002';
  END IF;

  IF o_version.status = 'retired' THEN
    RAISE EXCEPTION 'Retired version cannot be newly pinned'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_version_retired';
  END IF;
  IF o_version.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Published version required'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_version_not_published';
  END IF;
  RETURN o_version;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Public RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_service_job_routine_pin(
  p_job_id uuid,
  p_routine_version_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs%ROWTYPE;
  v_version public.service_routine_versions%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
  v_old public.service_job_routine_pins%ROWTYPE;
  v_new public.service_job_routine_pins%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_detail text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  BEGIN
    v_job := admin_private.assert_can_mutate_job_routine_pin(p_job_id);
  EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE 'P0002' THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END;

  v_job := admin_private.lock_and_load_job_for_pin(p_job_id);

  IF v_actor.role NOT IN ('admin', 'support')
     OR NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  IF v_job.work_started_boundary_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pin locked after work start'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_locked_after_start';
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Reason required'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_reason_required';
  END IF;

  SELECT * INTO v_old
  FROM public.service_job_routine_pins
  WHERE job_id = p_job_id AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active pin to replace'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_cardinality';
  END IF;

  v_version := admin_private.load_pin_target_version(p_routine_version_id);
  SELECT * INTO v_routine FROM public.service_routines WHERE id = v_version.routine_id;

  BEGIN
    PERFORM admin_private.assert_job_routine_pin_applicability(p_job_id, v_routine.id);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    RAISE EXCEPTION '%', SQLERRM
      USING ERRCODE = '22023', DETAIL = COALESCE(nullif(v_detail, ''), 'routine_pin_applicability_denied');
  END;

  UPDATE public.service_job_routine_pins
  SET status = 'replaced'
  WHERE id = v_old.id;

  INSERT INTO public.service_job_routine_pins (
    job_id, routine_id, routine_version_id, status, reason, pinned_by
  ) VALUES (
    p_job_id, v_routine.id, v_version.id, 'active', v_reason, v_actor.uid
  ) RETURNING * INTO v_new;

  UPDATE public.service_job_routine_pins
  SET replaced_by_pin_id = v_new.id
  WHERE id = v_old.id;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_routine_pin', v_new.id, v_actor.uid, v_actor.role,
    'routine_job_pin_replaced', 'active', 'active', v_reason,
    jsonb_build_object(
      'job_id', p_job_id,
      'routine_id', v_routine.id,
      'routine_version_id', v_version.id,
      'reason', v_reason,
      'replaced_pin_id', v_old.id,
      'prior_routine_version_id', v_old.routine_version_id
    )
  );

  RETURN jsonb_build_object(
    'pin_id', v_new.id,
    'job_id', p_job_id,
    'routine_id', v_routine.id,
    'routine_version_id', v_version.id,
    'status', 'active',
    'reason', v_reason,
    'replaced_pin_id', v_old.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_service_job_routine(
  p_job_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs%ROWTYPE;
  v_old public.service_job_routine_pins%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  BEGIN
    v_job := admin_private.assert_can_mutate_job_routine_pin(p_job_id);
  EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE 'P0002' THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END;

  v_job := admin_private.lock_and_load_job_for_pin(p_job_id);

  IF v_actor.role NOT IN ('admin', 'support')
     OR NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  IF v_job.work_started_boundary_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pin locked after work start'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_locked_after_start';
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Reason required'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_reason_required';
  END IF;

  SELECT * INTO v_old
  FROM public.service_job_routine_pins
  WHERE job_id = p_job_id AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active pin to unpin'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_cardinality';
  END IF;

  UPDATE public.service_job_routine_pins
  SET status = 'unpinned',
      unpinned_by = v_actor.uid,
      unpinned_at = now()
  WHERE id = v_old.id
  RETURNING * INTO v_old;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_routine_pin', v_old.id, v_actor.uid, v_actor.role,
    'routine_job_unpinned', 'active', 'unpinned', v_reason,
    jsonb_build_object(
      'job_id', p_job_id,
      'routine_id', v_old.routine_id,
      'routine_version_id', v_old.routine_version_id,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'pin_id', v_old.id,
    'job_id', p_job_id,
    'routine_id', v_old.routine_id,
    'routine_version_id', v_old.routine_version_id,
    'status', 'unpinned',
    'reason', v_reason
  );
END;
$$;

-- Rewrite pin RPC with correct exception handling (no invalid diagnostics outside handler)
CREATE OR REPLACE FUNCTION public.pin_service_job_routine(
  p_job_id uuid,
  p_routine_version_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs%ROWTYPE;
  v_version public.service_routine_versions%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
  v_pin public.service_job_routine_pins%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_active uuid;
  v_detail text;
  v_msg text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  BEGIN
    v_job := admin_private.assert_can_mutate_job_routine_pin(p_job_id);
  EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE 'P0002' THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END;

  v_job := admin_private.lock_and_load_job_for_pin(p_job_id);

  IF v_actor.role NOT IN ('admin', 'support')
     OR NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to mutate job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  IF v_job.work_started_boundary_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pin locked after work start'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_locked_after_start';
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Reason required'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_reason_required';
  END IF;

  SELECT id INTO v_active
  FROM public.service_job_routine_pins
  WHERE job_id = p_job_id AND status = 'active'
  FOR UPDATE;
  IF v_active IS NOT NULL THEN
    RAISE EXCEPTION 'Active pin already exists; use replace'
      USING ERRCODE = '22023', DETAIL = 'routine_pin_cardinality';
  END IF;

  v_version := admin_private.load_pin_target_version(p_routine_version_id);
  SELECT * INTO v_routine FROM public.service_routines WHERE id = v_version.routine_id;

  BEGIN
    PERFORM admin_private.assert_job_routine_pin_applicability(p_job_id, v_routine.id);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL, v_msg = MESSAGE_TEXT;
    RAISE EXCEPTION '%', v_msg
      USING ERRCODE = '22023', DETAIL = COALESCE(nullif(v_detail, ''), 'routine_pin_applicability_denied');
  END;

  INSERT INTO public.service_job_routine_pins (
    job_id, routine_id, routine_version_id, status, reason, pinned_by
  ) VALUES (
    p_job_id, v_routine.id, v_version.id, 'active', v_reason, v_actor.uid
  ) RETURNING * INTO v_pin;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_routine_pin', v_pin.id, v_actor.uid, v_actor.role,
    'routine_job_pinned', NULL, 'active', v_reason,
    jsonb_build_object(
      'job_id', p_job_id,
      'routine_id', v_routine.id,
      'routine_version_id', v_version.id,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'pin_id', v_pin.id,
    'job_id', p_job_id,
    'routine_id', v_routine.id,
    'routine_version_id', v_version.id,
    'status', 'active',
    'reason', v_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_service_job_routine_pin(
  p_job_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs%ROWTYPE;
  v_pin public.service_job_routine_pins%ROWTYPE;
  v_version public.service_routine_versions%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor.role NOT IN ('admin', 'support', 'technician')
     OR NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to read job routine pin'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  SELECT * INTO v_pin
  FROM public.service_job_routine_pins
  WHERE job_id = p_job_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'job_id', p_job_id,
      'active', NULL,
      'work_started_boundary_at', v_job.work_started_boundary_at,
      'pin_locked', v_job.work_started_boundary_at IS NOT NULL
    );
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = v_pin.routine_version_id;
  SELECT * INTO v_routine FROM public.service_routines WHERE id = v_pin.routine_id;

  RETURN jsonb_build_object(
    'job_id', p_job_id,
    'work_started_boundary_at', v_job.work_started_boundary_at,
    'pin_locked', v_job.work_started_boundary_at IS NOT NULL,
    'active', jsonb_build_object(
      'pin_id', v_pin.id,
      'routine_id', v_pin.routine_id,
      'routine_code', v_routine.code,
      'routine_name_en', v_routine.name_en,
      'routine_version_id', v_pin.routine_version_id,
      'version_ordinal', v_version.version_ordinal,
      'version_status', v_version.status,
      'status', v_pin.status,
      'reason', v_pin.reason,
      'pinned_by', v_pin.pinned_by,
      'pinned_at', v_pin.pinned_at,
      'retired_badge', v_version.status = 'retired'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_service_job_routine_pin_history(
  p_job_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs%ROWTYPE;
  v_rows jsonb;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor.role NOT IN ('admin', 'support', 'technician')
     OR NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to read job routine pin history'
      USING ERRCODE = '42501', DETAIL = 'routine_job_pin_authz_denied';
  END IF;

  SELECT COALESCE(jsonb_agg(x.obj ORDER BY x.pinned_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'pin_id', p.id,
      'routine_id', p.routine_id,
      'routine_version_id', p.routine_version_id,
      'version_status', v.status,
      'status', p.status,
      'reason', p.reason,
      'pinned_by', p.pinned_by,
      'pinned_at', p.pinned_at,
      'replaced_by_pin_id', p.replaced_by_pin_id,
      'unpinned_by', p.unpinned_by,
      'unpinned_at', p.unpinned_at
    ) AS obj,
    p.pinned_at
    FROM public.service_job_routine_pins p
    JOIN public.service_routine_versions v ON v.id = p.routine_version_id
    WHERE p.job_id = p_job_id
  ) x;

  RETURN jsonb_build_object('job_id', p_job_id, 'history', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.pin_service_job_routine(uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.replace_service_job_routine_pin(uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unpin_service_job_routine(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_service_job_routine_pin(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_service_job_routine_pin_history(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pin_service_job_routine(uuid, uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.replace_service_job_routine_pin(uuid, uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unpin_service_job_routine(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_service_job_routine_pin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_service_job_routine_pin_history(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.pin_service_job_routine(uuid, uuid, text, uuid) IS
  'Lane B: initial job pin of exact published routine_version_id; reason required; freezes after first visit in_progress.';
COMMENT ON FUNCTION public.replace_service_job_routine_pin(uuid, uuid, text, uuid) IS
  'Lane B: replace active job pin before work-start boundary; reason required.';
COMMENT ON FUNCTION public.unpin_service_job_routine(uuid, text, uuid) IS
  'Lane B: unpin active job pin before work-start boundary; reason required.';
COMMENT ON FUNCTION public.get_service_job_routine_pin(uuid, uuid) IS
  'Lane B: read active job pin for admin/support/technician with ticket workflow read scope; customers denied.';
