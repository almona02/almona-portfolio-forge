-- B3 visit corrections (Spark CONDITIONAL PASS follow-up).
-- F-B3-01 auth-before-idempotent; D-B3-01 first-start ticket advance; D-B3-02 safety gate.
-- DO NOT apply to staging until Spark re-review PASS. No B4 routine editor/scheduler.

BEGIN;

-- ---------------------------------------------------------------------------
-- Safety prerequisite (minimum start gate; not model-specific checklist)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_job_visit_safety_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.service_job_visits(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('passed', 'failed')),
  attested_by uuid NOT NULL REFERENCES auth.users(id),
  attested_at timestamptz NOT NULL DEFAULT now(),
  attestation text NOT NULL,
  notes text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS service_job_visit_safety_checks_visit_idx
  ON public.service_job_visit_safety_checks (visit_id, attested_at DESC);

COMMENT ON TABLE public.service_job_visit_safety_checks IS
  'B3 minimum visit-start safety gate. Attributable passed/failed results only. '
  'Does not assert machine-specific hazard clearance. B4 may add model checklists via '
  'service_job_visits.pinned_routine_version_id / checklist_results.';

ALTER TABLE public.service_job_visit_safety_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_job_visit_safety_checks_select ON public.service_job_visit_safety_checks;
CREATE POLICY service_job_visit_safety_checks_select
  ON public.service_job_visit_safety_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_job_visits v
      JOIN public.service_jobs j ON j.id = v.job_id
      WHERE v.id = visit_id
        AND (
          admin_private.caller_role() IN ('admin', 'support')
          OR j.assigned_technician_id = auth.uid()
          OR v.attending_technician_id = auth.uid()
          OR attested_by = auth.uid()
        )
    )
  );

CREATE POLICY service_job_visit_safety_checks_no_client_insert
  ON public.service_job_visit_safety_checks FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_job_visit_safety_checks_no_client_update
  ON public.service_job_visit_safety_checks FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_job_visit_safety_checks_no_client_delete
  ON public.service_job_visit_safety_checks FOR DELETE TO authenticated USING (false);

GRANT SELECT ON public.service_job_visit_safety_checks TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_job_visit_safety_checks
  FROM authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.b3_minimum_safety_attestation()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT 'I confirm minimum on-site safety prerequisites for starting this visit '
      || '(site access, isolation awareness, and PPE as applicable). '
      || 'This confirmation does not assert that every machine-specific hazard has been addressed.';
$$;

COMMENT ON FUNCTION public.b3_minimum_safety_attestation() IS
  'Exact attestation text required to pass the B3 minimum visit-start safety gate.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.assert_visit_terminal_actor(
  p_actor record,
  p_visit public.service_job_visits,
  p_job public.service_jobs,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  IF p_actor.role = 'technician' THEN
    IF p_visit.attending_technician_id IS DISTINCT FROM p_actor.uid
       AND p_job.assigned_technician_id IS DISTINCT FROM p_actor.uid THEN
      RAISE EXCEPTION 'Only the attending/assigned technician may % this visit', p_action
        USING ERRCODE = '42501';
    END IF;
  ELSIF p_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to % visits', p_action USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.advance_ticket_on_first_visit_start(
  p_ticket_id uuid,
  p_actor_uid uuid,
  p_actor_role text,
  p_visit_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket public.service_tickets;
  v_prior int;
  v_from text;
BEGIN
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO v_prior
  FROM public.service_job_visits v
  JOIN public.service_jobs j ON j.id = v.job_id
  WHERE j.ticket_id = p_ticket_id
    AND v.actual_start IS NOT NULL
    AND v.id IS DISTINCT FROM p_visit_id;

  IF v_prior > 0 THEN
    -- Later visit starts: ticket must already be workable; never re-transition or reset clocks.
    IF v_ticket.status::text NOT IN ('in_progress', 'awaiting_parts', 'awaiting_customer') THEN
      RAISE EXCEPTION
        'Cannot start visit: ticket status % is incompatible after prior visit activity',
        v_ticket.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN;
  END IF;

  -- First authorized visit start: assigned → in_progress via FSM (no bypass).
  IF v_ticket.status::text = 'in_progress' THEN
    RETURN;
  END IF;

  IF v_ticket.status::text IS DISTINCT FROM 'assigned' THEN
    RAISE EXCEPTION
      'Cannot start visit: ticket status % is incompatible (expected assigned)',
      v_ticket.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT public.is_valid_ticket_status_transition(v_ticket.status::text, 'in_progress') THEN
    RAISE EXCEPTION 'Invalid ticket status transition: % -> in_progress', v_ticket.status
      USING ERRCODE = 'check_violation';
  END IF;

  v_from := v_ticket.status::text;
  UPDATE public.service_tickets t
  SET status = 'in_progress',
      updated_at = now()
      -- Do not touch first_response_at / assigned_at / resolved_at clocks here.
  WHERE t.id = p_ticket_id;

  INSERT INTO public.ticket_governance_audit(
    ticket_id, actor_id, action, from_status, to_status, assigned_to, details
  ) VALUES (
    p_ticket_id,
    p_actor_uid,
    'status_transition',
    v_from,
    'in_progress',
    v_ticket.assigned_to,
    jsonb_build_object(
      'rationale', 'first_visit_start',
      'role', p_actor_role,
      'workflow', 'b3_first_visit_start',
      'visit_id', p_visit_id
    )
  );

  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_ticket', p_ticket_id, p_actor_uid, p_actor_role,
    'first_visit_ticket_in_progress', v_from, 'in_progress', 'first_visit_start',
    jsonb_build_object('visit_id', p_visit_id)
  );
