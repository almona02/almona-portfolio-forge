-- B3 final safety-path correction (pre-staging).
-- 1) No implicit attestation via govern_visit_transition.
-- 2) Deterministic safety-record ordering (attested_at DESC, ordinal DESC).
-- 3) Hosted grant protection: revoke anon/PUBLIC on B3 RPCs; keep in-function auth.
-- DO NOT apply to staging until Spark targeted review PASS.

BEGIN;

-- ---------------------------------------------------------------------------
-- Deterministic ordering: ordinal tie-break when attested_at collides
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_job_visit_safety_checks
  ADD COLUMN IF NOT EXISTS ordinal bigint;

-- Backfill any existing rows stably by id order within attested_at.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_job_visit_safety_checks'
      AND column_name = 'ordinal'
  ) AND EXISTS (
    SELECT 1 FROM public.service_job_visit_safety_checks WHERE ordinal IS NULL
  ) THEN
    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY attested_at ASC, id ASC) AS rn
      FROM public.service_job_visit_safety_checks
    )
    UPDATE public.service_job_visit_safety_checks s
    SET ordinal = ranked.rn
    FROM ranked
    WHERE s.id = ranked.id AND s.ordinal IS NULL;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.service_job_visit_safety_checks_ordinal_seq;

SELECT setval(
  'public.service_job_visit_safety_checks_ordinal_seq',
  GREATEST(
    1,
    COALESCE((SELECT MAX(ordinal) FROM public.service_job_visit_safety_checks), 1)
  )
);

ALTER TABLE public.service_job_visit_safety_checks
  ALTER COLUMN ordinal SET DEFAULT nextval('public.service_job_visit_safety_checks_ordinal_seq');

UPDATE public.service_job_visit_safety_checks
SET ordinal = nextval('public.service_job_visit_safety_checks_ordinal_seq')
WHERE ordinal IS NULL;

ALTER TABLE public.service_job_visit_safety_checks
  ALTER COLUMN ordinal SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_job_visit_safety_checks_ordinal_uidx
  ON public.service_job_visit_safety_checks (ordinal);

COMMENT ON COLUMN public.service_job_visit_safety_checks.ordinal IS
  'Monotonic insert order. Latest safety result = ORDER BY attested_at DESC, ordinal DESC. '
  'A later explicit passed check supersedes any prior failed check; a later failed supersedes prior passed.';

CREATE OR REPLACE FUNCTION admin_private.latest_visit_safety_check(p_visit_id uuid)
RETURNS public.service_job_visit_safety_checks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_row public.service_job_visit_safety_checks;
BEGIN
  SELECT * INTO v_row
  FROM public.service_job_visit_safety_checks
  WHERE visit_id = p_visit_id
  ORDER BY attested_at DESC, ordinal DESC
  LIMIT 1;
  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION admin_private.latest_visit_safety_check(uuid) IS
  'Deterministic latest safety check: attested_at DESC, then ordinal DESC.';

