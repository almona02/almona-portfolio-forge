-- Coverage & recurrence (local-authorized implementation).
-- Accepted proposal tip: 42862fdd27636d2682ce81fc287ed3777f8005fb
-- Binding: docs/operations/service-workflow/COVERAGE_RECURRENCE_BINDING_CHOICES.md
-- Does not authorize staging apply, merge, production, FR-1, billing, squads, or stock.


-- ---------------------------------------------------------------------------
-- 1) Coverage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_machine_coverages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id),
  routine_id uuid NOT NULL REFERENCES public.service_routines(id),
  routine_version_id uuid NOT NULL REFERENCES public.service_routine_versions(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'ended')),
  start_date date NOT NULL,
  end_date date,
  cadence_interval integer NOT NULL CHECK (cadence_interval > 0),
  cadence_unit text NOT NULL CHECK (cadence_unit IN ('days', 'weeks', 'months')),
  first_planned_due_date date NOT NULL,
  schedule_anchor_day integer NOT NULL CHECK (schedule_anchor_day BETWEEN 1 AND 31),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  paused_by uuid REFERENCES public.profiles(id),
  resumed_at timestamptz,
  resumed_by uuid REFERENCES public.profiles(id),
  ended_at timestamptz,
  ended_by uuid REFERENCES public.profiles(id),
  CONSTRAINT service_machine_coverages_end_ge_start
    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT service_machine_coverages_first_in_window
    CHECK (
      first_planned_due_date >= start_date
      AND (end_date IS NULL OR first_planned_due_date <= end_date)
    )
);

CREATE INDEX IF NOT EXISTS service_machine_coverages_machine_idx
  ON public.service_machine_coverages (machine_id, status);

CREATE INDEX IF NOT EXISTS service_machine_coverages_status_idx
  ON public.service_machine_coverages (status, start_date);

COMMENT ON TABLE public.service_machine_coverages IS
  'Thin machine coverage: one published routine version pin + operative calendar cadence.';

ALTER TABLE public.service_machine_coverages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_machine_coverages_select ON public.service_machine_coverages;
CREATE POLICY service_machine_coverages_select ON public.service_machine_coverages
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    admin_private.caller_role() = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_id AND m.owner_id = admin_private.caller_uid()
    )
  )
);

DROP POLICY IF EXISTS service_machine_coverages_no_client_insert ON public.service_machine_coverages;
CREATE POLICY service_machine_coverages_no_client_insert ON public.service_machine_coverages
FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS service_machine_coverages_no_client_update ON public.service_machine_coverages;
CREATE POLICY service_machine_coverages_no_client_update ON public.service_machine_coverages
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS service_machine_coverages_no_client_delete ON public.service_machine_coverages;
CREATE POLICY service_machine_coverages_no_client_delete ON public.service_machine_coverages
FOR DELETE TO authenticated USING (false);

REVOKE ALL ON TABLE public.service_machine_coverages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.service_machine_coverages TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Occurrences (generated work only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_maintenance_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_id uuid NOT NULL REFERENCES public.service_machine_coverages(id),
  sequence integer NOT NULL CHECK (sequence >= 1),
  planned_due_date date NOT NULL,
  routine_version_id uuid NOT NULL REFERENCES public.service_routine_versions(id),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES public.profiles(id),
  CONSTRAINT service_maintenance_occurrences_cov_seq UNIQUE (coverage_id, sequence)
);

CREATE INDEX IF NOT EXISTS service_maintenance_occurrences_due_idx
  ON public.service_maintenance_occurrences (planned_due_date);

CREATE INDEX IF NOT EXISTS service_maintenance_occurrences_ticket_idx
  ON public.service_maintenance_occurrences (ticket_id);

CREATE INDEX IF NOT EXISTS service_maintenance_occurrences_job_idx
  ON public.service_maintenance_occurrences (job_id);

COMMENT ON TABLE public.service_maintenance_occurrences IS
  'Generated maintenance occurrences. Identity = (coverage_id, sequence). Due date fixed at generation.';

ALTER TABLE public.service_maintenance_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_maintenance_occurrences_select ON public.service_maintenance_occurrences;
CREATE POLICY service_maintenance_occurrences_select ON public.service_maintenance_occurrences
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    admin_private.caller_role() = 'customer'
    AND EXISTS (
      SELECT 1
      FROM public.service_machine_coverages c
      JOIN public.machines m ON m.id = c.machine_id
      WHERE c.id = coverage_id AND m.owner_id = admin_private.caller_uid()
    )
  )
  OR (
    admin_private.can_read_ticket_workflow(ticket_id)
    AND admin_private.caller_role() IN ('technician', 'admin', 'support')
  )
);