END;
$$;

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
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF p_result IS NULL OR p_result NOT IN ('passed', 'failed') THEN
    RAISE EXCEPTION 'Safety check result must be passed or failed' USING ERRCODE = '22023';
  END IF;
  IF p_result = 'passed' THEN
    IF p_attestation IS NULL OR p_attestation IS DISTINCT FROM v_attestation THEN
      RAISE EXCEPTION 'Minimum safety attestation text required for a passed check'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;

  IF v_actor.role = 'technician' THEN
    IF v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid
       AND v_visit.attending_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the assigned/attending technician may record safety checks'
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to record safety checks' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.service_job_visit_safety_checks (
    visit_id, result, attested_by, attestation, notes, details
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
      'b4_checklist_reserved', true
    )
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'visit_safety_check', v_visit.state, v_visit.state, p_notes,
    jsonb_build_object('result', p_result, 'safety_check_id', v_row.id)
  );
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- Replace start / complete / abort / no_access bodies
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.start_service_job_visit(uuid, uuid);

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
  v_latest_safety public.service_job_visit_safety_checks;
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

  -- Auth for start / idempotent in_progress return (F-B3-01 pattern on start too).
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

  -- D-B3-01 preflight: incompatible ticket parent states fail before mutations.
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

  -- D-B3-02: minimum safety gate (passed attestation required to start work).
  IF p_safety_attestation IS NULL OR p_safety_attestation IS DISTINCT FROM v_attestation THEN
    RAISE EXCEPTION 'Minimum safety attestation required before visit start'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_latest_safety
  FROM public.service_job_visit_safety_checks
  WHERE visit_id = p_visit_id
  ORDER BY attested_at DESC
  LIMIT 1;
  IF FOUND AND v_latest_safety.result = 'failed' THEN
    RAISE EXCEPTION 'Latest safety check failed; visit start denied'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.service_job_visit_safety_checks (
    visit_id, result, attested_by, attestation, notes, details
  ) VALUES (
    p_visit_id, 'passed', v_actor.uid, v_attestation, p_safety_notes,
    jsonb_build_object(
      'gate', 'b3_minimum_safety',
      'machine_specific_claim', false,
      'b4_checklist_reserved', true,
      'source', 'start_service_job_visit'
    )
  );

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

  -- D-B3-01: first visit start advances ticket assigned → in_progress atomically.
  PERFORM admin_private.advance_ticket_on_first_visit_start(
    v_job.ticket_id, v_actor.uid, v_actor.role, v_next.id
  );

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'start_visit', v_visit.state, 'in_progress', p_safety_notes,
    jsonb_build_object(
      'actual_start', v_next.actual_start,
      'attending', v_next.attending_technician_id,
      'safety_gate', 'passed'
    )
  );
  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_service_job_visit(
  p_visit_id uuid,
  p_actor_id uuid DEFAULT NULL
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
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  -- F-B3-01: authorize before any idempotent terminal return.
  PERFORM admin_private.assert_visit_terminal_actor(v_actor, v_visit, v_job, 'complete');

  IF v_visit.state = 'completed' THEN
    RETURN v_visit;
  END IF;

  IF NOT public.is_valid_visit_transition(v_visit.state, 'completed') THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> completed', v_visit.state
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_job_visits
  SET state = 'completed',
      actual_end = COALESCE(actual_end, now()),
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'complete_visit', v_visit.state, 'completed', NULL,
    jsonb_build_object('actual_end', v_next.actual_end)
  );
  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.abort_service_job_visit(
  p_visit_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
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
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  PERFORM admin_private.assert_visit_terminal_actor(v_actor, v_visit, v_job, 'abort');

  IF v_visit.state = 'aborted' THEN
    RETURN v_visit; -- authorized idempotent retry (reason not re-required)
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Abort reason mandatory' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_valid_visit_transition(v_visit.state, 'aborted') THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> aborted', v_visit.state
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_job_visits
  SET state = 'aborted',
      outcome_reason = p_reason,
      actual_end = COALESCE(actual_end, now()),
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'abort_visit', v_visit.state, 'aborted', p_reason, '{}'::jsonb
  );
  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_visit_no_access(
  p_visit_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
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
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  PERFORM admin_private.assert_visit_terminal_actor(v_actor, v_visit, v_job, 'record no-access');

  IF v_visit.state = 'no_access' THEN
    RETURN v_visit;
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'No-access reason mandatory' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_valid_visit_transition(v_visit.state, 'no_access') THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> no_access', v_visit.state
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_job_visits
  SET state = 'no_access',
      outcome_reason = p_reason,
      actual_end = COALESCE(actual_end, now()),
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'no_access_visit', v_visit.state, 'no_access', p_reason, '{}'::jsonb
  );
  RETURN v_next;
END;
$$;

-- Facade: B1 govern_visit_transition → start uses minimum attestation (attributable).
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
    RETURN public.start_service_job_visit(
      p_visit_id,
      p_actor_id,
      public.b3_minimum_safety_attestation(),
      COALESCE(p_rationale, 'govern_visit_transition')
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

REVOKE ALL ON FUNCTION public.b3_minimum_safety_attestation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.b3_minimum_safety_attestation() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_visit_safety_check(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_visit_safety_check(uuid, text, text, uuid, text)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.start_service_job_visit(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_service_job_visit(uuid, uuid, text, text)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_service_job_visit(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_service_job_visit(uuid, uuid)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.abort_service_job_visit(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abort_service_job_visit(uuid, text, uuid)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_visit_no_access(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_visit_no_access(uuid, text, uuid)
  TO authenticated, service_role;

COMMIT;
