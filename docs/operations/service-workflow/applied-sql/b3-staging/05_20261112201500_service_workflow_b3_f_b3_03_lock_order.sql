-- F-B3-03: consistent lock order across visit start, assignment/reassignment,
-- attendance updates, and safety validation (includes parent ticket).
-- Canonical order: service_tickets → service_jobs → service_job_visits (by id).
-- Peek parent IDs without locking, then lock and revalidate relationships.
-- No deadlock-retry loops. Do not apply to staging until Spark review PASS.

BEGIN;

-- ---------------------------------------------------------------------------
-- Hierarchy lock helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.lock_ticket_for_workflow(p_ticket_id uuid)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket public.service_tickets;
BEGIN
  IF p_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Ticket id required for workflow lock' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_ticket
  FROM public.service_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.lock_job_hierarchy(p_job_id uuid)
RETURNS TABLE(ticket public.service_tickets, job public.service_jobs)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_peek_ticket uuid;
  v_ticket public.service_tickets;
  v_job public.service_jobs;
BEGIN
  -- Peek parent id without locking.
  SELECT j.ticket_id INTO v_peek_ticket
  FROM public.service_jobs j
  WHERE j.id = p_job_id;
  IF v_peek_ticket IS NULL THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  -- Canonical order: ticket → job
  v_ticket := admin_private.lock_ticket_for_workflow(v_peek_ticket);

  SELECT * INTO v_job
  FROM public.service_jobs
  WHERE id = p_job_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  -- Revalidate relationship after locks.
  IF v_job.ticket_id IS DISTINCT FROM v_ticket.id THEN
    RAISE EXCEPTION 'Job/ticket relationship changed under concurrency'
      USING ERRCODE = '40001';
  END IF;

  ticket := v_ticket;
  job := v_job;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.lock_visit_hierarchy(p_visit_id uuid)
