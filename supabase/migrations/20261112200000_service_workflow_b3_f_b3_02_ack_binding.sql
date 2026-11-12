-- F-B3-02: bind personal safety acknowledgments to visit + attending tech +
-- assignment generation. Reassignment invalidates reuse (incl. tech1→tech2→tech1).
-- Preserve historical safety rows. No staging apply until Spark review PASS.

BEGIN;

-- ---------------------------------------------------------------------------
-- Assignment generation on jobs (bumped on assign/reassign/decline)
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_jobs
  ADD COLUMN IF NOT EXISTS assignment_generation bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.service_jobs.assignment_generation IS
  'Monotonic assignment generation. Incremented when assigned_technician_id changes '
  '(assign / reassign / decline). Personal safety acknowledgments are valid only for '
  'the generation under which they were recorded.';

-- ---------------------------------------------------------------------------
-- Bind safety rows to technician + generation (history preserved)
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_job_visit_safety_checks
  ADD COLUMN IF NOT EXISTS assignment_generation bigint,
  ADD COLUMN IF NOT EXISTS for_technician_id uuid REFERENCES auth.users(id);

-- Backfill existing rows without deleting history.
UPDATE public.service_job_visit_safety_checks s
SET assignment_generation = COALESCE(s.assignment_generation, j.assignment_generation, 0),
    for_technician_id = COALESCE(s.for_technician_id, s.attested_by)
FROM public.service_job_visits v
JOIN public.service_jobs j ON j.id = v.job_id
WHERE s.visit_id = v.id
  AND (s.assignment_generation IS NULL OR s.for_technician_id IS NULL);

UPDATE public.service_job_visit_safety_checks
SET assignment_generation = 0
WHERE assignment_generation IS NULL;

UPDATE public.service_job_visit_safety_checks
SET for_technician_id = attested_by
WHERE for_technician_id IS NULL;

ALTER TABLE public.service_job_visit_safety_checks
  ALTER COLUMN assignment_generation SET NOT NULL,
  ALTER COLUMN for_technician_id SET NOT NULL;

COMMENT ON COLUMN public.service_job_visit_safety_checks.assignment_generation IS
  'Job assignment_generation at attestation time. Prior passed reuse requires an exact match.';
COMMENT ON COLUMN public.service_job_visit_safety_checks.for_technician_id IS
  'Technician the acknowledgment is bound to (attending/assigned at record time).';

COMMENT ON TABLE public.service_job_visit_safety_checks IS
  'B3 minimum visit-start safety gate. Passed personal acknowledgments bind to visit + '
  'for_technician_id + assignment_generation. Reassignment invalidates reuse; rows are '
  'append-only history. Failed checks supersede earlier passes. Staff may record failed '
  'checks/observations but cannot substitute a personal passed acknowledgment for the '
  'attending technician.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.visit_bound_technician(
  p_visit public.service_job_visits,
  p_job public.service_jobs
)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(p_visit.attending_technician_id, p_job.assigned_technician_id);
$$;

