-- B6: customer acknowledgment + manager disposition + closure prerequisites.
-- Append-only acknowledgments; derived effective response; unavailable requires
-- attributable contact evidence (no hardcoded calendar waiting period).
-- Refusal needs audited disposition before close. Never convert refusal/unavailable
-- into acceptance. Enforce on every resolve/close path; legacy jobless retained.
-- Do NOT apply to staging until Spark PASS on a separate B6 freeze.
-- #155 frozen; #156 draft; no merge / production.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Schema: contact evidence on acknowledgments + disposition table
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_acknowledgments
  ADD COLUMN IF NOT EXISTS contact_attempts jsonb;

COMMENT ON COLUMN public.service_acknowledgments.contact_attempts IS
  'Required for response=unavailable: attributable attempt array per B6 contact policy. Null for accepted/refused.';

CREATE TABLE IF NOT EXISTS public.service_acknowledgment_dispositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issued_revision_id uuid NOT NULL REFERENCES public.service_report_revisions(id) ON DELETE CASCADE,
  acknowledgment_id uuid NOT NULL REFERENCES public.service_acknowledgments(id) ON DELETE CASCADE,
  disposition text NOT NULL CHECK (disposition IN ('accept_refusal_and_proceed', 'create_follow_up')),
  rationale text NOT NULL CHECK (length(trim(rationale)) > 0),
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_ack_dispositions_revision_idx
  ON public.service_acknowledgment_dispositions (issued_revision_id, decided_at DESC, id DESC);

COMMENT ON TABLE public.service_acknowledgment_dispositions IS
  'Append-only manager dispositions for refused acknowledgments. Effective = latest by (decided_at, id).';

ALTER TABLE public.service_acknowledgment_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_ack_dispositions_select ON public.service_acknowledgment_dispositions;
CREATE POLICY service_ack_dispositions_select ON public.service_acknowledgment_dispositions
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR EXISTS (
    SELECT 1
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE r.id = issued_revision_id AND t.user_id = admin_private.caller_uid()
  )
);
CREATE POLICY service_ack_dispositions_no_client_write ON public.service_acknowledgment_dispositions
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_ack_dispositions_no_client_update ON public.service_acknowledgment_dispositions
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_ack_dispositions_no_client_delete ON public.service_acknowledgment_dispositions
FOR DELETE TO authenticated USING (false);

GRANT SELECT ON public.service_acknowledgment_dispositions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_acknowledgment_dispositions
  FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_acknowledgments
  FROM authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION admin_private.service_ack_disposition_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'service_acknowledgment_dispositions are immutable' USING ERRCODE = 'check_violation';
END;
$$;
DROP TRIGGER IF EXISTS trg_ack_disposition_immutable ON public.service_acknowledgment_dispositions;
CREATE TRIGGER trg_ack_disposition_immutable
  BEFORE UPDATE OR DELETE ON public.service_acknowledgment_dispositions
  FOR EACH ROW EXECUTE FUNCTION admin_private.service_ack_disposition_immutable();

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_acknowledgment_disposition(p_revision_id uuid)
RETURNS public.service_acknowledgment_dispositions
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT d.*
  FROM public.service_acknowledgment_dispositions d
  WHERE d.issued_revision_id = p_revision_id
  ORDER BY d.decided_at DESC, d.id DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION admin_private.assert_revision_is_issued(p_revision_id uuid)
RETURNS public.service_report_revisions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_rev public.service_report_revisions;
  v_latest uuid;
