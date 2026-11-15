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
        'Job %s (%s) issued revision %s (id=%s) — acknowledgment outstanding',
        r.job_sequence, r.title, r.revision_number, r.id
      );
      RETURN NEXT;
    ELSIF v_ack.response = 'refused' THEN
      -- F-B6-04: only a disposition bound to the *current* effective refusal counts
      SELECT d.* INTO v_disp
      FROM public.service_acknowledgment_dispositions d
      WHERE d.issued_revision_id = r.id
        AND d.acknowledgment_id = v_ack.id
      ORDER BY d.decided_at DESC, d.id DESC
      LIMIT 1;
      IF NOT FOUND THEN
        code := 'acknowledgment_refusal_disposition_pending';
        detail := format(
          'Job %s (%s) issued revision %s (id=%s) refused — manager disposition required',
          r.job_sequence, r.title, r.revision_number, r.id
        );
        RETURN NEXT;
      ELSIF v_disp.disposition = 'create_follow_up' THEN
        code := 'acknowledgment_refusal_follow_up_required';
        detail := format(
          'Job %s (%s) issued revision %s (id=%s) refused — follow-up disposition blocks closure',
          r.job_sequence, r.title, r.revision_number, r.id
        );
        RETURN NEXT;
      END IF;
    ELSIF v_ack.response NOT IN ('accepted', 'unavailable') THEN
      code := 'acknowledgment_unsettled';
      detail := format(
        'Job %s (%s) issued revision %s (id=%s) response=%s',
        r.job_sequence, r.title, r.revision_number, r.id, v_ack.response
      );
      RETURN NEXT;
    END IF;
  END LOOP;

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
REVOKE ALL ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) FROM service_role;

COMMENT ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) IS
  'B6: unavailable only when effective is unset or unavailable; distinct attributable contact evidence required.';
COMMENT ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) IS
  'B6: named closure prerequisites; refusal disposition must bind to current effective acknowledgment.';

