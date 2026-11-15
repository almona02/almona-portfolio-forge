-- F-B6-09: effective acknowledgment/disposition selection must follow serialized
-- event order. PostgreSQL now()/CURRENT_TIMESTAMP is transaction-start time;
-- under per-ticket advisory serialization, a later writer can receive a higher
-- event_seq while retaining an earlier responded_at/decided_at. Ordering by
-- timestamp first lets the older response win incorrectly and feed closure.
--
-- Fix: event_seq is authoritative; timestamps remain for chronology/display.
-- Sequence defaults fire at INSERT, which writers perform after
-- pg_advisory_xact_lock(b6_ack:<ticket>) — allocation is inside that lock.
-- Disposable/local only — no staging apply.

CREATE OR REPLACE FUNCTION public.effective_acknowledgment(p_revision_id uuid)
RETURNS public.service_acknowledgments
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT a.*
  FROM public.service_acknowledgments a
  WHERE a.issued_revision_id = p_revision_id
  ORDER BY a.event_seq DESC, a.id DESC
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
  ORDER BY d.event_seq DESC, d.id DESC
  LIMIT 1;
$$;

COMMENT ON COLUMN public.service_acknowledgments.event_seq IS
  'Authoritative serialized ack order (allocated at INSERT under b6_ack advisory lock). Timestamps are chronological/display only.';
COMMENT ON COLUMN public.service_acknowledgment_dispositions.event_seq IS
  'Authoritative serialized disposition order (allocated at INSERT under b6_ack advisory lock). Timestamps are chronological/display only.';
COMMENT ON FUNCTION public.effective_acknowledgment(uuid) IS
  'Effective ack = highest event_seq for the revision (F-B6-09).';
COMMENT ON FUNCTION public.effective_acknowledgment_disposition(uuid) IS
  'Effective disposition = highest event_seq for the revision (F-B6-09).';

-- Prerequisites: same event_seq-authoritative order when selecting disposition
-- bound to the current effective refusal (acknowledgment_id binding unchanged).
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
      ORDER BY d.event_seq DESC, d.id DESC
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

REVOKE ALL ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.effective_acknowledgment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_acknowledgment_disposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment_disposition(uuid) TO authenticated;
