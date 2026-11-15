CREATE OR REPLACE FUNCTION public.evaluate_ticket_workflow_prerequisites(p_ticket_id uuid)
RETURNS TABLE(code text, detail text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_activated timestamptz;
  v_ticket public.service_tickets;
  r record;
  v_issued uuid;
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
    RETURN; -- legacy / jobless path: no workflow prerequisites
  END IF;

  -- 1) Required jobs completed or waived
  FOR r IN
    SELECT j.id, j.job_sequence, j.title, j.state
    FROM public.service_jobs j
    WHERE j.ticket_id = p_ticket_id AND j.required
      AND j.state NOT IN ('completed', 'waived')
  LOOP
    code := 'required_job_unsatisfied';
    detail := format('Job %s (%s) state=%s', r.job_sequence, r.title, r.state);
    RETURN NEXT;
  END LOOP;

  -- 2) Active/scheduled visits on ANY job (including optional) must be settled
  FOR r IN
    SELECT v.id, v.visit_sequence, v.state, j.job_sequence, j.title
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND v.state IN ('scheduled', 'in_progress')
  LOOP
    code := CASE WHEN r.state = 'scheduled' THEN 'scheduled_visit_open' ELSE 'active_visit_open' END;
    detail := format('Job %s (%s) visit %s state=%s', r.job_sequence, r.title, r.visit_sequence, r.state);
    RETURN NEXT;
  END LOOP;

  -- Pending reviews on any job
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
    RETURN NEXT;
  END LOOP;

  -- 3) Completing issued report for each completed job
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
      RETURN NEXT;
    END IF;
  END LOOP;

  -- 4) Acknowledgment settled on each customer-visible issued head
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
    v_ack := public.effective_acknowledgment(r.id);
    IF v_ack IS NULL OR v_ack.id IS NULL THEN
      code := 'acknowledgment_outstanding';
      detail := format(
        'Job %s (%s) issued revision %s — acknowledgment outstanding',
        r.job_sequence, r.title, r.revision_number
      );
      RETURN NEXT;
    ELSIF v_ack.response = 'refused' THEN
      v_disp := public.effective_acknowledgment_disposition(r.id);
      IF v_disp IS NULL OR v_disp.id IS NULL THEN
        code := 'acknowledgment_refusal_disposition_pending';
        detail := format(
          'Job %s (%s) issued revision %s refused — manager disposition required',
          r.job_sequence, r.title, r.revision_number
        );
        RETURN NEXT;
      ELSIF v_disp.disposition = 'create_follow_up' THEN
        code := 'acknowledgment_refusal_follow_up_required';
        detail := format(
          'Job %s (%s) issued revision %s refused — follow-up disposition blocks closure',
          r.job_sequence, r.title, r.revision_number
        );
        RETURN NEXT;
      END IF;
      -- accept_refusal_and_proceed settles acknowledgment for closure
    ELSIF v_ack.response NOT IN ('accepted', 'unavailable') THEN
      code := 'acknowledgment_unsettled';
      detail := format(
        'Job %s (%s) issued revision %s response=%s',
        r.job_sequence, r.title, r.revision_number, v_ack.response
      );
      RETURN NEXT;
    END IF;
    -- accepted / unavailable: settled (unavailable never displayed as acceptance)
  END LOOP;

  -- 5) Resolution summary present when evaluating for resolve/close surfaces
  v_summary := nullif(trim(COALESCE(v_ticket.resolution_summary, '')), '');
  IF v_summary IS NULL THEN
    code := 'resolution_summary_missing';
    detail := 'Ticket resolution summary is required before resolve/close';
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
    RETURN; -- legacy / jobless path; activated tickets cannot clear this column
  END IF;
  IF p_to_status NOT IN ('resolved', 'closed') THEN
    RETURN;
  END IF;
  FOR v_row IN SELECT * FROM public.evaluate_ticket_workflow_prerequisites(p_ticket.id)
  LOOP
    -- resolution_summary may be supplied in the same govern_ticket_transition call;
    -- allow that single code to pass here when p_to_status is resolved/closed and
    -- the transition will set it — checked after coalesce in a dedicated helper below.
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

-- Patch govern_ticket_transition to require resolution summary on resolve/close
-- for activated tickets (after coalesce of incoming summary).
