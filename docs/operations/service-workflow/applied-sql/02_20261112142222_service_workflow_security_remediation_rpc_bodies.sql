CREATE OR REPLACE FUNCTION public.govern_job_transition(
  p_job_id uuid,
  p_to_state text,
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
  v_rev uuid;
  v_verif text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may transition jobs in B1' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF p_to_state = 'cancelled' AND (p_rationale IS NULL OR btrim(p_rationale) = '') THEN
    RAISE EXCEPTION 'Cancel reason mandatory' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_valid_job_transition(v_job.state, p_to_state) THEN
    RAISE EXCEPTION 'Invalid job transition: % -> %', v_job.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_to_state = 'completed' THEN
    SELECT r.id, r.verification_outcome INTO v_rev, v_verif
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_report_reviews rv ON rv.revision_id = r.id AND rv.decision = 'approved_issued'
    WHERE v.job_id = v_job.id
      AND r.id = public.latest_issued_revision_id(rep.id)
    ORDER BY v.visit_sequence DESC, r.revision_number DESC, r.id DESC
    LIMIT 1;

    IF v_rev IS NULL THEN
      RAISE EXCEPTION 'Job completion requires an approved issued report'
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_verif = 'further_work_required' THEN
      RAISE EXCEPTION 'Job cannot complete while verification is further_work_required'
        USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.service_job_visits v
      WHERE v.job_id = v_job.id AND v.state IN ('scheduled', 'in_progress')
    ) THEN
      RAISE EXCEPTION 'Job cannot complete with open visits'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.service_jobs
  SET state = p_to_state,
      completing_revision_id = CASE WHEN p_to_state = 'completed' THEN v_rev ELSE completing_revision_id END,
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'job_transition', v_job.state, p_to_state, p_rationale,
    jsonb_build_object('completing_revision_id', v_next.completing_revision_id)
  );

  RETURN v_next;
END;
$$;


CREATE OR REPLACE FUNCTION public.waive_service_job(
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
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may waive jobs' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Waive reason mandatory' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_job.state IN ('completed', 'waived') THEN
    RAISE EXCEPTION 'Job already terminal' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_jobs
  SET state = 'waived', updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'waive_job', v_job.state, 'waived', p_reason, '{}'::jsonb
  );
  RETURN v_next;
END;
$$;


CREATE OR REPLACE FUNCTION public.create_service_job_visit(
  p_job_id uuid,
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
  v_job public.service_jobs;
  v_visit public.service_job_visits;
  v_seq int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may create visits in B1' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.state IN ('completed', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot create visit on terminal job' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  SELECT COALESCE(MAX(visit_sequence), 0) + 1 INTO v_seq
  FROM public.service_job_visits WHERE job_id = p_job_id;

  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, created_by, attending_technician_id
  ) VALUES (
    p_job_id, v_seq, 'scheduled', v_actor.uid, v_job.assigned_technician_id
  ) RETURNING * INTO v_visit;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'create_visit', NULL, 'scheduled', p_rationale,
    jsonb_build_object('job_id', p_job_id, 'sequence', v_seq)
  );
  RETURN v_visit;
END;
$$;


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
  v_actor record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may transition visits in B1' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF p_to_state IN ('aborted', 'no_access') AND (p_rationale IS NULL OR btrim(p_rationale) = '') THEN
    RAISE EXCEPTION 'Outcome reason mandatory for %', p_to_state USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_valid_visit_transition(v_visit.state, p_to_state) THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> %', v_visit.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_to_state = 'in_progress' AND v_job.state = 'unassigned' THEN
    RAISE EXCEPTION 'Cannot start visit on unassigned job' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_job_visits
  SET state = p_to_state,
      outcome_reason = CASE
        WHEN p_to_state IN ('aborted', 'no_access') THEN p_rationale
        ELSE outcome_reason
      END,
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'visit_transition', v_visit.state, p_to_state, p_rationale, '{}'::jsonb
  );
  RETURN v_next;
END;
$$;


