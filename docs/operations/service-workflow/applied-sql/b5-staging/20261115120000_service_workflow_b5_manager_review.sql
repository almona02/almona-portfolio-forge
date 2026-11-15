-- B5: manager review / issue of submitted report revisions.
-- Approve+issue is atomic (review row + audit; job may complete when eligible).
-- Return requires comments; job returns to in_progress; author submits a new revision (B4).
-- Does NOT implement acknowledgment or ticket closure (B6).
-- Preserve B1–B4 direct-write revocations, actor checks, historical authorship.
-- Do not apply to staging until Spark independent review PASS on a separate freeze.
-- #155 frozen; #156 draft; no merge / production.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Align revision SELECT with getter visibility (non-customer-role gap)
-- Staff/technician: all revisions on workflow-readable tickets.
-- Other workflow readers (ticket owner): latest issued only via
-- revision_is_customer_visible — not a hard-coded role = 'customer' check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS service_report_revisions_select ON public.service_report_revisions;
CREATE POLICY service_report_revisions_select ON public.service_report_revisions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_reports r
    JOIN public.service_job_visits v ON v.id = r.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE r.id = report_id
      AND admin_private.can_read_ticket_workflow(j.ticket_id)
      AND (
        admin_private.caller_role() IN ('admin', 'support', 'technician')
        OR admin_private.revision_is_customer_visible(service_report_revisions.id)
      )
  )
);

CREATE OR REPLACE FUNCTION public.get_service_report_for_visit(p_visit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_report public.service_reports;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_role text := admin_private.caller_role();
  v_staff boolean;
BEGIN
  IF admin_private.caller_uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized to read report' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id;
  IF NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not authorized to read report' USING ERRCODE = '42501';
  END IF;

  v_staff := v_role IN ('admin', 'support', 'technician');

  SELECT * INTO v_report FROM public.service_reports WHERE visit_id = p_visit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('report', NULL, 'revisions', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'report', to_jsonb(v_report),
    'revisions', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.revision_number)
      FROM public.service_report_revisions r
      WHERE r.report_id = v_report.id
        AND (
          v_staff
          OR admin_private.revision_is_customer_visible(r.id)
        )
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_service_report_for_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_service_report_for_visit(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_service_report_for_visit(uuid) FROM anon, service_role;

-- ---------------------------------------------------------------------------
-- 2) Review / issue RPC
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

  -- Lock ticket → job → visit (F-B3-03), then report/revision.
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(v_report.visit_id);
  v_job := v_hier.job;
  v_visit := v_hier.visit;

  SELECT * INTO v_report FROM public.service_reports WHERE id = v_rev.report_id FOR UPDATE;
  SELECT * INTO v_rev FROM public.service_report_revisions WHERE id = p_revision_id FOR UPDATE;

  -- Authors cannot review their own work (including after role change).
  IF v_rev.submitted_by IS NOT DISTINCT FROM v_actor.uid THEN
    RAISE EXCEPTION 'Authors cannot review their own report revision'
      USING ERRCODE = '42501';
  END IF;

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

  -- approved_issued: complete job only when eligible.
  -- further_work_required must NOT complete (not an RTS decision).
  v_can_complete :=
    v_job.state IN ('awaiting_review', 'in_progress')
    AND v_rev.verification_outcome IS DISTINCT FROM 'further_work_required'
    AND NOT EXISTS (
      SELECT 1 FROM public.service_job_visits vv
      WHERE vv.job_id = v_job.id AND vv.state IN ('scheduled', 'in_progress')
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

-- Re-assert report-family direct-write revocations (do not weaken).
REVOKE INSERT, UPDATE, DELETE ON public.service_reports FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_report_revisions FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_report_reviews FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_acknowledgments FROM authenticated, anon, service_role;

COMMIT;
