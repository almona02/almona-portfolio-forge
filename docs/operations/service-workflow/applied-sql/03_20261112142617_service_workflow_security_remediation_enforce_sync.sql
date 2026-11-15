CREATE OR REPLACE FUNCTION public.enforce_governed_ticket_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner name;
BEGIN
  -- Once set, activation columns are immutable for EVERY role (incl. table owner).
  IF OLD.workflow_activated_at IS NOT NULL
     AND (
       NEW.workflow_activated_at IS DISTINCT FROM OLD.workflow_activated_at
       OR NEW.workflow_activated_by IS DISTINCT FROM OLD.workflow_activated_by
     ) THEN
    RAISE EXCEPTION 'workflow activation is immutable once set'
      USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.pg_get_userbyid(c.relowner)
    INTO v_owner
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'service_tickets';

  -- First-time activation set is allowed only for table owner / platform roles
  -- (SECURITY DEFINER RPCs such as create_service_job).
  IF OLD.workflow_activated_at IS NULL
     AND NEW.workflow_activated_at IS NOT NULL
     AND current_user IS DISTINCT FROM v_owner
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Protected ticket fields require govern_ticket_* RPC'
      USING ERRCODE = '42501';
  END IF;

  IF current_user IS NOT DISTINCT FROM v_owner
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
     OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.escalated IS DISTINCT FROM OLD.escalated
     OR NEW.escalated_at IS DISTINCT FROM OLD.escalated_at
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
     OR NEW.resolution_summary IS DISTINCT FROM OLD.resolution_summary
     OR NEW.first_response_at IS DISTINCT FROM OLD.first_response_at
     OR NEW.sla_response_due IS DISTINCT FROM OLD.sla_response_due
     OR NEW.sla_resolution_due IS DISTINCT FROM OLD.sla_resolution_due
     OR NEW.sla_breached IS DISTINCT FROM OLD.sla_breached
     OR NEW.workflow_activated_at IS DISTINCT FROM OLD.workflow_activated_at
     OR NEW.workflow_activated_by IS DISTINCT FROM OLD.workflow_activated_by
  THEN
    RAISE EXCEPTION 'Protected ticket fields require govern_ticket_* RPC'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;