-- ---------------------------------------------------------------------------
-- start_service_job_visit: explicit attestation OR prior explicit passed ack
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_service_job_visit(
  p_visit_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_safety_attestation text DEFAULT NULL,
  p_safety_notes text DEFAULT NULL
)
RETURNS public.service_job_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_ticket public.service_tickets;
  v_next public.service_job_visits;
  v_active int;
  v_attestation text := public.b3_minimum_safety_attestation();
  v_latest public.service_job_visit_safety_checks;
  v_explicit boolean;
  v_prior_pass boolean;
  v_safety_source text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  IF v_actor.role NOT IN ('admin', 'support', 'technician') THEN
    RAISE EXCEPTION 'Not permitted to start visits' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_actor.role = 'technician' THEN
    IF v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the currently assigned technician may start this visit'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_visit.state = 'in_progress' THEN
    IF v_visit.attending_technician_id IS NOT DISTINCT FROM v_actor.uid
       OR v_actor.role IN ('admin', 'support') THEN
      RETURN v_visit;
    END IF;
    RAISE EXCEPTION 'Only the attending/assigned technician may retry start'
      USING ERRCODE = '42501';
  END IF;

  IF v_job.assigned_technician_id IS NULL THEN
    RAISE EXCEPTION 'Cannot start visit on unassigned job' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT public.is_valid_visit_transition(v_visit.state, 'in_progress') THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> in_progress', v_visit.state
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_active
  FROM public.service_job_visits v
  WHERE v.job_id = v_job.id AND v.state = 'in_progress' AND v.id IS DISTINCT FROM p_visit_id;
  IF v_active > 0 THEN
    RAISE EXCEPTION 'One active visit per job (operational rule)' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = v_job.ticket_id
      AND v.actual_start IS NOT NULL
      AND v.id IS DISTINCT FROM p_visit_id
  ) THEN
    IF v_ticket.status::text NOT IN ('in_progress', 'awaiting_parts', 'awaiting_customer') THEN
      RAISE EXCEPTION
        'Cannot start visit: ticket status % is incompatible after prior visit activity',
        v_ticket.status
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_ticket.status::text NOT IN ('assigned', 'in_progress') THEN
    RAISE EXCEPTION
      'Cannot start visit: ticket status % is incompatible (expected assigned)',
      v_ticket.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Safety gate (no implicit pass):
  -- A) explicit attestation on this call, OR
  -- B) previously recorded explicit passed acknowledgment that is still latest
  --    (ORDER BY attested_at DESC, ordinal DESC). A later failed supersedes passed;
  --    a later explicit passed supersedes failed.
  v_latest := admin_private.latest_visit_safety_check(p_visit_id);
  v_explicit := (p_safety_attestation IS NOT NULL AND p_safety_attestation = v_attestation);
  v_prior_pass := (v_latest.id IS NOT NULL AND v_latest.result = 'passed');

  IF v_explicit THEN
    INSERT INTO public.service_job_visit_safety_checks (
      visit_id, result, attested_by, attestation, notes, details
    ) VALUES (
      p_visit_id, 'passed', v_actor.uid, v_attestation, p_safety_notes,
      jsonb_build_object(
        'gate', 'b3_minimum_safety',
        'machine_specific_claim', false,
        'b4_checklist_reserved', true,
        'source', 'start_service_job_visit_explicit'
      )
    );
    v_safety_source := 'explicit_attestation';
  ELSIF v_prior_pass THEN
    -- Prior explicit acknowledgment remains valid until superseded.
    v_safety_source := 'prior_explicit_passed';
  ELSE
    RAISE EXCEPTION
      'Explicit safety acknowledgment required before visit start (attest on start or record a passed check first)'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.service_job_visits
  SET state = 'in_progress',
      actual_start = COALESCE(actual_start, now()),
      attending_technician_id = CASE
        WHEN v_actor.role = 'technician' THEN v_actor.uid
        ELSE COALESCE(v_job.assigned_technician_id, attending_technician_id)
      END,
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  IF v_job.state = 'planned' THEN
    UPDATE public.service_jobs
    SET state = 'in_progress', updated_at = now()
    WHERE id = v_job.id;
  END IF;

  PERFORM admin_private.advance_ticket_on_first_visit_start(
    v_job.ticket_id, v_actor.uid, v_actor.role, v_next.id
  );

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'start_visit', v_visit.state, 'in_progress', p_safety_notes,
    jsonb_build_object(
      'actual_start', v_next.actual_start,
      'attending', v_next.attending_technician_id,
      'safety_gate', 'passed',
      'safety_source', v_safety_source
    )
  );
  RETURN v_next;
END;
$$;

-- ---------------------------------------------------------------------------
-- Facade: NO automatic attestation. Prior explicit passed check required.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.govern_visit_transition(
  p_visit_id uuid,
  p_to_state text,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_job_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_visit public.service_job_visits;
BEGIN
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_valid_visit_transition(v_visit.state, p_to_state) THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> %', v_visit.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_to_state = 'in_progress' THEN
    -- Compatibility path: does not invent a passed attestation.
    -- Caller must have recorded an explicit passed check first, or use
    -- start_service_job_visit with p_safety_attestation.
    RETURN public.start_service_job_visit(
      p_visit_id,
      p_actor_id,
      NULL, -- no implicit attestation
      p_rationale
    );
  ELSIF p_to_state = 'completed' THEN
    RETURN public.complete_service_job_visit(p_visit_id, p_actor_id);
  ELSIF p_to_state = 'aborted' THEN
    RETURN public.abort_service_job_visit(p_visit_id, p_rationale, p_actor_id);
  ELSIF p_to_state = 'no_access' THEN
    RETURN public.record_visit_no_access(p_visit_id, p_rationale, p_actor_id);
  ELSE
    RAISE EXCEPTION 'Invalid visit transition: % -> %', v_visit.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Hosted grant protection (default privileges may re-grant anon on CREATE)
-- Keep in-function auth/actor checks regardless of EXECUTE grants.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'b3_minimum_safety_attestation',
        'record_visit_safety_check',
        'start_service_job_visit',
        'complete_service_job_visit',
        'abort_service_job_visit',
        'record_visit_no_access',
        'schedule_service_job_visit',
        'reschedule_service_job_visit',
        'create_service_job_visit',
        'govern_visit_transition'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.govern_visit_transition(uuid, text, text, uuid) IS
  'B1 facade. in_progress requires a prior explicit passed safety check or use start_service_job_visit with attestation; never auto-supplies attestation.';

COMMENT ON FUNCTION public.start_service_job_visit(uuid, uuid, text, text) IS
  'Start visit. Requires explicit p_safety_attestation matching b3_minimum_safety_attestation() OR a prior explicit passed safety check that is still latest (attested_at DESC, ordinal DESC).';

COMMIT;
