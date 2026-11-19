-- DO-2 disposable deps. TEST-ONLY. Never staging/production.
-- Extends Lane C / coverage stubs for visits windowing, reviews, and staging-eq job/visit RLS.

ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS machine_serial_number text,
  ADD COLUMN IF NOT EXISTS site_location text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'maintenance',
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS maintenance_type text;

ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS visit_sequence integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz;

CREATE TABLE IF NOT EXISTS public.service_report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.service_report_revisions(id) ON DELETE CASCADE,
  reviewer_id uuid,
  decision text NOT NULL CHECK (decision IN ('approved_issued', 'returned')),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_report_reviews_one_per_revision
  ON public.service_report_reviews (revision_id);

CREATE TABLE IF NOT EXISTS public.service_job_routine_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  routine_id uuid,
  routine_version_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'unpinned')),
  pinned_at timestamptz NOT NULL DEFAULT now()
);

-- Owner/superuser would otherwise bypass RLS; FORCE matches staging-eq client behavior.
ALTER TABLE public.service_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_report_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_routine_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_jobs_select ON public.service_jobs;
CREATE POLICY service_jobs_select ON public.service_jobs
FOR SELECT TO authenticated
USING (admin_private.can_read_ticket_workflow(ticket_id));

DROP POLICY IF EXISTS service_job_visits_select ON public.service_job_visits;
CREATE POLICY service_job_visits_select ON public.service_job_visits
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_jobs j
    WHERE j.id = job_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);

DROP POLICY IF EXISTS service_reports_select ON public.service_reports;
CREATE POLICY service_reports_select ON public.service_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE v.id = visit_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);

DROP POLICY IF EXISTS service_report_revisions_select ON public.service_report_revisions;
CREATE POLICY service_report_revisions_select ON public.service_report_revisions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_reports r
    JOIN public.service_job_visits v ON v.id = r.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE r.id = report_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);

DROP POLICY IF EXISTS service_report_reviews_select ON public.service_report_reviews;
CREATE POLICY service_report_reviews_select ON public.service_report_reviews
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_report_revisions rev
    JOIN public.service_reports r ON r.id = rev.report_id
    JOIN public.service_job_visits v ON v.id = r.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE rev.id = revision_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);

DROP POLICY IF EXISTS service_job_routine_pins_select ON public.service_job_routine_pins;
CREATE POLICY service_job_routine_pins_select ON public.service_job_routine_pins
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_jobs j
    WHERE j.id = job_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);

GRANT SELECT ON TABLE public.service_report_reviews TO authenticated;
GRANT SELECT ON TABLE public.service_job_routine_pins TO authenticated;

-- Minimal report getter for DO2-06 chain (authorized via can_read_ticket_workflow).
CREATE OR REPLACE FUNCTION public.get_service_report_for_visit(p_visit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket_id uuid;
  v_report public.service_reports%ROWTYPE;
  v_revs jsonb;
BEGIN
  SELECT j.ticket_id INTO v_ticket_id
  FROM public.service_job_visits v
  JOIN public.service_jobs j ON j.id = v.job_id
  WHERE v.id = p_visit_id;
  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT admin_private.can_read_ticket_workflow(v_ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to read report'
      USING ERRCODE = '42501', DETAIL = 'report_authz_denied';
  END IF;
  SELECT * INTO v_report FROM public.service_reports WHERE visit_id = p_visit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('report', NULL, 'revisions', '[]'::jsonb);
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.revision_number), '[]'::jsonb)
  INTO v_revs
  FROM public.service_report_revisions r
  WHERE r.report_id = v_report.id;
  RETURN jsonb_build_object(
    'report', row_to_json(v_report)::jsonb,
    'revisions', v_revs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_service_report_for_visit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_report_for_visit(uuid) TO authenticated, service_role;
