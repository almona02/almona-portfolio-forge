-- Migration 080: Application-layer owns SLA + assignment; remove competing SQL mutations.
-- Canonical authorities: SLACalculator.ts + sla_policy.json, AssignmentExecutor.ts, TicketLifecycleEngine.ts
-- Ticket number generation remains in DB trigger.
-- NOTE: Renumbered from 079 — migrations/079_fabricator_dual_write_consistency_reports.sql already exists.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;

    -- SLA and auto-assignment are owned by application Tier-3 governance.
    -- Do NOT mutate status or assign here — preserves FSM initial state `open`.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_new_ticket() IS
  'Generates ticket_number only. SLA/assignment handled by TicketGovernanceService (TS) / TicketService (Python).';

-- Ensure BEFORE INSERT trigger exists (function alone does not generate ticket_number)
DROP TRIGGER IF EXISTS handle_new_ticket_trigger ON public.service_tickets;
CREATE TRIGGER handle_new_ticket_trigger
  BEFORE INSERT ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_ticket();

COMMIT;
