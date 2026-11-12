-- B3 visit execution (schedule / start / complete / abort / no-access).
-- Frozen for Spark review only. DO NOT apply to staging until Spark PASS.
-- No permanent one-active-visit schema constraint — operational rule in RPCs.
-- Routine pin/checklist columns are extension points for B4 (unused here).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Schema
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS actual_start timestamptz,
  ADD COLUMN IF NOT EXISTS actual_end timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_routine_version_id uuid,
  ADD COLUMN IF NOT EXISTS checklist_results jsonb;

COMMENT ON COLUMN public.service_job_visits.pinned_routine_version_id IS
  'B4 extension: optional pinned routine version for this visit. Unused in B3.';
COMMENT ON COLUMN public.service_job_visits.checklist_results IS
  'B4 extension: checklist/result payload for a pinned routine. Unused in B3.';

CREATE TABLE IF NOT EXISTS public.service_job_visit_schedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.service_job_visits(id) ON DELETE CASCADE,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  rationale text
);

CREATE INDEX IF NOT EXISTS service_job_visit_schedule_history_visit_idx
  ON public.service_job_visit_schedule_history (visit_id, changed_at);

ALTER TABLE public.service_job_visit_schedule_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_job_visit_schedule_history_select ON public.service_job_visit_schedule_history;
CREATE POLICY service_job_visit_schedule_history_select
  ON public.service_job_visit_schedule_history
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
        )
    )
  );

CREATE POLICY service_job_visit_schedule_history_no_client_insert
  ON public.service_job_visit_schedule_history FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_job_visit_schedule_history_no_client_update
  ON public.service_job_visit_schedule_history FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_job_visit_schedule_history_no_client_delete
  ON public.service_job_visit_schedule_history FOR DELETE TO authenticated USING (false);

GRANT SELECT ON public.service_job_visit_schedule_history TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_job_visit_schedule_history
  FROM authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------
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
BEGIN
  SELECT ticket_id INTO v_ticket FROM public.service_jobs WHERE id = p_job_id;
  FOR v_visit IN
    SELECT * FROM public.service_job_visits
    WHERE job_id = p_job_id AND state = 'scheduled'
    FOR UPDATE
  LOOP
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

