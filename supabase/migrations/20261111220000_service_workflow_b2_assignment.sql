-- B2: Job assignment / reassignment / decline (disposable verification first).
-- Depends on B1: 20261111210000_service_workflow_b1_data_contract.sql
-- No staging/production apply authorized by this file alone.

-- ---------------------------------------------------------------------------
-- Assignment history (append-only attribution)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_job_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('assign', 'reassign', 'decline')),
  from_technician_id uuid REFERENCES auth.users(id),
  to_technician_id uuid REFERENCES auth.users(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_job_assignment_history_job_idx
  ON public.service_job_assignment_history (job_id, created_at DESC);

ALTER TABLE public.service_job_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_job_assignment_history_select ON public.service_job_assignment_history;
CREATE POLICY service_job_assignment_history_select ON public.service_job_assignment_history
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR actor_id = admin_private.caller_uid()
  OR from_technician_id = admin_private.caller_uid()
  OR to_technician_id = admin_private.caller_uid()
);

DROP POLICY IF EXISTS service_job_assignment_history_no_client_write ON public.service_job_assignment_history;
CREATE POLICY service_job_assignment_history_no_client_write ON public.service_job_assignment_history
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_job_assignment_history_no_client_update ON public.service_job_assignment_history
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_job_assignment_history_no_client_delete ON public.service_job_assignment_history
FOR DELETE TO authenticated USING (false);

GRANT SELECT ON public.service_job_assignment_history TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_job_assignment_history FROM authenticated, anon;

CREATE OR REPLACE FUNCTION admin_private.record_job_assignment(
  p_job_id uuid,
  p_ticket_id uuid,
  p_action text,
  p_from uuid,
  p_to uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_rationale text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.service_job_assignment_history (
    job_id, ticket_id, action, from_technician_id, to_technician_id, actor_id, rationale
  ) VALUES (
    p_job_id, p_ticket_id, p_action, p_from, p_to, p_actor_id, p_rationale
  );
  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_job', p_job_id, p_actor_id, p_actor_role,
    'job_' || p_action, COALESCE(p_from::text, ''), COALESCE(p_to::text, ''),
    p_rationale,
    jsonb_build_object('from_technician_id', p_from, 'to_technician_id', p_to)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- assign_service_job — assign / reassign accountable technician
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
    RETURN v_job; -- idempotent no-op
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

REVOKE ALL ON FUNCTION public.assign_service_job(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_service_job(uuid, uuid, text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- decline_service_job — assigned technician only
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.decline_service_job(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_service_job(uuid, text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ensure_default_service_job — idempotent Job 1 (+ optional assign)
-- ---------------------------------------------------------------------------
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
    -- Create via B1 path (activates workflow when first job lands)
    v_job := public.create_service_job(
      p_ticket_id,
      COALESCE(NULLIF(btrim(p_title), ''), 'Job 1'),
      true,
      COALESCE(p_rationale, 'default Job 1')
    );
    -- Re-lock the row we just created
    SELECT * INTO v_job FROM public.service_jobs WHERE id = v_job.id FOR UPDATE;
  END IF;

  IF p_technician_id IS NOT NULL THEN
    SELECT p.role::text INTO v_tech_role FROM public.profiles p WHERE p.id = p_technician_id;
    IF v_tech_role IS NULL OR v_tech_role NOT IN ('technician', 'admin', 'support') THEN
      RAISE EXCEPTION 'Assignee must be technician/admin/support' USING ERRCODE = '22023';
    END IF;
    -- Assign without creating a second job
    v_job := public.assign_service_job(v_job.id, p_technician_id, COALESCE(p_rationale, 'assign Job 1'), v_actor.uid);
  END IF;

  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_service_job(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_service_job(uuid, uuid, text, text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.ensure_default_service_job IS
  'B2: idempotent Job 1 create (opt-in workflow entry). Does not alter ticket assignee. Concurrent-safe via ticket FOR UPDATE.';
COMMENT ON FUNCTION public.assign_service_job IS
  'B2: assign/reassign job technician. Does not change ticket.assigned_to. Denied while visit in_progress.';
COMMENT ON FUNCTION public.decline_service_job IS
  'B2: technician declines own job with mandatory reason; ticket assignee unchanged.';
