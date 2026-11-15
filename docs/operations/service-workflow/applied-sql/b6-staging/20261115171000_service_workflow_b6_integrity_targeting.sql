-- B6 integrity + structured prerequisite targeting (narrow; no staging apply).
-- 1) Deterministic effective-ack ordering on timestamp ties (event_seq).
-- 2) evaluate returns entity_id (issued revision uuid) — UI must not parse prose.
-- 3) Idempotent re-close preserves closed_at and skips duplicate closure audit.
-- Builds on 20261115170000 (F-B6-03/04/05).
-- #155 frozen; #156 draft; no merge / production.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Monotonic event_seq for deterministic tie-break
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_acknowledgments
  ADD COLUMN IF NOT EXISTS event_seq bigint;

ALTER TABLE public.service_acknowledgment_dispositions
  ADD COLUMN IF NOT EXISTS event_seq bigint;

CREATE SEQUENCE IF NOT EXISTS public.service_ack_event_seq;
CREATE SEQUENCE IF NOT EXISTS public.service_ack_disposition_event_seq;

UPDATE public.service_acknowledgments
SET event_seq = nextval('public.service_ack_event_seq')
WHERE event_seq IS NULL;

UPDATE public.service_acknowledgment_dispositions
SET event_seq = nextval('public.service_ack_disposition_event_seq')
WHERE event_seq IS NULL;

ALTER TABLE public.service_acknowledgments
  ALTER COLUMN event_seq SET DEFAULT nextval('public.service_ack_event_seq'),
  ALTER COLUMN event_seq SET NOT NULL;

ALTER TABLE public.service_acknowledgment_dispositions
  ALTER COLUMN event_seq SET DEFAULT nextval('public.service_ack_disposition_event_seq'),
  ALTER COLUMN event_seq SET NOT NULL;

CREATE OR REPLACE FUNCTION public.effective_acknowledgment(p_revision_id uuid)
RETURNS public.service_acknowledgments
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT a.*
  FROM public.service_acknowledgments a
  WHERE a.issued_revision_id = p_revision_id
  ORDER BY a.responded_at DESC, a.event_seq DESC, a.id DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.effective_acknowledgment_disposition(p_revision_id uuid)
RETURNS public.service_acknowledgment_dispositions
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT d.*
  FROM public.service_acknowledgment_dispositions d
  WHERE d.issued_revision_id = p_revision_id
  ORDER BY d.decided_at DESC, d.event_seq DESC, d.id DESC
  LIMIT 1;
$$;

COMMENT ON COLUMN public.service_acknowledgments.event_seq IS
  'Monotonic insert order; breaks responded_at ties deterministically (not random uuid order).';
COMMENT ON COLUMN public.service_acknowledgment_dispositions.event_seq IS
  'Monotonic insert order; breaks decided_at ties deterministically.';

-- ---------------------------------------------------------------------------
-- 2) Prerequisites with structured entity_id
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.evaluate_ticket_workflow_prerequisites(uuid);

