-- Migration 083: Fix FSM validator signature vs live ticket_status enum
-- Live error: function public.is_valid_ticket_status_transition(ticket_status, ticket_status) does not exist
-- Cause: service_tickets.status is enum ticket_status; 081 defined TEXT args and called without cast.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_valid_ticket_status_transition(
  p_from TEXT,
  p_to TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_from IS NOT DISTINCT FROM p_to THEN
    RETURN TRUE;
  END IF;

  RETURN CASE p_from
    WHEN 'open' THEN p_to IN ('assigned', 'cancelled')
    WHEN 'assigned' THEN p_to IN ('in_progress', 'awaiting_parts', 'cancelled')
    WHEN 'in_progress' THEN p_to IN ('awaiting_parts', 'awaiting_customer', 'resolved')
    WHEN 'awaiting_parts' THEN p_to IN ('in_progress', 'cancelled')
    WHEN 'awaiting_customer' THEN p_to IN ('in_progress', 'resolved')
    WHEN 'resolved' THEN p_to IN ('closed')
    WHEN 'closed' THEN FALSE
    WHEN 'cancelled' THEN FALSE
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.enforce_ticket_production_boundary()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_valid_ticket_status_transition(OLD.status::text, NEW.status::text) THEN
      RAISE EXCEPTION 'Invalid ticket status transition: % -> % (Tier-3 FSM)',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF OLD.sla_response_due IS NOT NULL
     AND NEW.sla_response_due IS DISTINCT FROM OLD.sla_response_due THEN
    RAISE EXCEPTION 'sla_response_due is immutable after creation'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.sla_resolution_due IS NOT NULL
     AND NEW.sla_resolution_due IS DISTINCT FROM OLD.sla_resolution_due THEN
    RAISE EXCEPTION 'sla_resolution_due is immutable after creation'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     AND OLD.status::text = 'open'
     AND NEW.status::text = 'open'
     AND NEW.assigned_to IS NOT NULL THEN
    RAISE EXCEPTION 'Assignment while status=open requires transition to assigned (Tier-3 FSM)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_ticket_production_boundary_trigger ON public.service_tickets;
CREATE TRIGGER enforce_ticket_production_boundary_trigger
  BEFORE UPDATE ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ticket_production_boundary();

COMMIT;
