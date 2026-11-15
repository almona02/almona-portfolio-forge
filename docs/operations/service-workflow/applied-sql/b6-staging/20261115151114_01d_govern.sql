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
  v_summary text;
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

  IF v_ticket.workflow_activated_at IS NOT NULL AND p_to_status IN ('resolved', 'closed') THEN
    v_summary := nullif(trim(COALESCE(p_resolution_summary, v_ticket.resolution_summary, '')), '');
    IF v_summary IS NULL THEN
      RAISE EXCEPTION 'Workflow prerequisites unsatisfied for %:%', p_to_status,
        E'\nresolution_summary_missing: Ticket resolution summary is required before resolve/close'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

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

  IF v_ticket.workflow_activated_at IS NOT NULL AND p_to_status IN ('resolved', 'closed') THEN
    PERFORM admin_private.workflow_audit(
      p_ticket_id, 'ticket', p_ticket_id, v_uid, v_role,
      'workflow_resolve_close', v_ticket.status::text, p_to_status, p_rationale,
      jsonb_build_object(
        'resolution_summary_present', true,
        'note', 'Closure does not clear safety restrictions or imply return-to-service'
      )
    );
  END IF;

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
-- 7) Grants
-- ---------------------------------------------------------------------------
