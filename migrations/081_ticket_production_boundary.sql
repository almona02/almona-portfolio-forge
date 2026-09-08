-- Migration 081: Production boundary — DB FSM enforcement, RLS tightening, RealityOS RPC grants
-- Depends on: 080_service_ticketing_governance.sql, 078_realityos_record_event_function.sql
-- Mirrors: src/lib/ticketing/ticketTransitions.ts

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Canonical FSM validator (Tier 3 — must match ticketTransitions.ts)
-- ---------------------------------------------------------------------------
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
  -- Status transitions: FSM enforced for ALL roles (including service_role bypass of RLS)
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_valid_ticket_status_transition(OLD.status::text, NEW.status::text) THEN
      RAISE EXCEPTION 'Invalid ticket status transition: % -> % (Tier-3 FSM)',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- SLA deadlines immutable after initial persist (canonical SLACalculator on INSERT)
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

  -- Assignment without governance: block silent assign while status stays open
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

COMMENT ON FUNCTION public.enforce_ticket_production_boundary() IS
  'Tier-3 production boundary: FSM + immutable SLA + governed assignment.';

-- ---------------------------------------------------------------------------
-- 2. RLS — remove blanket staff FOR ALL; split read vs governed write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all tickets" ON public.service_tickets;

DROP POLICY IF EXISTS "Staff can view all tickets" ON public.service_tickets;
CREATE POLICY "Staff can view all tickets" ON public.service_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'technician', 'sales_rep', 'support')
    )
  );

-- Staff may UPDATE rows but DB trigger enforces FSM + protected fields
DROP POLICY IF EXISTS "Staff can update tickets (FSM enforced by trigger)" ON public.service_tickets;
CREATE POLICY "Staff can update tickets (FSM enforced by trigger)" ON public.service_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'technician', 'sales_rep', 'support')
    )
  );

-- Staff INSERT (e.g. admin-created tickets)
DROP POLICY IF EXISTS "Staff can create tickets" ON public.service_tickets;
CREATE POLICY "Staff can create tickets" ON public.service_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'technician', 'sales_rep', 'support')
    )
  );

-- Users: may update own tickets in limited states; FSM + protected fields enforced by trigger (081)
DROP POLICY IF EXISTS "Users can update their own open tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users can update own ticket contact fields only" ON public.service_tickets;
CREATE POLICY "Users can update own ticket contact fields only" ON public.service_tickets
  FOR UPDATE USING (
    auth.uid() = user_id
    AND status IN ('open', 'awaiting_customer')
  );

-- ---------------------------------------------------------------------------
-- 3. RealityOS RPC — allow authenticated clients (078 was service_role only)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.realityos_record_event(
    core_event_type, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ
  ) TO authenticated;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not grant realityos_record_event to authenticated: %', SQLERRM;
END $$;

COMMIT;