CREATE OR REPLACE FUNCTION public.evaluate_ticket_workflow_prerequisites(p_ticket_id uuid)
RETURNS TABLE(code text, detail text, entity_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_activated timestamptz;
  v_ticket public.service_tickets;
  r record;
  v_ack public.service_acknowledgments;
  v_disp public.service_acknowledgment_dispositions;
  v_summary text;
BEGIN
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  v_activated := v_ticket.workflow_activated_at;
  IF v_activated IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT j.id, j.job_sequence, j.title, j.state
    FROM public.service_jobs j
    WHERE j.ticket_id = p_ticket_id AND j.required
      AND j.state NOT IN ('completed', 'waived')
  LOOP
    code := 'required_job_unsatisfied';
    detail := format('Job %s (%s) state=%s', r.job_sequence, r.title, r.state);
    entity_id := r.id;
    RETURN NEXT;
  END LOOP;

  FOR r IN
    SELECT v.id, v.visit_sequence, v.state, j.job_sequence, j.title
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND v.state IN ('scheduled', 'in_progress')
  LOOP
    code := CASE WHEN r.state = 'scheduled' THEN 'scheduled_visit_open' ELSE 'active_visit_open' END;
    detail := format('Job %s (%s) visit %s state=%s', r.job_sequence, r.title, r.visit_sequence, r.state);
    entity_id := r.id;
    RETURN NEXT;
  END LOOP;

  FOR r IN
    SELECT rev.id, rev.revision_number, j.job_sequence, j.title
    FROM public.service_report_revisions rev
    JOIN public.service_reports rep ON rep.id = rev.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND NOT EXISTS (
        SELECT 1 FROM public.service_report_reviews rv WHERE rv.revision_id = rev.id
      )
  LOOP
    code := 'revision_awaiting_review';
    detail := format('Job %s (%s) revision %s awaiting review', r.job_sequence, r.title, r.revision_number);
    entity_id := r.id;
    RETURN NEXT;
  END LOOP;

  FOR r IN
    SELECT j.id, j.job_sequence, j.title, j.state
    FROM public.service_jobs j
    WHERE j.ticket_id = p_ticket_id AND j.state = 'completed'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.service_job_visits v
      JOIN public.service_reports rep ON rep.visit_id = v.id
      JOIN public.service_report_revisions rev ON rev.report_id = rep.id
      JOIN public.service_report_reviews rv
        ON rv.revision_id = rev.id AND rv.decision = 'approved_issued'
      WHERE v.job_id = r.id
        AND rev.id = public.latest_issued_revision_id(rep.id)
    ) THEN
      code := 'completing_report_not_issued';
      detail := format('Job %s (%s) completed without an issued completing report', r.job_sequence, r.title);
      entity_id := r.id;
      RETURN NEXT;
    END IF;
  END LOOP;

  FOR r IN
    SELECT rev.id, rev.revision_number, j.job_sequence, j.title
    FROM public.service_report_revisions rev
    JOIN public.service_report_reviews rv ON rv.revision_id = rev.id AND rv.decision = 'approved_issued'
    JOIN public.service_reports rep ON rep.id = rev.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND rev.id = public.latest_issued_revision_id(rep.id)
  LOOP
    SELECT * INTO v_ack FROM public.effective_acknowledgment(r.id) AS a;
    IF NOT FOUND OR v_ack.id IS NULL THEN
      code := 'acknowledgment_outstanding';
      detail := format(
        'Job %s (%s) issued revision %s — acknowledgment outstanding',
        r.job_sequence, r.title, r.revision_number
      );
      entity_id := r.id;
      RETURN NEXT;
    ELSIF v_ack.response = 'refused' THEN
      SELECT d.* INTO v_disp
      FROM public.service_acknowledgment_dispositions d
      WHERE d.issued_revision_id = r.id
        AND d.acknowledgment_id = v_ack.id
      ORDER BY d.decided_at DESC, d.event_seq DESC, d.id DESC
      LIMIT 1;
      IF NOT FOUND THEN
        code := 'acknowledgment_refusal_disposition_pending';
        detail := format(
          'Job %s (%s) issued revision %s refused — manager disposition required',
          r.job_sequence, r.title, r.revision_number
        );
        entity_id := r.id;
        RETURN NEXT;
      ELSIF v_disp.disposition = 'create_follow_up' THEN
        code := 'acknowledgment_refusal_follow_up_required';
        detail := format(
          'Job %s (%s) issued revision %s refused — follow-up disposition blocks closure',
          r.job_sequence, r.title, r.revision_number
        );
        entity_id := r.id;
        RETURN NEXT;
      END IF;
    ELSIF v_ack.response NOT IN ('accepted', 'unavailable') THEN
      code := 'acknowledgment_unsettled';
      detail := format(
        'Job %s (%s) issued revision %s response=%s',
        r.job_sequence, r.title, r.revision_number, v_ack.response
      );
      entity_id := r.id;
      RETURN NEXT;
    END IF;
  END LOOP;

  v_summary := nullif(trim(COALESCE(v_ticket.resolution_summary, '')), '');
  IF v_summary IS NULL THEN
    code := 'resolution_summary_missing';
    detail := 'Ticket resolution summary is required before resolve/close';
    entity_id := p_ticket_id;
    RETURN NEXT;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION admin_private.assert_ticket_workflow_allows_resolve_close(
  p_ticket public.service_tickets,
  p_to_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_row record;
  v_msgs text := '';
BEGIN
  IF p_ticket.workflow_activated_at IS NULL THEN
    RETURN;
  END IF;
  IF p_to_status NOT IN ('resolved', 'closed') THEN
    RETURN;
  END IF;
  FOR v_row IN SELECT * FROM public.evaluate_ticket_workflow_prerequisites(p_ticket.id)
  LOOP
    IF v_row.code = 'resolution_summary_missing' THEN
      CONTINUE;
    END IF;
    v_msgs := v_msgs || v_row.code || ': ' || v_row.detail || E'\n';
  END LOOP;
  IF v_msgs <> '' THEN
    RAISE EXCEPTION 'Workflow prerequisites unsatisfied for %:%', p_to_status, E'\n' || v_msgs
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Idempotent re-close: preserve closed_at; no duplicate closure audit
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

  -- Idempotent re-close / re-resolve: preserve timestamps; no duplicate audit rows
  IF v_ticket.status::text = p_to_status AND p_to_status IN ('resolved', 'closed') THEN
    RETURN v_ticket;
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
    resolved_at = CASE
      WHEN p_to_status = 'resolved' THEN COALESCE(t.resolved_at, now())
      WHEN p_to_status = 'in_progress' THEN NULL
      ELSE t.resolved_at
    END,
    closed_at = CASE
      WHEN p_to_status = 'closed' THEN COALESCE(t.closed_at, now())
      ELSE t.closed_at
    END,
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

REVOKE ALL ON FUNCTION public.effective_acknowledgment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_acknowledgment_disposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment_disposition(uuid) TO authenticated;

COMMIT;