CREATE OR REPLACE FUNCTION admin_private.assert_visit_window(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_start IS NULL OR p_end IS NULL THEN
    RAISE EXCEPTION 'scheduled_start and scheduled_end are required' USING ERRCODE = '22023';
  END IF;
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'scheduled_end must be after scheduled_start' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Schedule / reschedule
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
  v_job public.service_jobs;
  v_visit public.service_job_visits;
  v_seq int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may schedule visits' USING ERRCODE = '42501';
  END IF;
  PERFORM admin_private.assert_visit_window(p_scheduled_start, p_scheduled_end);

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.state IN ('completed', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot schedule visit on terminal job' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

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
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may reschedule visits' USING ERRCODE = '42501';
  END IF;
  PERFORM admin_private.assert_visit_window(p_scheduled_start, p_scheduled_end);

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_visit.state IS DISTINCT FROM 'scheduled' THEN
    RAISE EXCEPTION 'Only scheduled visits may be rescheduled; create a new visit instead'
      USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  -- Idempotent same-window reschedule: no duplicate history row.
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
-- 4) Start / complete / abort / no-access
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_service_job_visit(
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
  v_active int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  -- Permission before job-state checks so denied roles keep 42501 (B1 P2).
  IF v_actor.role NOT IN ('admin', 'support', 'technician') THEN
    RAISE EXCEPTION 'Not permitted to start visits' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  -- Idempotent: already in_progress by this actor → return current.
  IF v_visit.state = 'in_progress' THEN
    IF v_visit.attending_technician_id IS NOT DISTINCT FROM v_actor.uid
       OR v_actor.role IN ('admin', 'support') THEN
      RETURN v_visit;
    END IF;
    RAISE EXCEPTION 'Visit already in progress' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_job.assigned_technician_id IS NULL THEN
    RAISE EXCEPTION 'Cannot start visit on unassigned job' USING ERRCODE = 'check_violation';
  END IF;

  -- Start authority = current job assignee (never stale former assignee alone).
  IF v_actor.role = 'technician' THEN
    IF v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the currently assigned technician may start this visit'
        USING ERRCODE = '42501';
    END IF;
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

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'start_visit', v_visit.state, 'in_progress', NULL,
    jsonb_build_object('actual_start', v_next.actual_start, 'attending', v_next.attending_technician_id)
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
  IF v_visit.state = 'completed' THEN
    RETURN v_visit; -- idempotent
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_actor.role = 'technician' THEN
    IF v_visit.attending_technician_id IS DISTINCT FROM v_actor.uid
       AND v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the attending/assigned technician may complete this visit'
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to complete visits' USING ERRCODE = '42501';
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

  -- Visit completion alone is NOT job completion (B4+/B5).
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
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Abort reason mandatory' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_visit.state = 'aborted' THEN
    RETURN v_visit;
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_actor.role = 'technician' THEN
    IF v_visit.attending_technician_id IS DISTINCT FROM v_actor.uid
       AND v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the attending/assigned technician may abort this visit'
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to abort visits' USING ERRCODE = '42501';
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
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'No-access reason mandatory' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_visit.state = 'no_access' THEN
    RETURN v_visit;
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_actor.role = 'technician' THEN
    IF v_visit.attending_technician_id IS DISTINCT FROM v_actor.uid
       AND v_job.assigned_technician_id IS DISTINCT FROM v_actor.uid THEN
      RAISE EXCEPTION 'Only the attending/assigned technician may record no-access'
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to record no-access' USING ERRCODE = '42501';
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

-- ---------------------------------------------------------------------------
-- 5) Keep B1 facades; wire create_visit through schedule-compatible path
-- ---------------------------------------------------------------------------
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
  v_start timestamptz := now() + interval '1 hour';
  v_end timestamptz := now() + interval '3 hours';
BEGIN
  -- B1 batteries call create without a window; synthesize a short default window.
  RETURN public.schedule_service_job_visit(
    p_job_id, v_start, v_end, COALESCE(p_rationale, 'b1_create_visit'), p_actor_id
  );
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
  v_visit public.service_job_visits;
BEGIN
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  -- Preserve B1 check_violation on illegal/terminal rewrites (e.g. aborted→scheduled).
  IF NOT public.is_valid_visit_transition(v_visit.state, p_to_state) THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> %', v_visit.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_to_state = 'in_progress' THEN
    RETURN public.start_service_job_visit(p_visit_id, p_actor_id);
  ELSIF p_to_state = 'completed' THEN
    RETURN public.complete_service_job_visit(p_visit_id, p_actor_id);
  ELSIF p_to_state = 'aborted' THEN
    RETURN public.abort_service_job_visit(p_visit_id, p_rationale, p_actor_id);
  ELSIF p_to_state = 'no_access' THEN
    RETURN public.record_visit_no_access(p_visit_id, p_rationale, p_actor_id);
  ELSE
    -- e.g. scheduled→scheduled no-op already handled by is_valid; other targets reject.
    RAISE EXCEPTION 'Invalid visit transition: % -> %', v_visit.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Assignment / decline: repoint scheduled attendance; block active attendance
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

  -- Former assignee must not retain start authority on scheduled visits.
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
-- 7) Grants
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
        'schedule_service_job_visit', 'reschedule_service_job_visit',
        'start_service_job_visit', 'complete_service_job_visit',
        'abort_service_job_visit', 'record_visit_no_access',
        'create_service_job_visit', 'govern_visit_transition',
        'assign_service_job', 'decline_service_job'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.schedule_service_job_visit(uuid, timestamptz, timestamptz, text, uuid) IS
  'B3: admin/support schedule a visit with append-only schedule history.';
COMMENT ON FUNCTION public.start_service_job_visit(uuid, uuid) IS
  'B3: start visit; one-active-visit operational rule; start authority = current assignee.';

COMMIT;