-- ---------------------------------------------------------------------------
-- 6) Restore B2 entry points (resolver-secured)
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

  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_service_job(
  p_ticket_id uuid,
  p_technician_id uuid DEFAULT NULL,
  p_title text DEFAULT 'Job 1',
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
  v_ticket public.service_tickets;
  v_job public.service_jobs;
  v_tech_role text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may ensure default job' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_ticket.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'Terminal tickets cannot receive Job 1' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_job
  FROM public.service_jobs
  WHERE ticket_id = p_ticket_id AND job_sequence = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_job := public.create_service_job(
      p_ticket_id,
      COALESCE(NULLIF(btrim(p_title), ''), 'Job 1'),
      true,
      COALESCE(p_rationale, 'default Job 1'),
      v_actor.uid
    );
    SELECT * INTO v_job FROM public.service_jobs WHERE id = v_job.id FOR UPDATE;
  END IF;

  IF p_technician_id IS NOT NULL THEN
    SELECT p.role::text INTO v_tech_role FROM public.profiles p WHERE p.id = p_technician_id;
    IF v_tech_role IS NULL OR v_tech_role NOT IN ('technician', 'admin', 'support') THEN
      RAISE EXCEPTION 'Assignee must be technician/admin/support' USING ERRCODE = '22023';
    END IF;
    v_job := public.assign_service_job(
      v_job.id, p_technician_id, COALESCE(p_rationale, 'assign Job 1'), v_actor.uid
    );
  END IF;

  RETURN v_job;
END;
$$;


-- ---------------------------------------------------------------------------
-- 7) Align govern_ticket_transition actor path with shared resolver
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.govern_ticket_transition(
  p_ticket_id uuid,
  p_to_status text,
  p_rationale text,
  p_resolution_summary text,
  p_actor_id uuid
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_uid uuid;
  v_role text;
  v_ticket public.service_tickets;
  v_next public.service_tickets;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  v_uid := v_actor.uid;
  v_role := v_actor.role;

  IF p_to_status IS NULL OR p_to_status = 'pending_approval' THEN
    RAISE EXCEPTION 'Status not permitted' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_valid_ticket_status_transition(v_ticket.status::text, p_to_status) THEN
    RAISE EXCEPTION 'Invalid ticket status transition: % -> %', v_ticket.status, p_to_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_ticket.status::text = 'resolved' AND p_to_status = 'in_progress' THEN
    RAISE EXCEPTION 'resolved→in_progress is only allowed via required job creation'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_role IN ('admin', 'support') THEN
    NULL;
  ELSIF v_role = 'technician' THEN
    IF v_ticket.assigned_to IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Technician may only transition assigned tickets' USING ERRCODE = '42501';
    END IF;
    IF NOT (
      (v_ticket.status::text = 'assigned' AND p_to_status IN ('in_progress', 'awaiting_parts', 'cancelled'))
      OR (v_ticket.status::text = 'in_progress' AND p_to_status IN ('awaiting_parts', 'awaiting_customer', 'resolved'))
      OR (v_ticket.status::text = 'awaiting_parts' AND p_to_status IN ('in_progress', 'cancelled'))
      OR (v_ticket.status::text = 'awaiting_customer' AND p_to_status IN ('in_progress', 'resolved'))
    ) THEN
      RAISE EXCEPTION 'Technician transition not permitted' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  PERFORM admin_private.assert_ticket_workflow_allows_resolve_close(v_ticket, p_to_status);

  UPDATE public.service_tickets t
  SET
    status = p_to_status,
    updated_at = now(),
    resolution_summary = CASE
      WHEN p_to_status IN ('resolved', 'closed') THEN COALESCE(p_resolution_summary, t.resolution_summary)
      ELSE t.resolution_summary
    END,
    resolved_at = CASE WHEN p_to_status = 'resolved' THEN now()
                       WHEN p_to_status = 'in_progress' THEN NULL
                       ELSE t.resolved_at END,
    closed_at = CASE WHEN p_to_status = 'closed' THEN now() ELSE t.closed_at END,
    first_response_at = CASE
      WHEN t.first_response_at IS NULL AND t.status::text = 'open' AND p_to_status IN ('assigned', 'in_progress')
        THEN now()
      ELSE t.first_response_at
    END,
    assigned_to = CASE
      WHEN p_to_status = 'cancelled' AND t.status::text = 'assigned' AND v_role = 'technician'
        THEN NULL
      ELSE t.assigned_to
    END
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_next;

  INSERT INTO public.ticket_governance_audit(ticket_id, actor_id, action, from_status, to_status, assigned_to, details)
  VALUES (
    p_ticket_id,
    v_uid,
    'status_transition',
    v_ticket.status::text,
    p_to_status,
    v_next.assigned_to,
    jsonb_build_object('rationale', p_rationale, 'role', v_role)
  );

  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.govern_ticket_transition(
  p_ticket_id uuid,
  p_to_status text,
  p_rationale text DEFAULT NULL,
  p_resolution_summary text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  RETURN public.govern_ticket_transition(
    p_ticket_id, p_to_status, p_rationale, p_resolution_summary, NULL::uuid);
END;
$$;


-- ---------------------------------------------------------------------------
-- 8) Grants: never leave anon EXECUTE (default privileges re-grant on CREATE)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_service_job', 'ensure_default_service_job', 'assign_service_job',
        'decline_service_job', 'govern_job_transition', 'waive_service_job',
        'create_service_job_visit', 'govern_visit_transition',
        'evaluate_ticket_workflow_prerequisites', 'govern_ticket_transition'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

COMMENT ON FUNCTION admin_private.workflow_resolve_actor(uuid) IS
  'Resolves workflow actor. Anon rejected. p_actor_id override only for verified service_role; authenticated cannot impersonate';
