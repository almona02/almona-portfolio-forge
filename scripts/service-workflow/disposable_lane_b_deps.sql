-- Lane B disposable dependency stubs (tickets/jobs/machines/read helper).
-- TEST-ONLY. Never apply to staging/production.
-- Applied after disposable_routines_base.sql + Lane A migrations.

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
  title text NOT NULL DEFAULT 'LB ticket'
);

CREATE TABLE IF NOT EXISTS public.service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  job_sequence integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'Job 1',
  state text NOT NULL DEFAULT 'planned',
  assigned_technician_id uuid,
  required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_job_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'scheduled',
  attending_technician_id uuid,
  actual_start timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
          AND EXISTS (
            SELECT 1 FROM public.service_jobs j
            WHERE j.ticket_id = t.id
              AND j.assigned_technician_id = admin_private.caller_uid()
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION admin_private.can_read_ticket_workflow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_read_ticket_workflow(uuid) TO authenticated;

-- Minimal B3-shaped lock (ticket then job) for race serialization in disposable.
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
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = v_ticket_id FOR UPDATE;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  ticket := v_ticket;
  job := v_job;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION admin_private.lock_job_hierarchy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.lock_job_hierarchy(uuid) TO authenticated, service_role;