DROP POLICY IF EXISTS service_maintenance_occurrences_no_client_insert ON public.service_maintenance_occurrences;
CREATE POLICY service_maintenance_occurrences_no_client_insert ON public.service_maintenance_occurrences
FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS service_maintenance_occurrences_no_client_update ON public.service_maintenance_occurrences;
CREATE POLICY service_maintenance_occurrences_no_client_update ON public.service_maintenance_occurrences
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS service_maintenance_occurrences_no_client_delete ON public.service_maintenance_occurrences;
CREATE POLICY service_maintenance_occurrences_no_client_delete ON public.service_maintenance_occurrences
FOR DELETE TO authenticated USING (false);

REVOKE ALL ON TABLE public.service_maintenance_occurrences FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.service_maintenance_occurrences TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Calendar helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.cairo_today()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT (timezone('Africa/Cairo', now()))::date;
$$;

CREATE OR REPLACE FUNCTION admin_private.add_coverage_cadence(
  p_anchor date,
  p_sequence_offset integer,
  p_interval integer,
  p_unit text,
  p_anchor_day integer
) RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_months integer;
  v_target_month date;
  v_last_day integer;
  v_day integer;
BEGIN
  IF p_sequence_offset < 0 THEN
    RAISE EXCEPTION 'sequence offset must be >= 0' USING ERRCODE = '22023';
  END IF;
  IF p_interval IS NULL OR p_interval <= 0 THEN
    RAISE EXCEPTION 'cadence interval must be > 0'
      USING ERRCODE = '22023', DETAIL = 'coverage_cadence_invalid';
  END IF;

  IF p_unit = 'days' THEN
    RETURN (p_anchor + (p_sequence_offset * p_interval))::date;
  ELSIF p_unit = 'weeks' THEN
    RETURN (p_anchor + (p_sequence_offset * p_interval * 7))::date;
  ELSIF p_unit = 'months' THEN
    v_months := p_sequence_offset * p_interval;
    v_target_month := (date_trunc('month', p_anchor)::date + (v_months * INTERVAL '1 month'))::date;
    v_last_day := EXTRACT(
      DAY FROM (date_trunc('month', v_target_month)::date + INTERVAL '1 month - 1 day')
    )::integer;
    v_day := LEAST(COALESCE(p_anchor_day, EXTRACT(DAY FROM p_anchor)::integer), v_last_day);
    RETURN make_date(
      EXTRACT(YEAR FROM v_target_month)::integer,
      EXTRACT(MONTH FROM v_target_month)::integer,
      v_day
    );
  ELSE
    RAISE EXCEPTION 'cadence unit must be days|weeks|months'
      USING ERRCODE = '22023', DETAIL = 'coverage_cadence_invalid';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.planned_due_for_sequence(
  p_first_due date,
  p_interval integer,
  p_unit text,
  p_anchor_day integer,
  p_sequence integer
) RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, admin_private
AS $$
  SELECT admin_private.add_coverage_cadence(
    p_first_due, p_sequence - 1, p_interval, p_unit, p_anchor_day
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) Applicability (Lane B rules; no new coverage override permission)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.assert_machine_routine_applicability(
  p_machine_id uuid,
  p_routine_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_machine public.machines%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
  v_families text[];
  v_brand text;
  v_family text;
  v_ok boolean := false;
BEGIN
  IF p_machine_id IS NULL THEN
    RAISE EXCEPTION 'Machine unlinked'
      USING ERRCODE = '22023', DETAIL = 'coverage_machine_unlinked';
  END IF;

  SELECT * INTO v_machine FROM public.machines WHERE id = p_machine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Machine unlinked'
      USING ERRCODE = '22023', DETAIL = 'coverage_machine_unlinked';
  END IF;

  IF v_machine.catalog_link_status IS DISTINCT FROM 'linked'
     OR nullif(btrim(COALESCE(v_machine.catalog_model_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Machine uncatalogued'
      USING ERRCODE = '22023', DETAIL = 'coverage_machine_uncatalogued';
  END IF;

  SELECT * INTO v_routine FROM public.service_routines WHERE id = p_routine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Routine not found' USING ERRCODE = 'P0002';
  END IF;

  v_families := admin_private.routine_family_set(p_routine_id);
  v_brand := lower(btrim(COALESCE(v_machine.brand, '')));
  v_family := btrim(COALESCE(v_machine.model, ''));

  IF nullif(v_family, '') IS NULL THEN
    RAISE EXCEPTION 'Machine uncatalogued'
      USING ERRCODE = '22023', DETAIL = 'coverage_machine_uncatalogued';
  END IF;

  IF cardinality(v_routine.manufacturer_deny_list) > 0
     AND v_brand <> ''
     AND v_brand = ANY (SELECT lower(btrim(x)) FROM unnest(v_routine.manufacturer_deny_list) AS x) THEN
    RAISE EXCEPTION 'Applicability denied'
      USING ERRCODE = '22023', DETAIL = 'coverage_applicability_denied';
  END IF;

  IF cardinality(v_routine.manufacturer_allow_list) > 0
     AND (
       v_brand = ''
       OR NOT (v_brand = ANY (SELECT lower(btrim(x)) FROM unnest(v_routine.manufacturer_allow_list) AS x))
     ) THEN
    RAISE EXCEPTION 'Applicability denied'
      USING ERRCODE = '22023', DETAIL = 'coverage_applicability_denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.service_routine_applicability a
    WHERE a.routine_id = p_routine_id
      AND a.kind = 'catalog_model'
      AND a.value = btrim(v_machine.catalog_model_id)
      AND (a.value_family IS NULL OR a.value_family = ANY (v_families))
  ) THEN
    v_ok := true;
  END IF;

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
      USING ERRCODE = '22023', DETAIL = 'coverage_applicability_denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.load_published_coverage_version(p_version_id uuid)
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
    RAISE EXCEPTION 'Retired version cannot be pinned to coverage'
      USING ERRCODE = '22023', DETAIL = 'coverage_version_retired';
  END IF;
  IF o_version.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Published version required'
      USING ERRCODE = '22023', DETAIL = 'coverage_version_not_published';
  END IF;
  RETURN o_version;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Governed preventive ticket (admin/support; machine linked at insert)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.create_coverage_preventive_ticket(
  p_machine_id uuid,
  p_owner_id uuid,
  p_title text,
  p_actor_id uuid,
  p_actor_role text,
  p_coverage_id uuid,
  p_sequence integer,
  p_planned_due date
) RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket public.service_tickets%ROWTYPE;
  v_title text := btrim(COALESCE(p_title, ''));
BEGIN
  IF v_title = '' THEN
    v_title := format('Preventive maintenance · seq %s · due %s', p_sequence, p_planned_due);
  END IF;

  INSERT INTO public.service_tickets (
    user_id, machine_id, status, title, type, maintenance_type
  ) VALUES (
    p_owner_id, p_machine_id, 'open', v_title, 'maintenance', 'preventive'
  ) RETURNING * INTO v_ticket;

  PERFORM admin_private.workflow_audit(
    v_ticket.id, 'service_ticket', v_ticket.id, p_actor_id, p_actor_role,
    'coverage_preventive_ticket_created', NULL, v_ticket.status,
    'coverage_occurrence_generated',
    jsonb_build_object(
      'coverage_id', p_coverage_id,
      'sequence', p_sequence,
      'planned_due_date', p_planned_due,
      'machine_id', p_machine_id
    )
  );

  RETURN v_ticket;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Atomic one-occurrence generation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.generate_one_coverage_occurrence(
  p_coverage public.service_machine_coverages,
  p_sequence integer,
  p_planned_due date,
  p_actor_uid uuid,
  p_actor_role text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_occ public.service_maintenance_occurrences%ROWTYPE;
  v_ticket public.service_tickets%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
  v_pin jsonb;
  v_machine public.machines%ROWTYPE;
  v_force text := nullif(current_setting('app.coverage_force_fail', true), '');
BEGIN
  -- Serialize concurrent generators on (coverage, sequence); UNIQUE is the final guard.
  PERFORM pg_advisory_xact_lock(hashtext(p_coverage.id::text), p_sequence);

  IF EXISTS (
    SELECT 1 FROM public.service_maintenance_occurrences o
    WHERE o.coverage_id = p_coverage.id AND o.sequence = p_sequence
  ) THEN
    SELECT * INTO v_occ FROM public.service_maintenance_occurrences
    WHERE coverage_id = p_coverage.id AND sequence = p_sequence;
    RETURN jsonb_build_object(
      'occurrence_id', v_occ.id,
      'coverage_id', p_coverage.id,
      'sequence', p_sequence,
      'planned_due_date', v_occ.planned_due_date,
      'ticket_id', v_occ.ticket_id,
      'job_id', v_occ.job_id,
      'routine_version_id', v_occ.routine_version_id,
      'created', false
    );
  END IF;

  SELECT * INTO v_machine FROM public.machines WHERE id = p_coverage.machine_id;

  -- Re-check applicability at generation time (Lane B rules).
  PERFORM admin_private.assert_machine_routine_applicability(
    p_coverage.machine_id, p_coverage.routine_id
  );
  PERFORM admin_private.load_published_coverage_version(p_coverage.routine_version_id);

  v_ticket := admin_private.create_coverage_preventive_ticket(
    p_coverage.machine_id,
    v_machine.owner_id,
    format('Preventive · coverage %s · seq %s', p_coverage.id, p_sequence),
    p_actor_uid,
    p_actor_role,
    p_coverage.id,
    p_sequence,
    p_planned_due
  );

  IF v_force = 'before_job' THEN
    RAISE EXCEPTION 'forced failure before job'
      USING ERRCODE = '22023', DETAIL = 'coverage_gen_forced_fail';
  END IF;

  v_job := public.create_service_job(
    v_ticket.id,
    format('Job 1 · preventive seq %s', p_sequence),
    true,
    'coverage_occurrence_generated'
  );

  IF v_force = 'before_pin' THEN
    RAISE EXCEPTION 'forced failure before pin'
      USING ERRCODE = '22023', DETAIL = 'coverage_gen_forced_fail';
  END IF;

  v_pin := public.pin_service_job_routine(
    v_job.id,
    p_coverage.routine_version_id,
    'coverage_occurrence_generated',
    p_actor_uid
  );

  IF v_force = 'after_pin' THEN
    RAISE EXCEPTION 'forced failure after pin'
      USING ERRCODE = '22023', DETAIL = 'coverage_gen_forced_fail';
  END IF;

  INSERT INTO public.service_maintenance_occurrences (
    coverage_id, sequence, planned_due_date, routine_version_id,
    ticket_id, job_id, generated_by
  ) VALUES (
    p_coverage.id, p_sequence, p_planned_due, p_coverage.routine_version_id,
    v_ticket.id, v_job.id, p_actor_uid
  ) RETURNING * INTO v_occ;

  PERFORM admin_private.workflow_audit(
    v_ticket.id, 'service_maintenance_occurrence', v_occ.id, p_actor_uid, p_actor_role,
    'coverage_occurrence_generated', NULL, 'generated',
    'coverage_occurrence_generated',
    jsonb_build_object(
      'coverage_id', p_coverage.id,
      'sequence', p_sequence,
      'planned_due_date', p_planned_due,
      'ticket_id', v_ticket.id,
      'job_id', v_job.id,
      'routine_version_id', p_coverage.routine_version_id,
      'pin_id', v_pin->>'pin_id'
    )
  );

  RETURN jsonb_build_object(
    'occurrence_id', v_occ.id,
    'coverage_id', p_coverage.id,
    'sequence', p_sequence,
    'planned_due_date', p_planned_due,
    'ticket_id', v_ticket.id,
    'job_id', v_job.id,
    'routine_version_id', p_coverage.routine_version_id,
    'pin', v_pin,
    'created', true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Management RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_machine_coverage(
  p_machine_id uuid,
  p_routine_version_id uuid,
  p_start_date date,
  p_first_planned_due_date date,
  p_cadence_interval integer,
  p_cadence_unit text,
  p_end_date date DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_version public.service_routine_versions%ROWTYPE;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_unit text := lower(btrim(COALESCE(p_cadence_unit, '')));
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to manage machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  IF p_cadence_interval IS NULL OR p_cadence_interval <= 0 THEN
    RAISE EXCEPTION 'cadence interval must be > 0'
      USING ERRCODE = '22023', DETAIL = 'coverage_cadence_invalid';
  END IF;
  IF v_unit NOT IN ('days', 'weeks', 'months') THEN
    RAISE EXCEPTION 'cadence unit must be days|weeks|months'
      USING ERRCODE = '22023', DETAIL = 'coverage_cadence_invalid';
  END IF;
  IF p_start_date IS NULL OR p_first_planned_due_date IS NULL THEN
    RAISE EXCEPTION 'start_date and first_planned_due_date required'
      USING ERRCODE = '22023', DETAIL = 'coverage_dates_invalid';
  END IF;
  IF p_first_planned_due_date < p_start_date THEN
    RAISE EXCEPTION 'first due before coverage start'
      USING ERRCODE = '22023', DETAIL = 'coverage_dates_invalid';
  END IF;
  IF p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'end_date before start_date'
      USING ERRCODE = '22023', DETAIL = 'coverage_dates_invalid';
  END IF;
  IF p_end_date IS NOT NULL AND p_first_planned_due_date > p_end_date THEN
    RAISE EXCEPTION 'first due after end_date'
      USING ERRCODE = '22023', DETAIL = 'coverage_dates_invalid';
  END IF;

  v_version := admin_private.load_published_coverage_version(p_routine_version_id);
  PERFORM admin_private.assert_machine_routine_applicability(p_machine_id, v_version.routine_id);

  INSERT INTO public.service_machine_coverages (
    machine_id, routine_id, routine_version_id, status,
    start_date, end_date, cadence_interval, cadence_unit,
    first_planned_due_date, schedule_anchor_day, created_by
  ) VALUES (
    p_machine_id, v_version.routine_id, v_version.id, 'active',
    p_start_date, p_end_date, p_cadence_interval, v_unit,
    p_first_planned_due_date, EXTRACT(DAY FROM p_first_planned_due_date)::integer, v_actor.uid
  ) RETURNING * INTO v_cov;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_machine_coverage', v_cov.id, v_actor.uid, v_actor.role,
    'coverage_created', NULL, 'active', NULL,
    jsonb_build_object(
      'machine_id', p_machine_id,
      'routine_version_id', v_version.id,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'first_planned_due_date', p_first_planned_due_date,
      'cadence_interval', p_cadence_interval,
      'cadence_unit', v_unit
    )
  );

  RETURN jsonb_build_object(
    'coverage_id', v_cov.id,
    'machine_id', v_cov.machine_id,
    'routine_id', v_cov.routine_id,
    'routine_version_id', v_cov.routine_version_id,
    'status', v_cov.status,
    'start_date', v_cov.start_date,
    'end_date', v_cov.end_date,
    'cadence_interval', v_cov.cadence_interval,
    'cadence_unit', v_cov.cadence_unit,
    'first_planned_due_date', v_cov.first_planned_due_date,
    'schedule_anchor_day', v_cov.schedule_anchor_day
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_machine_coverage(
  p_coverage_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_cov public.service_machine_coverages%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to manage machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  SELECT * INTO v_cov FROM public.service_machine_coverages WHERE id = p_coverage_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coverage not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_cov.status = 'ended' THEN
    RAISE EXCEPTION 'Ended coverage cannot be paused'
      USING ERRCODE = '22023', DETAIL = 'coverage_terminal';
  END IF;
  IF v_cov.status = 'paused' THEN
    RETURN jsonb_build_object('coverage_id', v_cov.id, 'status', 'paused', 'changed', false);
  END IF;

  UPDATE public.service_machine_coverages
  SET status = 'paused',
      paused_at = now(),
      paused_by = v_actor.uid,
      updated_at = now()
  WHERE id = p_coverage_id
  RETURNING * INTO v_cov;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_machine_coverage', v_cov.id, v_actor.uid, v_actor.role,
    'coverage_paused', 'active', 'paused', NULL, '{}'::jsonb
  );

  RETURN jsonb_build_object('coverage_id', v_cov.id, 'status', 'paused', 'changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_machine_coverage(
  p_coverage_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_cov public.service_machine_coverages%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to manage machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  SELECT * INTO v_cov FROM public.service_machine_coverages WHERE id = p_coverage_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coverage not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_cov.status = 'ended' THEN
    RAISE EXCEPTION 'Ended coverage cannot be resumed'
      USING ERRCODE = '22023', DETAIL = 'coverage_terminal';
  END IF;
  IF v_cov.status = 'active' THEN
    RETURN jsonb_build_object('coverage_id', v_cov.id, 'status', 'active', 'changed', false);
  END IF;

  UPDATE public.service_machine_coverages
  SET status = 'active',
      resumed_at = now(),
      resumed_by = v_actor.uid,
      updated_at = now()
  WHERE id = p_coverage_id
  RETURNING * INTO v_cov;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_machine_coverage', v_cov.id, v_actor.uid, v_actor.role,
    'coverage_resumed', 'paused', 'active', NULL, '{}'::jsonb
  );

  RETURN jsonb_build_object('coverage_id', v_cov.id, 'status', 'active', 'changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_machine_coverage(
  p_coverage_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_from text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to manage machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  SELECT * INTO v_cov FROM public.service_machine_coverages WHERE id = p_coverage_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coverage not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_cov.status = 'ended' THEN
    RETURN jsonb_build_object('coverage_id', v_cov.id, 'status', 'ended', 'changed', false);
  END IF;

  v_from := v_cov.status;
  UPDATE public.service_machine_coverages
  SET status = 'ended',
      ended_at = now(),
      ended_by = v_actor.uid,
      updated_at = now()
  WHERE id = p_coverage_id
  RETURNING * INTO v_cov;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_machine_coverage', v_cov.id, v_actor.uid, v_actor.role,
    'coverage_ended', v_from, 'ended', NULL, '{}'::jsonb
  );

  RETURN jsonb_build_object('coverage_id', v_cov.id, 'status', 'ended', 'changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.adopt_machine_coverage_routine_version(
  p_coverage_id uuid,
  p_routine_version_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_version public.service_routine_versions%ROWTYPE;
  v_old uuid;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to manage machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  SELECT * INTO v_cov FROM public.service_machine_coverages WHERE id = p_coverage_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coverage not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_cov.status = 'ended' THEN
    RAISE EXCEPTION 'Ended coverage cannot adopt versions'
      USING ERRCODE = '22023', DETAIL = 'coverage_terminal';
  END IF;

  v_version := admin_private.load_published_coverage_version(p_routine_version_id);
  IF v_version.routine_id IS DISTINCT FROM v_cov.routine_id THEN
    RAISE EXCEPTION 'Adopted version must belong to the same routine'
      USING ERRCODE = '22023', DETAIL = 'coverage_routine_mismatch';
  END IF;
  PERFORM admin_private.assert_machine_routine_applicability(v_cov.machine_id, v_version.routine_id);

  v_old := v_cov.routine_version_id;
  UPDATE public.service_machine_coverages
  SET routine_version_id = v_version.id,
      updated_at = now()
  WHERE id = p_coverage_id
  RETURNING * INTO v_cov;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_machine_coverage', v_cov.id, v_actor.uid, v_actor.role,
    'coverage_version_adopted', NULL, NULL, NULL,
    jsonb_build_object(
      'prior_routine_version_id', v_old,
      'routine_version_id', v_version.id
    )
  );

  RETURN jsonb_build_object(
    'coverage_id', v_cov.id,
    'routine_version_id', v_cov.routine_version_id,
    'prior_routine_version_id', v_old,
    'cadence_interval', v_cov.cadence_interval,
    'cadence_unit', v_cov.cadence_unit,
    'first_planned_due_date', v_cov.first_planned_due_date
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.change_machine_coverage_cadence(
  p_coverage_id uuid,
  p_cadence_interval integer,
  p_cadence_unit text,
  p_reanchor_first_due date DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_unit text := lower(btrim(COALESCE(p_cadence_unit, '')));
  v_old_interval integer;
  v_old_unit text;
  v_old_first date;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to manage machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  SELECT * INTO v_cov FROM public.service_machine_coverages WHERE id = p_coverage_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coverage not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_cov.status = 'ended' THEN
    RAISE EXCEPTION 'Ended coverage cannot change cadence'
      USING ERRCODE = '22023', DETAIL = 'coverage_terminal';
  END IF;

  IF p_cadence_interval IS NULL OR p_cadence_interval <= 0 THEN
    RAISE EXCEPTION 'cadence interval must be > 0'
      USING ERRCODE = '22023', DETAIL = 'coverage_cadence_invalid';
  END IF;
  IF v_unit NOT IN ('days', 'weeks', 'months') THEN
    RAISE EXCEPTION 'cadence unit must be days|weeks|months'
      USING ERRCODE = '22023', DETAIL = 'coverage_cadence_invalid';
  END IF;

  IF p_reanchor_first_due IS NOT NULL THEN
    IF p_reanchor_first_due < v_cov.start_date THEN
      RAISE EXCEPTION 'reanchor before coverage start'
        USING ERRCODE = '22023', DETAIL = 'coverage_dates_invalid';
    END IF;
    IF v_cov.end_date IS NOT NULL AND p_reanchor_first_due > v_cov.end_date THEN
      RAISE EXCEPTION 'reanchor after end_date'
        USING ERRCODE = '22023', DETAIL = 'coverage_dates_invalid';
    END IF;
  END IF;

  v_old_interval := v_cov.cadence_interval;
  v_old_unit := v_cov.cadence_unit;
  v_old_first := v_cov.first_planned_due_date;

  UPDATE public.service_machine_coverages
  SET cadence_interval = p_cadence_interval,
      cadence_unit = v_unit,
      first_planned_due_date = COALESCE(p_reanchor_first_due, first_planned_due_date),
      schedule_anchor_day = EXTRACT(DAY FROM COALESCE(p_reanchor_first_due, first_planned_due_date))::integer,
      updated_at = now()
  WHERE id = p_coverage_id
  RETURNING * INTO v_cov;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_machine_coverage', v_cov.id, v_actor.uid, v_actor.role,
    'coverage_cadence_changed', NULL, NULL, NULL,
    jsonb_build_object(
      'prior_cadence_interval', v_old_interval,
      'prior_cadence_unit', v_old_unit,
      'prior_first_planned_due_date', v_old_first,
      'cadence_interval', v_cov.cadence_interval,
      'cadence_unit', v_cov.cadence_unit,
      'first_planned_due_date', v_cov.first_planned_due_date,
      'routine_version_id', v_cov.routine_version_id
    )
  );

  RETURN jsonb_build_object(
    'coverage_id', v_cov.id,
    'cadence_interval', v_cov.cadence_interval,
    'cadence_unit', v_cov.cadence_unit,
    'first_planned_due_date', v_cov.first_planned_due_date,
    'schedule_anchor_day', v_cov.schedule_anchor_day,
    'routine_version_id', v_cov.routine_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_machine_coverage(
  p_coverage_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_owner uuid;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_cov FROM public.service_machine_coverages WHERE id = p_coverage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coverage not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT owner_id INTO v_owner FROM public.machines WHERE id = v_cov.machine_id;

  IF v_actor.role IN ('admin', 'support') THEN
    NULL;
  ELSIF v_actor.role = 'customer' AND v_owner = v_actor.uid THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not permitted to read machine coverage'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  RETURN jsonb_build_object(
    'coverage_id', v_cov.id,
    'machine_id', v_cov.machine_id,
    'routine_id', v_cov.routine_id,
    'routine_version_id', v_cov.routine_version_id,
    'status', v_cov.status,
    'start_date', v_cov.start_date,
    'end_date', v_cov.end_date,
    'cadence_interval', v_cov.cadence_interval,
    'cadence_unit', v_cov.cadence_unit,
    'first_planned_due_date', v_cov.first_planned_due_date,
    'schedule_anchor_day', v_cov.schedule_anchor_day
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Generator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_machine_coverage_occurrences(
  p_as_of date DEFAULT NULL,
  p_coverage_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_as_of date := COALESCE(p_as_of, admin_private.cairo_today());
  v_cov public.service_machine_coverages%ROWTYPE;
  v_horizon date;
  v_window_end date;
  v_seq integer;
  v_due date;
  v_created int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_results jsonb := '[]'::jsonb;
  v_one jsonb;
  v_detail text;
  v_msg text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to generate coverage occurrences'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  v_horizon := (v_as_of + 90)::date;

  FOR v_cov IN
    SELECT c.*
    FROM public.service_machine_coverages c
    WHERE c.status = 'active'
      AND (p_coverage_id IS NULL OR c.id = p_coverage_id)
    ORDER BY c.created_at, c.id
    FOR UPDATE OF c
  LOOP
    v_window_end := v_horizon;
    IF v_cov.end_date IS NOT NULL AND v_cov.end_date < v_window_end THEN
      v_window_end := v_cov.end_date;
    END IF;

    IF v_window_end < v_cov.start_date THEN
      CONTINUE;
    END IF;

    v_seq := 1;
    LOOP
      v_due := admin_private.planned_due_for_sequence(
        v_cov.first_planned_due_date,
        v_cov.cadence_interval,
        v_cov.cadence_unit,
        v_cov.schedule_anchor_day,
        v_seq
      );

      EXIT WHEN v_due > v_window_end;
      IF v_due < v_cov.start_date THEN
        v_seq := v_seq + 1;
        CONTINUE;
      END IF;

      BEGIN
        v_one := admin_private.generate_one_coverage_occurrence(
          v_cov, v_seq, v_due, v_actor.uid, v_actor.role
        );
        IF COALESCE((v_one->>'created')::boolean, false) THEN
          v_created := v_created + 1;
        ELSE
          v_skipped := v_skipped + 1;
        END IF;
        v_results := v_results || jsonb_build_array(v_one);
      EXCEPTION
        WHEN unique_violation THEN
          v_skipped := v_skipped + 1;
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL, v_msg = MESSAGE_TEXT;
          v_failed := v_failed + 1;
          v_results := v_results || jsonb_build_array(jsonb_build_object(
            'coverage_id', v_cov.id,
            'sequence', v_seq,
            'planned_due_date', v_due,
            'created', false,
            'error', v_msg,
            'detail', v_detail
          ));
      END;

      v_seq := v_seq + 1;
      -- Safety bound: monthly/weekly sequences within 90d + backlog cannot explode.
      EXIT WHEN v_seq > 500;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'horizon_end', v_horizon,
    'created', v_created,
    'skipped', v_skipped,
    'failed', v_failed,
    'results', v_results
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) Schedule classification (upcoming / due / overdue)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_machine_coverage_schedule(
  p_as_of date DEFAULT NULL,
  p_machine_id uuid DEFAULT NULL,
  p_coverage_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_as_of date := COALESCE(p_as_of, admin_private.cairo_today());
  v_horizon date;
  v_rows jsonb := '[]'::jsonb;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_owner uuid;
  v_window_end date;
  v_seq integer;
  v_due date;
  v_bucket text;
  v_occ public.service_maintenance_occurrences%ROWTYPE;
  v_generated boolean;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support', 'customer') THEN
    RAISE EXCEPTION 'Not permitted to list coverage schedule'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  v_horizon := (v_as_of + 90)::date;

  FOR v_cov IN
    SELECT c.*
    FROM public.service_machine_coverages c
    JOIN public.machines m ON m.id = c.machine_id
    WHERE (p_coverage_id IS NULL OR c.id = p_coverage_id)
      AND (p_machine_id IS NULL OR c.machine_id = p_machine_id)
      AND (
        v_actor.role IN ('admin', 'support')
        OR (v_actor.role = 'customer' AND m.owner_id = v_actor.uid)
      )
    ORDER BY c.machine_id, c.created_at
  LOOP
    SELECT owner_id INTO v_owner FROM public.machines WHERE id = v_cov.machine_id;
    v_window_end := v_horizon;
    IF v_cov.end_date IS NOT NULL AND v_cov.end_date < v_window_end THEN
      v_window_end := v_cov.end_date;
    END IF;

    v_seq := 1;
    LOOP
      v_due := admin_private.planned_due_for_sequence(
        v_cov.first_planned_due_date,
        v_cov.cadence_interval,
        v_cov.cadence_unit,
        v_cov.schedule_anchor_day,
        v_seq
      );
      EXIT WHEN v_due > v_window_end;
      IF v_due < v_cov.start_date THEN
        v_seq := v_seq + 1;
        CONTINUE;
      END IF;

      v_generated := false;
      SELECT * INTO v_occ FROM public.service_maintenance_occurrences
      WHERE coverage_id = v_cov.id AND sequence = v_seq;
      IF FOUND THEN
        v_generated := true;
        v_due := v_occ.planned_due_date; -- generated dues are frozen
      END IF;

      IF v_due < v_as_of THEN
        v_bucket := 'overdue';
      ELSIF v_due = v_as_of THEN
        v_bucket := 'due';
      ELSE
        v_bucket := 'upcoming';
      END IF;

      v_rows := v_rows || jsonb_build_array(jsonb_build_object(
        'coverage_id', v_cov.id,
        'machine_id', v_cov.machine_id,
        'sequence', v_seq,
        'planned_due_date', v_due,
        'bucket', v_bucket,
        'coverage_status', v_cov.status,
        'generated', v_generated,
        'ticket_id', CASE WHEN v_generated THEN v_occ.ticket_id ELSE NULL END,
        'job_id', CASE WHEN v_generated THEN v_occ.job_id ELSE NULL END,
        'routine_version_id', CASE
          WHEN v_generated THEN v_occ.routine_version_id
          ELSE v_cov.routine_version_id
        END
      ));

      v_seq := v_seq + 1;
      EXIT WHEN v_seq > 500;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'horizon_end', v_horizon,
    'items', v_rows
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10) Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_machine_coverage(uuid, uuid, date, date, integer, text, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pause_machine_coverage(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resume_machine_coverage(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_machine_coverage(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adopt_machine_coverage_routine_version(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_machine_coverage_cadence(uuid, integer, text, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_machine_coverage(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_machine_coverage_occurrences(date, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_machine_coverage_schedule(date, uuid, uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_machine_coverage(uuid, uuid, date, date, integer, text, date, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pause_machine_coverage(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resume_machine_coverage(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_machine_coverage(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adopt_machine_coverage_routine_version(uuid, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_machine_coverage_cadence(uuid, integer, text, date, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_machine_coverage(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_machine_coverage_occurrences(date, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_machine_coverage_schedule(date, uuid, uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.create_machine_coverage(uuid, uuid, date, date, integer, text, date, uuid) IS
  'Admin/Support: create active machine coverage with exact published routine version pin + cadence.';
COMMENT ON FUNCTION public.generate_machine_coverage_occurrences(date, uuid, uuid) IS
  'Admin/Support: idempotent Cairo-window generator; atomic occurrence→ticket→Job1→pin→audit.';

