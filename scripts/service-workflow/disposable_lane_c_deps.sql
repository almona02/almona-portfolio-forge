-- Lane C / TR disposable dependency stubs. TEST-ONLY. Never staging/production.
-- Applied after disposable_routines_base.sql; before Lane A/B/TR/LC migrations.

CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text NOT NULL,
  serial_number text,
  owner_id uuid,
  brand text,
  catalog_model_id text,
  catalog_uncertain boolean NOT NULL DEFAULT false,
  catalog_link_status text NOT NULL DEFAULT 'uncatalogued'
    CHECK (catalog_link_status IN ('linked', 'uncatalogued', 'uncertain'))
);

CREATE TABLE IF NOT EXISTS public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  assigned_to uuid,
  machine_id uuid REFERENCES public.machines(id),
  status text NOT NULL DEFAULT 'assigned',
  title text NOT NULL DEFAULT 'LC ticket',
  description text,
  ticket_number text DEFAULT 'T-LC',
  priority text NOT NULL DEFAULT 'medium',
  type text NOT NULL DEFAULT 'maintenance',
  site_location text,
  machine_serial_number text,
  maintenance_type text,
  contact_email text,
  contact_phone text,
  contact_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  job_sequence integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'Job 1',
  state text NOT NULL DEFAULT 'planned',
  assigned_technician_id uuid,
  required boolean NOT NULL DEFAULT true,
  work_started_boundary_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_job_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'scheduled',
  attending_technician_id uuid,
  actual_start timestamptz,
  pinned_routine_version_id uuid,
  checklist_results jsonb,
  checklist_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE REFERENCES public.service_job_visits(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_report_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  findings text NOT NULL,
  work_performed text NOT NULL,
  labour jsonb NOT NULL DEFAULT '[]'::jsonb,
  no_labour boolean NOT NULL DEFAULT false,
  verification_outcome text NOT NULL,
  verification_reason text,
  technician_declaration text NOT NULL,
  evidence_paths text[],
  checklist_results jsonb,
  client_submission_id uuid,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_report_revisions_client_submission_uidx
  ON public.service_report_revisions (report_id, client_submission_id)
  WHERE client_submission_id IS NOT NULL;

-- Staging-equivalent ticket SELECT/UPDATE (pre-ENABLE; TR migration ENABLES RLS).
DROP POLICY IF EXISTS service_tickets_select_own_or_staff ON public.service_tickets;
CREATE POLICY service_tickets_select_own_or_staff ON public.service_tickets
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
);

DROP POLICY IF EXISTS service_tickets_update_scoped ON public.service_tickets;
CREATE POLICY service_tickets_update_scoped ON public.service_tickets
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
)
WITH CHECK (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
);

ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_private.is_ticket_visit_attending_technician(
  p_ticket_id uuid,
  p_uid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_jobs j
    JOIN public.service_job_visits v ON v.job_id = j.id
    WHERE j.ticket_id = p_ticket_id
      AND v.attending_technician_id = p_uid
      AND v.state = 'completed'
      AND j.state NOT IN ('cancelled', 'waived')
  );
$$;
REVOKE ALL ON FUNCTION admin_private.is_ticket_visit_attending_technician(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.is_ticket_visit_attending_technician(uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.can_read_ticket_workflow(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id
      AND (
        t.user_id = admin_private.caller_uid()
        OR t.assigned_to = admin_private.caller_uid()
        OR admin_private.caller_role() IN ('admin', 'support')
        OR (
          admin_private.caller_role() = 'technician'
          AND (
            EXISTS (
              SELECT 1 FROM public.service_jobs j
              WHERE j.ticket_id = t.id
                AND j.assigned_technician_id = admin_private.caller_uid()
            )
            OR admin_private.is_ticket_visit_attending_technician(
              t.id, admin_private.caller_uid()
            )
          )
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION admin_private.can_read_ticket_workflow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_read_ticket_workflow(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.lock_ticket_for_workflow(p_ticket_id uuid)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_ticket public.service_tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.lock_job_hierarchy(p_job_id uuid)
RETURNS TABLE(ticket public.service_tickets, job public.service_jobs)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket public.service_tickets%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
BEGIN
  SELECT j.ticket_id INTO v_ticket_id FROM public.service_jobs j WHERE j.id = p_job_id;
  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  v_ticket := admin_private.lock_ticket_for_workflow(v_ticket_id);
  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  ticket := v_ticket; job := v_job; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.lock_visit_hierarchy(p_visit_id uuid)
RETURNS TABLE(
  ticket public.service_tickets,
  job public.service_jobs,
  visit public.service_job_visits
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_peek_job uuid;
  v_peek_ticket uuid;
  v_ticket public.service_tickets;
  v_job public.service_jobs;
  v_visit public.service_job_visits;
BEGIN
  SELECT v.job_id INTO v_peek_job FROM public.service_job_visits v WHERE v.id = p_visit_id;
  IF v_peek_job IS NULL THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT j.ticket_id INTO v_peek_ticket FROM public.service_jobs j WHERE j.id = v_peek_job;
  v_ticket := admin_private.lock_ticket_for_workflow(v_peek_ticket);
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_peek_job FOR UPDATE;
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  ticket := v_ticket; job := v_job; visit := v_visit; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.validate_report_labour(p_labour jsonb, p_no_labour boolean)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF COALESCE(p_no_labour, false) THEN
    IF p_labour IS NOT NULL AND jsonb_typeof(p_labour) = 'array' AND jsonb_array_length(p_labour) > 0 THEN
      RAISE EXCEPTION 'no_labour with nonempty labour' USING ERRCODE = '22023';
    END IF;
  ELSIF p_labour IS NULL OR jsonb_typeof(p_labour) IS DISTINCT FROM 'array' OR jsonb_array_length(p_labour) < 1 THEN
    RAISE EXCEPTION 'labour required unless no_labour' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.validate_report_evidence_paths(
  p_ticket_id uuid,
  p_paths text[],
  p_actor_uid uuid,
  p_actor_role text
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  -- Disposable: accept any paths (including null/empty).
  RETURN;
END;
$$;

REVOKE ALL ON TABLE public.service_tickets FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE public.service_tickets TO authenticated;
GRANT SELECT ON TABLE public.service_jobs, public.service_job_visits TO authenticated;
GRANT SELECT ON TABLE public.service_reports, public.service_report_revisions TO authenticated;

-- Second technician for concurrency / reassignment cases
INSERT INTO auth.users (id) VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role) VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'technician')
ON CONFLICT DO NOTHING;
