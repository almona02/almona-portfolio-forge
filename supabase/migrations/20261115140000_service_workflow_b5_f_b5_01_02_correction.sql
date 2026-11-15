-- B5 correction: F-B5-01 (issued evidence owner reads) + F-B5-02 (completion/return stranding).
-- Narrow follow-on to 20261115120000_service_workflow_b5_manager_review.sql @ f8fb9358.
-- Do not apply to staging until Spark targeted re-verification PASS.
-- #155 frozen; #156 draft; no merge / production / B6.

BEGIN;

-- ---------------------------------------------------------------------------
-- F-B5-01: owners may read objects listed on a customer-visible issued revision.
-- Keep unissued / cross-ticket denied. Preserve staff + message-attachment paths.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.can_read_ticket_attachment(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT CASE
    WHEN admin_private.caller_uid() IS NULL THEN false
    WHEN admin_private.caller_role() IN ('admin', 'support') THEN true
    WHEN (storage.foldername(object_name))[1] = admin_private.caller_uid()::text THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(object_name))[1]
        AND (
          st.assigned_to = admin_private.caller_uid()
          OR admin_private.is_ticket_job_technician(st.id, admin_private.caller_uid())
          OR admin_private.is_ticket_visit_attending_technician(st.id, admin_private.caller_uid())
        )
    ) THEN true
    -- Issued report evidence on a caller-owned ticket (customer view downloads).
    WHEN EXISTS (
      SELECT 1
      FROM public.service_report_revisions rev
      JOIN public.service_reports rep ON rep.id = rev.report_id
      JOIN public.service_job_visits v ON v.id = rep.visit_id
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets st ON st.id = j.ticket_id
      WHERE st.id::text = (storage.foldername(object_name))[1]
        AND st.user_id = admin_private.caller_uid()
        AND object_name = ANY (rev.evidence_paths)
        AND admin_private.revision_is_customer_visible(rev.id)
    ) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.ticket_messages m
      JOIN public.service_tickets st ON st.id = m.ticket_id
      WHERE st.id::text = (storage.foldername(object_name))[1]
        AND st.user_id = admin_private.caller_uid()
        AND COALESCE(m.is_internal_note, false) = false
        AND COALESCE(m.message_type, 'message') IS DISTINCT FROM 'internal_note'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(m.attachments, '[]'::jsonb)) att
          WHERE COALESCE(
            nullif(att->>'storage_path', ''),
            nullif(substring(att->>'url' from 'ticket-attachments/(.+)$'), '')
          ) = object_name
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION admin_private.can_read_ticket_attachment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_read_ticket_attachment(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- F-B5-02: do not complete while a completed visit lacks any submitted revision;
-- deny return on terminal jobs (resubmit path would be dead-ended by B4).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_service_report_revision(
  p_revision_id uuid,
  p_decision text,
  p_comments text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_report_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_rev public.service_report_revisions;
  v_report public.service_reports;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_hier record;
  v_review public.service_report_reviews;
  v_existing public.service_report_reviews;
  v_from_job text;
  v_can_complete boolean := false;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may review reports' USING ERRCODE = '42501';
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('approved_issued', 'returned') THEN
    RAISE EXCEPTION 'Invalid review decision' USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'returned'
     AND (p_comments IS NULL OR btrim(p_comments) = '') THEN
    RAISE EXCEPTION 'Return requires comments' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_rev FROM public.service_report_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_report FROM public.service_reports WHERE id = v_rev.report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report root missing' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(v_report.visit_id);
  v_job := v_hier.job;
  v_visit := v_hier.visit;

  SELECT * INTO v_report FROM public.service_reports WHERE id = v_rev.report_id FOR UPDATE;
  SELECT * INTO v_rev FROM public.service_report_revisions WHERE id = p_revision_id FOR UPDATE;

  IF v_rev.submitted_by IS NOT DISTINCT FROM v_actor.uid THEN
    RAISE EXCEPTION 'Authors cannot review their own report revision'
      USING ERRCODE = '42501';
  END IF;

  -- Deciding review first (conflicts / idempotency beat terminal-state checks).
  SELECT * INTO v_existing
  FROM public.service_report_reviews
  WHERE revision_id = v_rev.id;
  IF FOUND THEN
    IF v_existing.decision IS NOT DISTINCT FROM p_decision
       AND COALESCE(v_existing.comments, '')
           IS NOT DISTINCT FROM COALESCE(nullif(btrim(COALESCE(p_comments, '')), ''), '')
       AND v_existing.reviewer_id IS NOT DISTINCT FROM v_actor.uid THEN
      RETURN v_existing;
    END IF;
    RAISE EXCEPTION 'Revision already has a deciding review'
      USING ERRCODE = '23505';
  END IF;

  -- F-B5-02: returning an undecided revision on a terminal job cannot be corrected
  -- (B4 blocks submit). Decided revisions already handled above.
  IF p_decision = 'returned'
     AND v_job.state IN ('completed', 'cancelled', 'waived') THEN
    RAISE EXCEPTION 'Cannot return report on terminal job state %', v_job.state
      USING ERRCODE = 'check_violation';
  END IF;

  BEGIN
    INSERT INTO public.service_report_reviews (
      revision_id, reviewer_id, decision, comments
    ) VALUES (
      v_rev.id,
      v_actor.uid,
      p_decision,
      nullif(btrim(COALESCE(p_comments, '')), '')
    )
    RETURNING * INTO v_review;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_existing
      FROM public.service_report_reviews WHERE revision_id = v_rev.id;
      IF FOUND THEN
        RETURN v_existing;
      END IF;
      RAISE;
  END;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_report_review', v_review.id, v_actor.uid, v_actor.role,
    CASE WHEN p_decision = 'approved_issued' THEN 'approve_issue_report' ELSE 'return_report' END,
    NULL, NULL, nullif(btrim(COALESCE(p_comments, '')), ''),
    jsonb_build_object(
      'revision_id', v_rev.id,
      'report_id', v_report.id,
      'visit_id', v_visit.id,
      'job_id', v_job.id,
      'decision', p_decision,
      'verification_outcome', v_rev.verification_outcome,
      'revision_number', v_rev.revision_number
    )
  );

  IF p_decision = 'returned' THEN
    IF v_job.state = 'awaiting_review' THEN
      v_from_job := v_job.state;
      UPDATE public.service_jobs
      SET state = 'in_progress', updated_at = now()
      WHERE id = v_job.id
      RETURNING * INTO v_job;
      PERFORM admin_private.workflow_audit(
        v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
        'job_transition', v_from_job, 'in_progress', 'report returned for correction',
        jsonb_build_object('revision_id', v_rev.id, 'review_id', v_review.id)
      );
    END IF;
    RETURN v_review;
  END IF;

  -- approved_issued: complete only when eligible.
  -- further_work_required must NOT complete.
  -- F-B5-02: every completed visit must already have a submitted revision.
  v_can_complete :=
    v_job.state IN ('awaiting_review', 'in_progress')
    AND v_rev.verification_outcome IS DISTINCT FROM 'further_work_required'
    AND NOT EXISTS (
      SELECT 1 FROM public.service_job_visits vv
      WHERE vv.job_id = v_job.id AND vv.state IN ('scheduled', 'in_progress')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.service_job_visits vv
      WHERE vv.job_id = v_job.id
        AND vv.state = 'completed'
        AND NOT EXISTS (
          SELECT 1
          FROM public.service_reports r
          JOIN public.service_report_revisions rev ON rev.report_id = r.id
          WHERE r.visit_id = vv.id
        )
    );

  IF v_can_complete THEN
    v_from_job := v_job.state;
    UPDATE public.service_jobs
    SET state = 'completed',
        completing_revision_id = v_rev.id,
        updated_at = now()
    WHERE id = v_job.id
    RETURNING * INTO v_job;
    PERFORM admin_private.workflow_audit(
      v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
      'job_transition', v_from_job, 'completed', 'report approved and issued',
      jsonb_build_object(
        'completing_revision_id', v_rev.id,
        'review_id', v_review.id,
        'verification_outcome', v_rev.verification_outcome
      )
    );
  END IF;

  RETURN v_review;
END;
$$;

REVOKE ALL ON FUNCTION public.review_service_report_revision(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_service_report_revision(uuid, text, text, uuid)
  TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.review_service_report_revision(uuid, text, text, uuid) FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.service_reports FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_report_revisions FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_report_reviews FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_acknowledgments FROM authenticated, anon, service_role;

COMMIT;
