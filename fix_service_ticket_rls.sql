-- DEPRECATED: Use service_ticket_rls_full.sql for full insert/update/delete policies.

-- Enable RLS if not already
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive insert policy if present (idempotent guard)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_tickets' AND policyname = 'allow_service_ticket_insert_roles'
  ) THEN
    EXECUTE 'DROP POLICY allow_service_ticket_insert_roles ON public.service_tickets';
  END IF;
END $$;

CREATE POLICY allow_service_ticket_insert_roles
  ON public.service_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('customer','support','admin','technician','sales_rep')
    )
  );

-- Optionally restrict update/delete similarly (not applied here)
