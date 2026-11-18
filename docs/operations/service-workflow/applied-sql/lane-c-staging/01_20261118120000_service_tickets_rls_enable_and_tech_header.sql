-- Ticket RLS reproducibility + narrow technician ticket-header RPC (T-G1).
-- Separately reviewable from Lane C checklist execution.
-- Local-only authorization. No staging/merge/production/FR-1.
--
-- 1) ENABLE ROW LEVEL SECURITY on service_tickets (staging-equivalent; idempotent).
-- 2) Narrow SECURITY DEFINER header RPC for job-assigned / visit-attending technicians.
--    Does NOT broaden service_tickets SELECT to technicians (contact_* remain table-only).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

-- Authz predicate: technician workflow-read branches only (not owner/admin/support —
-- those keep existing table SELECT). Matches can_read_ticket_workflow tech arms.
CREATE OR REPLACE FUNCTION admin_private.technician_may_read_ticket_header(
  p_ticket_id uuid,
  p_uid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT CASE
    WHEN p_ticket_id IS NULL OR p_uid IS NULL THEN false
    WHEN admin_private.caller_role() IS DISTINCT FROM 'technician' THEN false
    WHEN admin_private.caller_uid() IS DISTINCT FROM p_uid THEN false
    WHEN EXISTS (
      SELECT 1
      FROM public.service_jobs j
      WHERE j.ticket_id = p_ticket_id
        AND j.assigned_technician_id = p_uid
        AND j.state NOT IN ('cancelled', 'waived')
    ) THEN true
    WHEN admin_private.is_ticket_visit_attending_technician(p_ticket_id, p_uid) THEN true
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION admin_private.technician_may_read_ticket_header(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.technician_may_read_ticket_header(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION admin_private.technician_may_read_ticket_header(uuid, uuid) IS
  'True when caller is technician and current job assignee or historical completed visit attending on the ticket.';

-- Approved header columns only. description may contain user-entered personal
-- information; contact_email/phone/name and user_id are intentionally absent.
CREATE OR REPLACE FUNCTION public.get_technician_ticket_header(
  p_ticket_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_row public.service_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT admin_private.technician_may_read_ticket_header(p_ticket_id, v_uid) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.service_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'ticket_number', v_row.ticket_number,
    'title', v_row.title,
    'status', v_row.status,
    'priority', v_row.priority,
    'type', v_row.type,
    'description', v_row.description,
    'machine_id', v_row.machine_id,
    'machine_serial_number', v_row.machine_serial_number,
    'site_location', v_row.site_location,
    'created_at', v_row.created_at,
    'maintenance_type', v_row.maintenance_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_technician_ticket_header(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_technician_ticket_header(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_technician_ticket_header(uuid) IS
  'Narrow technician ticket header for job/checklist route. No contact_* / user_id. Authz: job assignee or completed visit attending.';

COMMIT;