CREATE OR REPLACE FUNCTION admin_private.visit_safety_prior_pass_valid(
  p_latest public.service_job_visit_safety_checks,
  p_visit public.service_job_visits,
  p_job public.service_jobs
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_bound uuid;
BEGIN
  IF p_latest.id IS NULL OR p_latest.result IS DISTINCT FROM 'passed' THEN
    RETURN false;
  END IF;
  v_bound := admin_private.visit_bound_technician(p_visit, p_job);
  IF v_bound IS NULL OR p_job.assigned_technician_id IS NULL THEN
    RETURN false;
  END IF;
  -- Bound to this visit, current attending/assigned tech, and current generation.
  RETURN p_latest.visit_id IS NOT DISTINCT FROM p_visit.id
     AND p_latest.attested_by IS NOT DISTINCT FROM v_bound
     AND p_latest.for_technician_id IS NOT DISTINCT FROM v_bound
     AND p_latest.assignment_generation IS NOT DISTINCT FROM p_job.assignment_generation
     AND p_job.assigned_technician_id IS NOT DISTINCT FROM v_bound;
END;
$$;

COMMENT ON FUNCTION admin_private.visit_safety_prior_pass_valid(
  public.service_job_visit_safety_checks, public.service_job_visits, public.service_jobs
) IS
  'True when latest safety row is a personal passed ack for this visit, bound technician, '
  'and current assignment_generation. Later failed rows are not passed and therefore invalid.';

CREATE OR REPLACE FUNCTION admin_private.bump_job_assignment_generation(
  p_job_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_gen bigint;
BEGIN
  UPDATE public.service_jobs
  SET assignment_generation = assignment_generation + 1,
      updated_at = now()
  WHERE id = p_job_id
  RETURNING assignment_generation INTO v_gen;
  RETURN v_gen;
END;
$$;

-- ---------------------------------------------------------------------------
-- assign / decline: bump generation when assignee changes (history of acks kept)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_service_job(
  p_job_id uuid,
  p_technician_id uuid,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs;
  v_next public.service_jobs;
  v_tech_role text;
  v_from uuid;
  v_action text;
  v_active int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may assign jobs' USING ERRCODE = '42501';
  END IF;
  IF p_technician_id IS NULL THEN
    RAISE EXCEPTION 'Technician required' USING ERRCODE = '22023';
  END IF;
  SELECT p.role::text INTO v_tech_role FROM public.profiles p WHERE p.id = p_technician_id;
  IF v_tech_role IS NULL OR v_tech_role NOT IN ('technician', 'admin', 'support') THEN
    RAISE EXCEPTION 'Assignee must be technician/admin/support' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_job.state IN ('completed', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot assign terminal job' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_active
  FROM public.service_job_visits v
  WHERE v.job_id = v_job.id AND v.state = 'in_progress';
  IF v_active > 0 THEN
    RAISE EXCEPTION 'Cannot reassign job with an in-progress visit' USING ERRCODE = 'check_violation';
  END IF;

  v_from := v_job.assigned_technician_id;
  IF v_from IS NOT DISTINCT FROM p_technician_id THEN
    RETURN v_job;
  END IF;
  v_action := CASE WHEN v_from IS NULL THEN 'assign' ELSE 'reassign' END;

  -- Invalidate prior personal safety acknowledgments for this job's visits.
  PERFORM admin_private.bump_job_assignment_generation(p_job_id);

  UPDATE public.service_jobs
  SET assigned_technician_id = p_technician_id,
      state = CASE WHEN state = 'unassigned' THEN 'planned' ELSE state END,
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_next;

  PERFORM admin_private.record_job_assignment(
    v_next.id, v_next.ticket_id, v_action, v_from, p_technician_id,
    v_actor.uid, v_actor.role, p_rationale
  );

  PERFORM admin_private.repoint_scheduled_visit_attendance(
    v_next.id, p_technician_id, v_actor.uid, v_actor.role, p_rationale
  );

  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_service_job(
  p_job_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs;
  v_next public.service_jobs;
  v_from uuid;
  v_active int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Decline reason mandatory' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_actor.role IS DISTINCT FROM 'technician'
     OR v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid THEN
    RAISE EXCEPTION 'Only the assigned technician may decline this job' USING ERRCODE = '42501';
  END IF;
  IF v_job.assigned_technician_id IS NULL THEN
    RAISE EXCEPTION 'Job is not assigned' USING ERRCODE = '22023';
  END IF;
  IF v_job.state IN ('completed', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot decline terminal job' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_active
  FROM public.service_job_visits v
  WHERE v.job_id = v_job.id AND v.state = 'in_progress';
  IF v_active > 0 THEN
    RAISE EXCEPTION 'Cannot decline job with an in-progress visit' USING ERRCODE = 'check_violation';
  END IF;

  v_from := v_job.assigned_technician_id;

  PERFORM admin_private.bump_job_assignment_generation(p_job_id);

  UPDATE public.service_jobs
  SET assigned_technician_id = NULL,
      state = 'unassigned',
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_next;

  PERFORM admin_private.record_job_assignment(
    v_next.id, v_next.ticket_id, 'decline', v_from, NULL,
    v_actor.uid, v_actor.role, p_reason
  );

  PERFORM admin_private.repoint_scheduled_visit_attendance(
    v_next.id, NULL, v_actor.uid, v_actor.role, p_reason
  );

  RETURN v_next;
END;
$$;

-- ---------------------------------------------------------------------------
-- record_visit_safety_check: personal passed only by bound tech; staff failed OK
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_visit_safety_check(
  p_visit_id uuid,
  p_result text,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_attestation text DEFAULT NULL
)
RETURNS public.service_job_visit_safety_checks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_row public.service_job_visit_safety_checks;
  v_attestation text := public.b3_minimum_safety_attestation();
  v_bound uuid;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF p_result IS NULL OR p_result NOT IN ('passed', 'failed') THEN
    RAISE EXCEPTION 'Safety check result must be passed or failed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;

  v_bound := admin_private.visit_bound_technician(v_visit, v_job);

  IF p_result = 'passed' THEN
    IF p_attestation IS NULL OR p_attestation IS DISTINCT FROM v_attestation THEN
      RAISE EXCEPTION 'Minimum safety attestation text required for a passed check'
        USING ERRCODE = '22023';
    END IF;
    IF v_bound IS NULL THEN
      RAISE EXCEPTION 'Cannot record a passed safety acknowledgment without an attending/assigned technician'
        USING ERRCODE = 'check_violation';
    END IF;
    -- Personal acknowledgment: only the bound technician may record a passed result.
    IF v_actor.uid IS DISTINCT FROM v_bound THEN
      RAISE EXCEPTION
        'Admin/support cannot substitute a personal safety acknowledgment for the attending technician'
        USING ERRCODE = '42501';
    END IF;
    IF v_actor.role = 'technician'
       AND v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid
       AND v_visit.attending_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the assigned/attending technician may record safety checks'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Failed checks / safety observations: assigned/attending tech or admin/support.
    IF v_actor.role = 'technician' THEN
      IF v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid
         AND v_visit.attending_technician_id IS DISTINCT FROM v_actor.uid THEN
        RAISE EXCEPTION 'Only the assigned/attending technician may record safety checks'
          USING ERRCODE = '42501';
      END IF;
    ELSIF v_actor.role NOT IN ('admin', 'support') THEN
      RAISE EXCEPTION 'Not permitted to record safety checks' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.service_job_visit_safety_checks (
    visit_id, result, attested_by, attestation, notes, details,
    assignment_generation, for_technician_id
  ) VALUES (
    p_visit_id,
    p_result,
    v_actor.uid,
    CASE WHEN p_result = 'passed' THEN v_attestation
         ELSE COALESCE(NULLIF(btrim(p_attestation), ''), 'safety_check_failed') END,
    p_notes,
    jsonb_build_object(
      'gate', 'b3_minimum_safety',
      'machine_specific_claim', false,
      'b4_checklist_reserved', true,
      'binding', 'visit_technician_assignment_generation'
    ),
    v_job.assignment_generation,
    COALESCE(v_bound, v_actor.uid)
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'visit_safety_check', v_visit.state, v_visit.state, p_notes,
    jsonb_build_object(
      'result', p_result,
      'safety_check_id', v_row.id,
      'assignment_generation', v_row.assignment_generation,
      'for_technician_id', v_row.for_technician_id
    )
  );
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- start_service_job_visit: prior pass must match tech + generation; no staff substitute
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
  v_bound uuid;
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

  v_bound := admin_private.visit_bound_technician(v_visit, v_job);
  IF v_bound IS NULL OR v_bound IS DISTINCT FROM v_job.assigned_technician_id THEN
    RAISE EXCEPTION
      'Visit attending technician must match the current job assignee before start'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Safety gate:
  -- A) explicit personal attestation by the bound technician on this call, OR
  -- B) prior personal passed ack still latest AND bound to visit + tech + generation.
  -- Later failed supersedes passed. Staff cannot substitute personal acknowledgment.
  v_latest := admin_private.latest_visit_safety_check(p_visit_id);
  v_explicit := (p_safety_attestation IS NOT NULL AND p_safety_attestation = v_attestation);
  v_prior_pass := admin_private.visit_safety_prior_pass_valid(v_latest, v_visit, v_job);

  IF v_explicit THEN
    IF v_actor.uid IS DISTINCT FROM v_bound THEN
      RAISE EXCEPTION
        'Admin/support cannot substitute a personal safety acknowledgment for the attending technician'
        USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.service_job_visit_safety_checks (
      visit_id, result, attested_by, attestation, notes, details,
      assignment_generation, for_technician_id
    ) VALUES (
      p_visit_id, 'passed', v_actor.uid, v_attestation, p_safety_notes,
      jsonb_build_object(
        'gate', 'b3_minimum_safety',
        'machine_specific_claim', false,
        'b4_checklist_reserved', true,
        'source', 'start_service_job_visit_explicit',
        'binding', 'visit_technician_assignment_generation'
      ),
      v_job.assignment_generation,
      v_bound
    );
    v_safety_source := 'explicit_attestation';
  ELSIF v_prior_pass THEN
    v_safety_source := 'prior_explicit_passed';
  ELSE
    IF v_latest.id IS NOT NULL AND v_latest.result = 'failed' THEN
      RAISE EXCEPTION 'Latest safety check failed; visit start denied'
        USING ERRCODE = 'check_violation';
    END IF;
    RAISE EXCEPTION
      'Explicit safety acknowledgment required before visit start '
      '(attending technician must attest on start or record a passed check for this assignment)'
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
      'safety_source', v_safety_source,
      'assignment_generation', v_job.assignment_generation
    )
  );
  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION public.start_service_job_visit(uuid, uuid, text, text) IS
  'Start visit. Requires personal passed acknowledgment by the current attending/assigned '
  'technician for the current assignment_generation (attest on start or prior passed still '
  'latest). Reassignment invalidates prior passes. Staff cannot substitute personal ack.';

COMMENT ON FUNCTION public.record_visit_safety_check(uuid, text, text, uuid, text) IS
  'Record safety check. Passed = personal ack by bound technician for current generation. '
  'Admin/support may record failed checks/observations only (no substitute passed ack).';

-- Hosted grant protection on touched RPCs
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
        'assign_service_job',
        'decline_service_job',
        'record_visit_safety_check',
        'start_service_job_visit',
        'govern_visit_transition'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

COMMIT;
