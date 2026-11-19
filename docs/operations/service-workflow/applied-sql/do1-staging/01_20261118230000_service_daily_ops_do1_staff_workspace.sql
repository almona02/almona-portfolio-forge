-- DO-1 Staff daily operations workspace (Admin/Support read helpers).
-- Proposal tip: 4c828511. Local implementation only — no remote apply in this change set.
-- Count unit and filter population are the same SELECT; chip integer = items cardinality.
-- Parent "open" scope = status NOT IN ('closed','cancelled') — not status = 'open'.
-- Ungenerated coverage schedule candidates are never counted.
-- Read-only: no inserts/updates; generation remains a separate manual action.

CREATE OR REPLACE FUNCTION public.get_staff_daily_ops_workspace(
  p_as_of date DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_as_of date := COALESCE(p_as_of, admin_private.cairo_today());
  v_overdue jsonb;
  v_unassigned jsonb;
  v_awaiting_review jsonb;
  v_awaiting_customer jsonb;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to read staff daily operations workspace'
      USING ERRCODE = '42501', DETAIL = 'staff_daily_ops_authz_denied';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.planned_due_date, q.occurrence_id), '[]'::jsonb)
  INTO v_overdue
  FROM (
    SELECT
      o.id AS occurrence_id,
      o.coverage_id,
      o.sequence,
      o.planned_due_date,
      o.ticket_id,
      o.job_id,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status
    FROM public.service_maintenance_occurrences o
    JOIN public.service_tickets t ON t.id = o.ticket_id
    WHERE o.planned_due_date < v_as_of
      AND t.status NOT IN ('closed', 'cancelled')
  ) q;

  SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.job_sequence, q.job_id), '[]'::jsonb)
  INTO v_unassigned
  FROM (
    SELECT
      j.id AS job_id,
      j.ticket_id,
      j.job_sequence,
      j.title AS job_title,
      j.state AS job_state,
      j.assigned_technician_id,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status
    FROM public.service_jobs j
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE j.state = 'unassigned'
      AND t.status NOT IN ('closed', 'cancelled')
  ) q;

  SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.job_sequence, q.job_id), '[]'::jsonb)
  INTO v_awaiting_review
  FROM (
    SELECT
      j.id AS job_id,
      j.ticket_id,
      j.job_sequence,
      j.title AS job_title,
      j.state AS job_state,
      j.assigned_technician_id,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status
    FROM public.service_jobs j
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE j.state = 'awaiting_review'
      AND t.status NOT IN ('closed', 'cancelled')
  ) q;

  SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.ticket_number, q.ticket_id), '[]'::jsonb)
  INTO v_awaiting_customer
  FROM (
    SELECT
      t.id AS ticket_id,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status,
      t.priority
    FROM public.service_tickets t
    WHERE t.status = 'awaiting_customer'
  ) q;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'overdue_occurrences', jsonb_build_object(
      'count', jsonb_array_length(v_overdue),
      'items', v_overdue
    ),
    'unassigned_jobs', jsonb_build_object(
      'count', jsonb_array_length(v_unassigned),
      'items', v_unassigned
    ),
    'jobs_awaiting_review', jsonb_build_object(
      'count', jsonb_array_length(v_awaiting_review),
      'items', v_awaiting_review
    ),
    'awaiting_customer', jsonb_build_object(
      'count', jsonb_array_length(v_awaiting_customer),
      'items', v_awaiting_customer
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_staff_daily_ops_workspace(date, uuid) IS
  'DO-1 Admin/Support read-only daily ops queues. Count equals items length per queue. 42501 staff_daily_ops_authz_denied for non-staff.';

REVOKE ALL ON FUNCTION public.get_staff_daily_ops_workspace(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_daily_ops_workspace(date, uuid) TO authenticated, service_role;
