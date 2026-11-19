-- DO-1 disposable deps. TEST-ONLY. Never staging/production.
-- Extends coverage disposable ticket/job stubs so get_staff_daily_ops_workspace columns exist.

ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.service_tickets
SET ticket_number = COALESCE(ticket_number, 'T-' || substr(id::text, 1, 8))
WHERE ticket_number IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_tickets_ticket_number_key'
  ) THEN
    BEGIN
      ALTER TABLE public.service_tickets ADD CONSTRAINT service_tickets_ticket_number_key UNIQUE (ticket_number);
    EXCEPTION WHEN others THEN
      NULL; -- unique may already be enforceable via index
    END;
  END IF;
END $$;