BEGIN
  SELECT * INTO v_rev FROM public.service_report_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.service_report_reviews rv
    WHERE rv.revision_id = p_revision_id AND rv.decision = 'approved_issued'
  ) THEN
    RAISE EXCEPTION 'Acknowledgment requires an issued revision' USING ERRCODE = 'check_violation';
  END IF;
  v_latest := public.latest_issued_revision_id(v_rev.report_id);
  -- Allow ack of any historically issued revision (history), but closure gates
  -- evaluate customer-visible issued heads via evaluate_ticket_workflow_prerequisites.
  IF v_latest IS NULL THEN
    RAISE EXCEPTION 'Acknowledgment requires an issued revision' USING ERRCODE = 'check_violation';
  END IF;
  RETURN v_rev;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.ticket_id_for_revision(p_revision_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT j.ticket_id
  FROM public.service_report_revisions r
  JOIN public.service_reports rep ON rep.id = r.report_id
  JOIN public.service_job_visits v ON v.id = rep.visit_id
  JOIN public.service_jobs j ON j.id = v.job_id
  WHERE r.id = p_revision_id;
$$;

CREATE OR REPLACE FUNCTION admin_private.validate_unavailable_contact_attempts(p_attempts jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_elem jsonb;
  v_count int := 0;
  v_notify int := 0;
  v_follow int := 0;
  v_at text;
  v_channel text;
  v_outcome text;
  v_by text;
  v_ts timestamptz;
  v_uid uuid;
BEGIN
  IF p_attempts IS NULL OR jsonb_typeof(p_attempts) <> 'array' THEN
    RAISE EXCEPTION 'unavailable requires contact_attempts array' USING ERRCODE = '22023';
  END IF;
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_attempts)
  LOOP
    v_count := v_count + 1;
    v_at := v_elem->>'attempted_at';
    v_channel := nullif(trim(COALESCE(v_elem->>'channel', '')), '');
    v_outcome := nullif(trim(COALESCE(v_elem->>'outcome', '')), '');
    v_by := nullif(trim(COALESCE(v_elem->>'by_actor_id', '')), '');
    IF v_at IS NULL OR v_at = '' THEN
      RAISE EXCEPTION 'contact attempt missing attempted_at' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_ts := v_at::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'contact attempt attempted_at must be timestamptz' USING ERRCODE = '22023';
    END;
    IF v_channel IS NULL THEN
      RAISE EXCEPTION 'contact attempt missing channel' USING ERRCODE = '22023';
    END IF;
    IF v_outcome IS NULL THEN
      RAISE EXCEPTION 'contact attempt missing outcome' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_uid := v_by::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'contact attempt missing attributable by_actor_id' USING ERRCODE = '22023';
    END;
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'contact attempt missing attributable by_actor_id' USING ERRCODE = '22023';
    END IF;
    IF lower(v_channel) IN ('in_app_notification', 'issue_notification', 'notification') THEN
      v_notify := v_notify + 1;
    ELSE
      v_follow := v_follow + 1;
    END IF;
  END LOOP;
  -- Policy minimum: issue notification + two further attributable attempts.
  -- No calendar/interval hardcode.
  IF v_notify < 1 OR v_follow < 2 OR v_count < 3 THEN
    RAISE EXCEPTION
      'unavailable contact evidence insufficient (need issue notification + two further attributable attempts)'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Record acknowledgment (customer accepted/refused)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_service_acknowledgment(
  p_issued_revision_id uuid,
  p_response text,
  p_comment text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_acknowledgments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_rev public.service_report_revisions;
  v_ticket_id uuid;
  v_owner uuid;
  v_existing public.service_acknowledgments;
  v_row public.service_acknowledgments;
  v_comment text := nullif(trim(COALESCE(p_comment, '')), '');
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF p_response IS NULL OR p_response NOT IN ('accepted', 'refused') THEN
    RAISE EXCEPTION 'Customer acknowledgment response must be accepted or refused'
      USING ERRCODE = '22023';
  END IF;
  IF p_response = 'refused' AND v_comment IS NULL THEN
    RAISE EXCEPTION 'Refusal requires a comment' USING ERRCODE = '22023';
  END IF;

  v_rev := admin_private.assert_revision_is_issued(p_issued_revision_id);
  v_ticket_id := admin_private.ticket_id_for_revision(p_issued_revision_id);
  PERFORM pg_advisory_xact_lock(hashtext('b6_ack:' || v_ticket_id::text));

  SELECT user_id INTO v_owner FROM public.service_tickets WHERE id = v_ticket_id FOR UPDATE;
  IF v_owner IS DISTINCT FROM v_actor.uid THEN
    RAISE EXCEPTION 'Only the ticket owner may acknowledge an issued report' USING ERRCODE = '42501';
  END IF;
  -- Ownership-based (not role=customer). Sales-role owners may use this RPC;
  -- UI may still fail-closed on role — see B6_PERMISSION_MATRIX.md.

  SELECT * INTO v_existing FROM public.effective_acknowledgment(p_issued_revision_id);
  IF v_existing.id IS NOT NULL
     AND v_existing.response = p_response
     AND v_existing.responded_by = v_actor.uid
     AND COALESCE(v_existing.comment, '') = COALESCE(v_comment, '')
     AND v_existing.contact_attempts IS NULL
  THEN
    RETURN v_existing; -- idempotent repeat
  END IF;

  INSERT INTO public.service_acknowledgments (
    issued_revision_id, response, comment, responded_by, contact_attempts
  ) VALUES (
    p_issued_revision_id, p_response, v_comment, v_actor.uid, NULL
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_ticket_id, 'acknowledgment', v_row.id, v_actor.uid, v_actor.role,
    'record_acknowledgment', NULL, p_response, v_comment,
    jsonb_build_object(
      'issued_revision_id', p_issued_revision_id,
      'revision_number', v_rev.revision_number,
      'note', 'Does not clear safety restrictions or imply return-to-service'
    )
  );
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Staff unavailable
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_service_acknowledgment_unavailable(
  p_issued_revision_id uuid,
  p_contact_attempts jsonb,
  p_rationale text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_acknowledgments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_rev public.service_report_revisions;
  v_ticket_id uuid;
  v_existing public.service_acknowledgments;
  v_row public.service_acknowledgments;
  v_rationale text := nullif(trim(COALESCE(p_rationale, '')), '');
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may record unavailable acknowledgment' USING ERRCODE = '42501';
  END IF;
  IF v_rationale IS NULL THEN
    RAISE EXCEPTION 'unavailable requires a rationale' USING ERRCODE = '22023';
  END IF;
  PERFORM admin_private.validate_unavailable_contact_attempts(p_contact_attempts);

  v_rev := admin_private.assert_revision_is_issued(p_issued_revision_id);
  v_ticket_id := admin_private.ticket_id_for_revision(p_issued_revision_id);
  PERFORM pg_advisory_xact_lock(hashtext('b6_ack:' || v_ticket_id::text));
  PERFORM 1 FROM public.service_tickets WHERE id = v_ticket_id FOR UPDATE;

  SELECT * INTO v_existing FROM public.effective_acknowledgment(p_issued_revision_id);
  IF v_existing.id IS NOT NULL
     AND v_existing.response = 'unavailable'
     AND v_existing.responded_by = v_actor.uid
     AND COALESCE(v_existing.comment, '') = v_rationale
     AND v_existing.contact_attempts IS NOT DISTINCT FROM p_contact_attempts
  THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.service_acknowledgments (
    issued_revision_id, response, comment, responded_by, contact_attempts
  ) VALUES (
    p_issued_revision_id, 'unavailable', v_rationale, v_actor.uid, p_contact_attempts
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_ticket_id, 'acknowledgment', v_row.id, v_actor.uid, v_actor.role,
    'record_acknowledgment_unavailable', NULL, 'unavailable', v_rationale,
    jsonb_build_object(
      'issued_revision_id', p_issued_revision_id,
      'revision_number', v_rev.revision_number,
      'contact_attempt_count', jsonb_array_length(p_contact_attempts),
      'note', 'unavailable is not acceptance; does not imply return-to-service'
    )
  );
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Manager disposition for refusal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_acknowledgment_disposition(
  p_issued_revision_id uuid,
  p_disposition text,
  p_rationale text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_acknowledgment_dispositions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_ack public.service_acknowledgments;
  v_ticket_id uuid;
  v_existing public.service_acknowledgment_dispositions;
  v_row public.service_acknowledgment_dispositions;
  v_rationale text := nullif(trim(COALESCE(p_rationale, '')), '');
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may record acknowledgment disposition' USING ERRCODE = '42501';
  END IF;
  IF p_disposition IS NULL OR p_disposition NOT IN ('accept_refusal_and_proceed', 'create_follow_up') THEN
    RAISE EXCEPTION 'Invalid disposition' USING ERRCODE = '22023';
  END IF;
  IF v_rationale IS NULL THEN
    RAISE EXCEPTION 'Disposition requires a rationale' USING ERRCODE = '22023';
  END IF;

  PERFORM admin_private.assert_revision_is_issued(p_issued_revision_id);
  v_ticket_id := admin_private.ticket_id_for_revision(p_issued_revision_id);
  PERFORM pg_advisory_xact_lock(hashtext('b6_ack:' || v_ticket_id::text));
  PERFORM 1 FROM public.service_tickets WHERE id = v_ticket_id FOR UPDATE;

  SELECT * INTO v_ack FROM public.effective_acknowledgment(p_issued_revision_id);
  IF v_ack.id IS NULL OR v_ack.response <> 'refused' THEN
    RAISE EXCEPTION 'Disposition requires effective acknowledgment response=refused'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_existing FROM public.effective_acknowledgment_disposition(p_issued_revision_id);
  IF v_existing.id IS NOT NULL
     AND v_existing.disposition = p_disposition
     AND v_existing.decided_by = v_actor.uid
     AND v_existing.rationale = v_rationale
     AND v_existing.acknowledgment_id = v_ack.id
  THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.service_acknowledgment_dispositions (
    issued_revision_id, acknowledgment_id, disposition, rationale, decided_by
  ) VALUES (
    p_issued_revision_id, v_ack.id, p_disposition, v_rationale, v_actor.uid
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_ticket_id, 'acknowledgment_disposition', v_row.id, v_actor.uid, v_actor.role,
    'record_acknowledgment_disposition', 'refused', p_disposition, v_rationale,
    jsonb_build_object(
      'issued_revision_id', p_issued_revision_id,
      'acknowledgment_id', v_ack.id,
      'note', 'Disposition does not convert refusal into acceptance'
    )
  );
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Prerequisites: replace B1 acknowledgment stub; add completing-report +
--    resolution summary checks
-- ---------------------------------------------------------------------------
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
REVOKE ALL ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_acknowledgment_disposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment_disposition(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_acknowledgment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) FROM service_role;

COMMENT ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) IS
  'B6: ticket owner records accepted/refused for an exact issued revision (append-only).';
COMMENT ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) IS
  'B6: admin/support records unavailable with attributable contact evidence (no calendar hardcode).';
COMMENT ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) IS
  'B6: admin/support disposition for refused acknowledgment before closure.';

COMMIT;
