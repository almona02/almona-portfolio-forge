-- DO-3 disposable deps. TEST-ONLY. Never staging/production.
-- Adds customer-visible issued-head helper + acknowledgment tables for chip predicates.

ALTER TABLE public.service_report_revisions
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION admin_private.revision_is_customer_visible(p_revision_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_report_reviews rv ON rv.revision_id = r.id AND rv.decision = 'approved_issued'
    WHERE r.id = p_revision_id
      AND admin_private.can_read_ticket_workflow(j.ticket_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.service_report_revisions r2
        JOIN public.service_report_reviews rv2
          ON rv2.revision_id = r2.id AND rv2.decision = 'approved_issued'
        WHERE r2.report_id = r.report_id
          AND (
            r2.revision_number > r.revision_number
            OR (r2.revision_number = r.revision_number AND r2.id > r.id)
          )
      )
  );
$$;

REVOKE ALL ON FUNCTION admin_private.revision_is_customer_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.revision_is_customer_visible(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.service_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issued_revision_id uuid NOT NULL REFERENCES public.service_report_revisions(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('accepted', 'refused', 'unavailable')),
  comment text,
  responded_by uuid,
  responded_at timestamptz NOT NULL DEFAULT now(),
  event_seq bigint NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS service_acknowledgments_revision_idx
  ON public.service_acknowledgments (issued_revision_id, event_seq DESC);

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

REVOKE ALL ON FUNCTION public.effective_acknowledgment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment(uuid) TO authenticated;

-- Align report getter with production customer path (visible heads only for non-staff).
CREATE OR REPLACE FUNCTION public.get_service_report_for_visit(p_visit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket_id uuid;
  v_report public.service_reports%ROWTYPE;
  v_revs jsonb;
  v_role text := admin_private.caller_role();
  v_staff boolean;
BEGIN
  SELECT j.ticket_id INTO v_ticket_id
  FROM public.service_job_visits v
  JOIN public.service_jobs j ON j.id = v.job_id
  WHERE v.id = p_visit_id;
  IF v_ticket_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT admin_private.can_read_ticket_workflow(v_ticket_id) THEN
    RAISE EXCEPTION 'Not authorized to read report' USING ERRCODE = '42501';
  END IF;
  v_staff := v_role IN ('admin', 'support', 'technician');
  SELECT * INTO v_report FROM public.service_reports WHERE visit_id = p_visit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('report', NULL, 'revisions', '[]'::jsonb);
  END IF;
  SELECT COALESCE(
    jsonb_agg(row_to_json(r)::jsonb ORDER BY r.revision_number),
    '[]'::jsonb
  )
  INTO v_revs
  FROM public.service_report_revisions r
  WHERE r.report_id = v_report.id
    AND (v_staff OR admin_private.revision_is_customer_visible(r.id));
  RETURN jsonb_build_object(
    'report', row_to_json(v_report)::jsonb,
    'revisions', v_revs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_service_report_for_visit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_report_for_visit(uuid) TO authenticated, service_role;
