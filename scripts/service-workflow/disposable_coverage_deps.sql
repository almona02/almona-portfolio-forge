-- Coverage/recurrence disposable deps. TEST-ONLY. Never staging/production.
-- Applied after disposable_routines_base + Lane A/B migrations (via lane-b deps path).
-- Extends ticket/job stubs so create_service_job + coverage preventive insert work.

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS owner_id uuid;

ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'CR ticket',
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'maintenance',
  ADD COLUMN IF NOT EXISTS maintenance_type text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS workflow_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS workflow_activated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.service_jobs
  ADD COLUMN IF NOT EXISTS job_sequence integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Job 1',
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS work_started_boundary_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Governed job create stub (B1-shaped). Real env uses B1 migration body.
CREATE OR REPLACE FUNCTION public.create_service_job(
  p_ticket_id uuid,
  p_title text,
  p_required boolean DEFAULT true,
  p_rationale text DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_ticket public.service_tickets%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
  v_seq int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(NULL);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may create jobs' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Job title required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_ticket.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'Terminal tickets cannot receive jobs' USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(MAX(job_sequence), 0) + 1 INTO v_seq
  FROM public.service_jobs WHERE ticket_id = p_ticket_id;

  INSERT INTO public.service_jobs (
    ticket_id, job_sequence, title, required, state, created_by
  ) VALUES (
    p_ticket_id, v_seq, btrim(p_title), COALESCE(p_required, true), 'unassigned', v_actor.uid
  ) RETURNING * INTO v_job;

  IF v_ticket.workflow_activated_at IS NULL THEN
    UPDATE public.service_tickets
    SET workflow_activated_at = now(),
        workflow_activated_by = v_actor.uid,
        updated_at = now()
    WHERE id = p_ticket_id;
  END IF;

  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'create_job', NULL, v_job.state, p_rationale,
    jsonb_build_object('required', v_job.required, 'sequence', v_job.job_sequence, 'title', v_job.title)
  );

  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_job(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_service_job(uuid, text, boolean, text)
  TO authenticated, service_role;

-- Minimal assign stub for CR-16 smoke (not full B2).
CREATE OR REPLACE FUNCTION public.assign_service_job(
  p_job_id uuid,
  p_technician_id uuid,
  p_rationale text DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(NULL);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may assign jobs' USING ERRCODE = '42501';
  END IF;
  UPDATE public.service_jobs
  SET assigned_technician_id = p_technician_id,
      state = 'assigned',
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'assign_job', NULL, v_job.state, p_rationale,
    jsonb_build_object('technician_id', p_technician_id)
  );
  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_service_job(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_service_job(uuid, uuid, text)
  TO authenticated, service_role;
