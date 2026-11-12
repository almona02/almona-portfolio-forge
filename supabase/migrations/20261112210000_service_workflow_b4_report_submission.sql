-- B4: technician report submission (append-only revisions).
-- One report root per visit. Attending technician only. Idempotent submit.
-- May move job in_progress → awaiting_review. Does NOT issue, complete job, or close ticket.
-- Preserves B2 report-family REVOKE INSERT/UPDATE/DELETE for authenticated/anon/service_role.
-- No admin routine editor / contract scheduler. No B5 review / B6 acknowledgment.
-- Do not apply to staging until Spark independent review PASS.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Revision payload extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_report_revisions
  ADD COLUMN IF NOT EXISTS work_performed text,
  ADD COLUMN IF NOT EXISTS no_labour boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS technician_declaration text,
  ADD COLUMN IF NOT EXISTS evidence_paths text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS checklist_results jsonb,
  ADD COLUMN IF NOT EXISTS client_submission_id uuid;

COMMENT ON COLUMN public.service_report_revisions.work_performed IS
  'B4: work performed narrative. Required on submit.';
COMMENT ON COLUMN public.service_report_revisions.no_labour IS
  'B4: explicit no-labour declaration when labour array is empty.';
COMMENT ON COLUMN public.service_report_revisions.technician_declaration IS
  'B4: technician attestation for the submitted revision.';
COMMENT ON COLUMN public.service_report_revisions.evidence_paths IS
  'B4: private ticket-attachments object names supporting this revision.';
COMMENT ON COLUMN public.service_report_revisions.checklist_results IS
  'B4: structured checklist results when visit has pinned_routine_version_id; else NULL.';
COMMENT ON COLUMN public.service_report_revisions.client_submission_id IS
  'B4: client idempotency key; retries with the same id return the existing revision.';

-- Backfill NOT NULL narrative columns for any pre-B4 rows (none expected on staging).
UPDATE public.service_report_revisions
SET work_performed = COALESCE(work_performed, findings),
    technician_declaration = COALESCE(technician_declaration, 'legacy-pre-b4')
WHERE work_performed IS NULL OR technician_declaration IS NULL;

ALTER TABLE public.service_report_revisions
  ALTER COLUMN work_performed SET NOT NULL,
  ALTER COLUMN technician_declaration SET NOT NULL;

ALTER TABLE public.service_report_revisions
  DROP CONSTRAINT IF EXISTS service_report_revisions_labour_xor_no_labour;
ALTER TABLE public.service_report_revisions
  ADD CONSTRAINT service_report_revisions_labour_xor_no_labour
  CHECK (
    (no_labour = true AND labour = '[]'::jsonb)
    OR (no_labour = false AND jsonb_typeof(labour) = 'array' AND jsonb_array_length(labour) >= 1)
  );

CREATE UNIQUE INDEX IF NOT EXISTS service_report_revisions_client_submission_uidx
  ON public.service_report_revisions (report_id, client_submission_id)
  WHERE client_submission_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Preserve / re-assert B2 direct-write revocations (do not weaken)
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.service_reports FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_report_revisions FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_report_reviews FROM authenticated, anon, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_acknowledgments FROM authenticated, anon, service_role;

GRANT SELECT ON public.service_reports, public.service_report_revisions,
  public.service_report_reviews, public.service_acknowledgments TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Narrow private evidence helpers (assigned job technician may use ticket folder)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.is_ticket_job_technician(p_ticket_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_jobs j
    WHERE j.ticket_id = p_ticket_id
      AND j.assigned_technician_id = p_uid
      AND j.state NOT IN ('cancelled', 'waived')
  );
$$;
REVOKE ALL ON FUNCTION admin_private.is_ticket_job_technician(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_private.is_ticket_job_technician(uuid, uuid) TO authenticated;

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
        )
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