RETURNS TABLE(
  ticket public.service_tickets,
  job public.service_jobs,
  visit public.service_job_visits
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_peek_job uuid;
  v_peek_ticket uuid;
  v_ticket public.service_tickets;
  v_job public.service_jobs;
  v_visit public.service_job_visits;
BEGIN
  -- Peek parents without locking.
  SELECT v.job_id INTO v_peek_job
  FROM public.service_job_visits v
  WHERE v.id = p_visit_id;
  IF v_peek_job IS NULL THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT j.ticket_id INTO v_peek_ticket
  FROM public.service_jobs j
  WHERE j.id = v_peek_job;
  IF v_peek_ticket IS NULL THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  -- Canonical order: ticket → job → visit
  v_ticket := admin_private.lock_ticket_for_workflow(v_peek_ticket);

  SELECT * INTO v_job
  FROM public.service_jobs
  WHERE id = v_peek_job
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.ticket_id IS DISTINCT FROM v_ticket.id THEN
    RAISE EXCEPTION 'Job/ticket relationship changed under concurrency'
      USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_visit
  FROM public.service_job_visits
  WHERE id = p_visit_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_visit.job_id IS DISTINCT FROM v_job.id THEN
    RAISE EXCEPTION 'Visit/job relationship changed under concurrency'
      USING ERRCODE = '40001';
  END IF;

  ticket := v_ticket;
  job := v_job;
  visit := v_visit;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION admin_private.lock_job_hierarchy(uuid) IS
  'F-B3-03: lock ticket then job; revalidate job.ticket_id after acquiring locks.';
COMMENT ON FUNCTION admin_private.lock_visit_hierarchy(uuid) IS
  'F-B3-03: lock ticket → job → visit; revalidate relationships after acquiring locks.';

-- Attendance repoint: visits locked in id order (caller already holds ticket+job).
CREATE OR REPLACE FUNCTION admin_private.repoint_scheduled_visit_attendance(
  p_job_id uuid,
  p_new_technician_id uuid,
  p_actor_uid uuid,
  p_actor_role text,
  p_rationale text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_visit public.service_job_visits;
  v_n int := 0;
  v_ticket uuid;
  v_job_ticket uuid;
BEGIN
  SELECT ticket_id INTO v_job_ticket FROM public.service_jobs WHERE id = p_job_id;
  IF v_job_ticket IS NULL THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  v_ticket := v_job_ticket;

  -- Deterministic visit lock order under the already-held job lock.
  FOR v_visit IN
    SELECT * FROM public.service_job_visits
    WHERE job_id = p_job_id AND state = 'scheduled'
    ORDER BY id
    FOR UPDATE
  LOOP
    IF v_visit.job_id IS DISTINCT FROM p_job_id THEN
      RAISE EXCEPTION 'Visit/job relationship changed under concurrency'
        USING ERRCODE = '40001';
    END IF;
    IF v_visit.attending_technician_id IS NOT DISTINCT FROM p_new_technician_id THEN
      CONTINUE;
    END IF;
    UPDATE public.service_job_visits
    SET attending_technician_id = p_new_technician_id,
        updated_at = now()
    WHERE id = v_visit.id;
    PERFORM admin_private.workflow_audit(
      v_ticket, 'service_job_visit', v_visit.id, p_actor_uid, p_actor_role,
      'attendance_repointed', v_visit.state, v_visit.state, p_rationale,
      jsonb_build_object(
        'from_technician', v_visit.attending_technician_id,
        'to_technician', p_new_technician_id,
        'job_id', p_job_id
      )
    );
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;

-- advance_ticket: expects caller to already hold the ticket row lock (same txn).
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
  -- Re-lock in place (no-op upgrade when caller already holds ticket per F-B3-03).
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
    IF v_ticket.status::text NOT IN ('in_progress', 'awaiting_parts', 'awaiting_customer') THEN
      RAISE EXCEPTION
        'Cannot start visit: ticket status % is incompatible after prior visit activity',
        v_ticket.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN;
  END IF;

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

COMMENT ON FUNCTION admin_private.advance_ticket_on_first_visit_start(uuid, uuid, text, uuid) IS
  'First-start ticket assigned→in_progress. Caller must already hold ticket lock (F-B3-03).';

-- ---------------------------------------------------------------------------
-- schedule: ticket → job
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_service_job_visit(
  p_job_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_job_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_hier record;
  v_job public.service_jobs;
  v_visit public.service_job_visits;
  v_seq int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may schedule visits' USING ERRCODE = '42501';
  END IF;
  PERFORM admin_private.assert_visit_window(p_scheduled_start, p_scheduled_end);

  SELECT * INTO v_hier FROM admin_private.lock_job_hierarchy(p_job_id);
  v_job := v_hier.job;

  IF v_job.state IN ('completed', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot schedule visit on terminal job' USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(MAX(visit_sequence), 0) + 1 INTO v_seq
  FROM public.service_job_visits WHERE job_id = p_job_id;

  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end,
    created_by, attending_technician_id
  ) VALUES (
    p_job_id, v_seq, 'scheduled', p_scheduled_start, p_scheduled_end,
    v_actor.uid, v_job.assigned_technician_id
  ) RETURNING * INTO v_visit;

  INSERT INTO public.service_job_visit_schedule_history (
    visit_id, scheduled_start, scheduled_end, changed_by, rationale
  ) VALUES (
    v_visit.id, p_scheduled_start, p_scheduled_end, v_actor.uid, p_rationale
  );

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'schedule_visit', NULL, 'scheduled', p_rationale,
    jsonb_build_object(
      'job_id', p_job_id,
      'sequence', v_seq,
      'scheduled_start', p_scheduled_start,
      'scheduled_end', p_scheduled_end
    )
  );
  RETURN v_visit;
END;
$$;

-- ---------------------------------------------------------------------------
-- reschedule: ticket → job → visit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reschedule_service_job_visit(
  p_visit_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_job_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_hier record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may reschedule visits' USING ERRCODE = '42501';
  END IF;
  PERFORM admin_private.assert_visit_window(p_scheduled_start, p_scheduled_end);

  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_visit := v_hier.visit;
  v_job := v_hier.job;

  IF v_visit.state IS DISTINCT FROM 'scheduled' THEN
    RAISE EXCEPTION 'Only scheduled visits may be rescheduled; create a new visit instead'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_visit.scheduled_start IS NOT DISTINCT FROM p_scheduled_start
     AND v_visit.scheduled_end IS NOT DISTINCT FROM p_scheduled_end THEN
    RETURN v_visit;
  END IF;

  UPDATE public.service_job_visits
  SET scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end,
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  INSERT INTO public.service_job_visit_schedule_history (
    visit_id, scheduled_start, scheduled_end, changed_by, rationale
  ) VALUES (
    v_next.id, p_scheduled_start, p_scheduled_end, v_actor.uid, p_rationale
  );

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'reschedule_visit', 'scheduled', 'scheduled', p_rationale,
    jsonb_build_object(
      'from_start', v_visit.scheduled_start,
      'from_end', v_visit.scheduled_end,
      'to_start', p_scheduled_start,
      'to_end', p_scheduled_end
    )
  );
  RETURN v_next;
END;
$$;

-- ---------------------------------------------------------------------------
-- assign / decline: ticket → job → visits (via repoint)
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
  v_hier record;
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

  SELECT * INTO v_hier FROM admin_private.lock_job_hierarchy(p_job_id);
  v_job := v_hier.job;

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
  v_hier record;
  v_job public.service_jobs;
  v_next public.service_jobs;
  v_from uuid;
  v_active int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Decline reason mandatory' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_hier FROM admin_private.lock_job_hierarchy(p_job_id);
  v_job := v_hier.job;

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
-- safety + start + terminals: ticket → job → visit
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
  v_hier record;
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

  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_visit := v_hier.visit;
  v_job := v_hier.job;

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
  v_hier record;
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

  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_visit := v_hier.visit;
  v_job := v_hier.job;
  v_ticket := v_hier.ticket;

  -- Authorization after locks (no stale peek-based authority).
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
  v_hier record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_visit := v_hier.visit;
  v_job := v_hier.job;

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
  v_hier record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_visit := v_hier.visit;
  v_job := v_hier.job;

  PERFORM admin_private.assert_visit_terminal_actor(v_actor, v_visit, v_job, 'abort');

  IF v_visit.state = 'aborted' THEN
    RETURN v_visit;
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
  v_hier record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_visit := v_hier.visit;
  v_job := v_hier.job;

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
        'schedule_service_job_visit',
        'reschedule_service_job_visit',
        'assign_service_job',
        'decline_service_job',
        'record_visit_safety_check',
        'start_service_job_visit',
        'complete_service_job_visit',
        'abort_service_job_visit',
        'record_visit_no_access',
        'govern_visit_transition'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.start_service_job_visit(uuid, uuid, text, text) IS
  'Start visit under F-B3-03 lock order ticket→job→visit. F-B3-02 ack binding unchanged.';

COMMIT;
