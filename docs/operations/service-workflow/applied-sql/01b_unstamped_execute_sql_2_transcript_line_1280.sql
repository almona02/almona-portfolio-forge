DROP FUNCTION IF EXISTS public.create_service_job(uuid, text, boolean, text);
DROP FUNCTION IF EXISTS public.create_service_job(uuid, text, boolean, text, uuid);

CREATE FUNCTION public.create_service_job(
  p_ticket_id uuid,
  p_title text,
  p_required boolean DEFAULT true,
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
  v_seq int;
  v_from text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
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
  IF v_ticket.status = 'closed' THEN
    RAISE EXCEPTION 'Closed tickets cannot receive jobs' USING ERRCODE = 'check_violation';
  END IF;
  IF v_ticket.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled tickets cannot receive jobs' USING ERRCODE = 'check_violation';
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

  IF v_job.required AND v_ticket.status = 'resolved' THEN
    v_from := v_ticket.status;
    UPDATE public.service_tickets
    SET status = 'in_progress',
        updated_at = now(),
        resolved_at = NULL
    WHERE id = p_ticket_id;

    INSERT INTO public.ticket_governance_audit (
      ticket_id, actor_id, action, from_status, to_status, assigned_to, details
    ) VALUES (
      p_ticket_id, v_actor.uid, 'status_transition', v_from, 'in_progress', v_ticket.assigned_to,
      jsonb_build_object(
        'rationale', COALESCE(p_rationale, 'required job added'),
        'role', v_actor.role,
        'workflow', 'required_job_add_back',
        'job_id', v_job.id
      )
    );
  END IF;

  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'create_job', NULL, v_job.state, p_rationale,
    jsonb_build_object('required', v_job.required, 'sequence', v_job.job_sequence, 'title', v_job.title)
  );

  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_job(uuid, text, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_service_job(uuid, text, boolean, text, uuid)
  TO authenticated, service_role;