DROP POLICY IF EXISTS ticket_attachments_insert ON storage.objects;
CREATE POLICY ticket_attachments_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND admin_private.caller_uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = admin_private.caller_uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(name))[1]
        AND (
          st.user_id = admin_private.caller_uid()
          OR st.assigned_to = admin_private.caller_uid()
          OR admin_private.caller_role() IN ('admin', 'support')
          OR admin_private.is_ticket_job_technician(st.id, admin_private.caller_uid())
        )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 4) Labour / evidence / checklist validators
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.validate_report_labour(
  p_labour jsonb,
  p_no_labour boolean
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  el jsonb;
  v_hours numeric;
  v_desc text;
BEGIN
  IF p_labour IS NULL OR jsonb_typeof(p_labour) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Labour must be a JSON array' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_no_labour, false) THEN
    IF jsonb_array_length(p_labour) <> 0 THEN
      RAISE EXCEPTION 'no_labour declaration requires an empty labour array'
        USING ERRCODE = '22023';
    END IF;
    RETURN;
  END IF;
  IF jsonb_array_length(p_labour) < 1 THEN
    RAISE EXCEPTION 'Labour entries required unless no_labour is declared'
      USING ERRCODE = '22023';
  END IF;
  FOR el IN SELECT value FROM jsonb_array_elements(p_labour)
  LOOP
    IF jsonb_typeof(el) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Each labour entry must be an object' USING ERRCODE = '22023';
    END IF;
    v_desc := nullif(btrim(COALESCE(el->>'description', '')), '');
    IF v_desc IS NULL THEN
      RAISE EXCEPTION 'Labour description required' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_hours := (el->>'hours')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Labour hours must be numeric' USING ERRCODE = '22023';
    END;
    IF v_hours IS NULL OR v_hours <= 0 THEN
      RAISE EXCEPTION 'Labour hours must be > 0' USING ERRCODE = '22023';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.validate_report_evidence_paths(
  p_ticket_id uuid,
  p_paths text[]
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private, storage
AS $$
DECLARE
  p text;
  v_folder text;
BEGIN
  IF p_paths IS NULL OR cardinality(p_paths) < 1 THEN
    RAISE EXCEPTION 'At least one supporting evidence attachment path is required'
      USING ERRCODE = '22023';
  END IF;
  FOREACH p IN ARRAY p_paths
  LOOP
    IF p IS NULL OR btrim(p) = '' THEN
      RAISE EXCEPTION 'Evidence path must be non-empty' USING ERRCODE = '22023';
    END IF;
    IF position('..' in p) > 0 OR p LIKE '/%' THEN
      RAISE EXCEPTION 'Invalid evidence path' USING ERRCODE = '22023';
    END IF;
    v_folder := (storage.foldername(p))[1];
    IF v_folder IS DISTINCT FROM p_ticket_id::text
       AND v_folder IS DISTINCT FROM admin_private.caller_uid()::text THEN
      RAISE EXCEPTION 'Evidence path must be under the ticket or submitter private folder'
        USING ERRCODE = '42501';
    END IF;
    IF NOT admin_private.can_read_ticket_attachment(p) THEN
      RAISE EXCEPTION 'Evidence path is not privately readable by the submitter'
        USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'ticket-attachments' AND o.name = p
    ) THEN
      RAISE EXCEPTION 'Evidence object not found in private ticket-attachments bucket'
        USING ERRCODE = 'P0002';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.validate_checklist_for_pin(
  p_visit public.service_job_visits,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  -- Integration contract only: when a routine version is pinned, require a JSON object
  -- of structured results. Do not hardcode machine-model checks or invent tolerances.
  IF p_visit.pinned_routine_version_id IS NULL THEN
    IF p_checklist IS NOT NULL THEN
      RAISE EXCEPTION 'checklist_results only allowed when a routine version is pinned'
        USING ERRCODE = '22023';
    END IF;
    RETURN;
  END IF;
  IF p_checklist IS NULL OR jsonb_typeof(p_checklist) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Pinned routine requires checklist_results JSON object'
      USING ERRCODE = '22023';
  END IF;
  IF NOT (p_checklist ? 'routine_version_id') THEN
    RAISE EXCEPTION 'checklist_results.routine_version_id required'
      USING ERRCODE = '22023';
  END IF;
  IF (p_checklist->>'routine_version_id') IS DISTINCT FROM p_visit.pinned_routine_version_id::text THEN
    RAISE EXCEPTION 'checklist_results.routine_version_id must match pinned_routine_version_id'
      USING ERRCODE = '22023';
  END IF;
  IF NOT (p_checklist ? 'items') OR jsonb_typeof(p_checklist->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'checklist_results.items array required' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Submit RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_service_report_revision(
  p_visit_id uuid,
  p_findings text,
  p_work_performed text,
  p_labour jsonb,
  p_no_labour boolean,
  p_verification_outcome text,
  p_verification_reason text DEFAULT NULL,
  p_technician_declaration text DEFAULT NULL,
  p_evidence_paths text[] DEFAULT NULL,
  p_checklist_results jsonb DEFAULT NULL,
  p_client_submission_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_report_revisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_ticket public.service_tickets;
  v_job public.service_jobs;
  v_visit public.service_job_visits;
  v_report public.service_reports;
  v_existing public.service_report_revisions;
  v_rev public.service_report_revisions;
  v_next int;
  v_from_job text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  -- Lock ticket → job → visit (F-B3-03 order).
  SELECT h.ticket, h.job, h.visit
  INTO v_ticket, v_job, v_visit
  FROM admin_private.lock_visit_hierarchy(p_visit_id) AS h;
  IF v_visit.id IS NULL THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_visit.state IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Reports may only be submitted for completed visits'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Only the current attending technician may submit. Staff cannot substitute.
  IF v_actor.role IS DISTINCT FROM 'technician'
     OR v_actor.uid IS DISTINCT FROM v_visit.attending_technician_id THEN
    RAISE EXCEPTION 'Only the attending technician for this visit may submit a report'
      USING ERRCODE = '42501';
  END IF;

  IF p_findings IS NULL OR btrim(p_findings) = '' THEN
    RAISE EXCEPTION 'Findings are required' USING ERRCODE = '22023';
  END IF;
  IF p_work_performed IS NULL OR btrim(p_work_performed) = '' THEN
    RAISE EXCEPTION 'Work performed is required' USING ERRCODE = '22023';
  END IF;
  IF p_technician_declaration IS NULL OR btrim(p_technician_declaration) = '' THEN
    RAISE EXCEPTION 'Technician declaration is required' USING ERRCODE = '22023';
  END IF;
  IF p_verification_outcome IS NULL OR p_verification_outcome NOT IN (
    'verified_fixed', 'not_reproduced', 'further_work_required', 'not_verified'
  ) THEN
    RAISE EXCEPTION 'Invalid verification_outcome' USING ERRCODE = '22023';
  END IF;
  IF p_verification_outcome IN ('not_reproduced', 'further_work_required', 'not_verified')
     AND (p_verification_reason IS NULL OR btrim(p_verification_reason) = '') THEN
    RAISE EXCEPTION 'verification_reason required for outcome %', p_verification_outcome
      USING ERRCODE = '22023';
  END IF;

  PERFORM admin_private.validate_report_labour(COALESCE(p_labour, '[]'::jsonb), COALESCE(p_no_labour, false));
  PERFORM admin_private.validate_report_evidence_paths(v_ticket.id, p_evidence_paths);
  PERFORM admin_private.validate_checklist_for_pin(v_visit, p_checklist_results);

  -- Ensure one report root per visit.
  INSERT INTO public.service_reports (visit_id)
  VALUES (v_visit.id)
  ON CONFLICT (visit_id) DO NOTHING;

  SELECT * INTO v_report
  FROM public.service_reports
  WHERE visit_id = v_visit.id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report root missing' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent retry: same client_submission_id returns the prior revision.
  IF p_client_submission_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.service_report_revisions
    WHERE report_id = v_report.id
      AND client_submission_id = p_client_submission_id;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_next
  FROM public.service_report_revisions
  WHERE report_id = v_report.id;

  INSERT INTO public.service_report_revisions (
    report_id,
    revision_number,
    findings,
    work_performed,
    labour,
    no_labour,
    verification_outcome,
    verification_reason,
    technician_declaration,
    evidence_paths,
    checklist_results,
    client_submission_id,
    submitted_by
  ) VALUES (
    v_report.id,
    v_next,
    btrim(p_findings),
    btrim(p_work_performed),
    COALESCE(p_labour, '[]'::jsonb),
    COALESCE(p_no_labour, false),
    p_verification_outcome,
    nullif(btrim(COALESCE(p_verification_reason, '')), ''),
    btrim(p_technician_declaration),
    p_evidence_paths,
    p_checklist_results,
    p_client_submission_id,
    v_actor.uid
  )
  RETURNING * INTO v_rev;

  -- Persist checklist snapshot on the visit when pinned (append-only semantics via report).
  IF v_visit.pinned_routine_version_id IS NOT NULL THEN
    UPDATE public.service_job_visits
    SET checklist_results = p_checklist_results,
        updated_at = now()
    WHERE id = v_visit.id;
  END IF;

  -- Job may move to awaiting_review; never complete / issue / close ticket here.
  IF v_job.state = 'in_progress' THEN
    v_from_job := v_job.state;
    UPDATE public.service_jobs
    SET state = 'awaiting_review',
        updated_at = now()
    WHERE id = v_job.id
    RETURNING * INTO v_job;

    PERFORM admin_private.workflow_audit(
      v_ticket.id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
      'job_transition', v_from_job, 'awaiting_review', 'report submitted',
      jsonb_build_object(
        'report_id', v_report.id,
        'revision_id', v_rev.id,
        'revision_number', v_rev.revision_number,
        'visit_id', v_visit.id
      )
    );
  ELSIF v_job.state = 'awaiting_review' THEN
    NULL; -- additional revisions while already awaiting review
  ELSIF v_job.state IN ('completed', 'cancelled', 'waived') THEN
    RAISE EXCEPTION 'Cannot submit report against terminal job state %', v_job.state
      USING ERRCODE = 'check_violation';
  ELSE
    RAISE EXCEPTION 'Job state % cannot accept report submission', v_job.state
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM admin_private.workflow_audit(
    v_ticket.id, 'service_report_revision', v_rev.id, v_actor.uid, v_actor.role,
    'submit_report_revision', NULL, NULL, NULL,
    jsonb_build_object(
      'report_id', v_report.id,
      'visit_id', v_visit.id,
      'revision_number', v_rev.revision_number,
      'client_submission_id', p_client_submission_id,
      'verification_outcome', p_verification_outcome,
      'no_labour', COALESCE(p_no_labour, false)
    )
  );

  RETURN v_rev;
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent insert with same client_submission_id: return winner.
    IF p_client_submission_id IS NOT NULL THEN
      SELECT * INTO v_existing
      FROM public.service_report_revisions
      WHERE report_id = (
        SELECT id FROM public.service_reports WHERE visit_id = p_visit_id
      )
        AND client_submission_id = p_client_submission_id;
      IF FOUND THEN
        RETURN v_existing;
      END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_service_report_revision(
  uuid, text, text, jsonb, boolean, text, text, text, text[], jsonb, uuid, uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_service_report_revision(
  uuid, text, text, jsonb, boolean, text, text, text, text[], jsonb, uuid, uuid
) TO authenticated;
-- service_role: no broad write exception; disposable tests use authenticated JWT actors.
REVOKE EXECUTE ON FUNCTION public.submit_service_report_revision(
  uuid, text, text, jsonb, boolean, text, text, text, text[], jsonb, uuid, uuid
) FROM anon, service_role;

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
BEGIN
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id;
  IF NOT admin_private.can_read_ticket_workflow(v_job.ticket_id) THEN
    RAISE EXCEPTION 'Not authorized to read report' USING ERRCODE = '42501';
  END IF;
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
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_service_report_for_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_service_report_for_visit(uuid) TO authenticated;

COMMIT;
