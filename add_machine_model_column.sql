-- Migration: add machine_model column to service_tickets
-- Safe add (IF NOT EXISTS pattern via DO block for Postgres < 9.6 compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'service_tickets' AND column_name = 'machine_model'
  ) THEN
    ALTER TABLE public.service_tickets ADD COLUMN machine_model text;
  END IF;
END$$;

-- Optional: index if queries will filter by model frequently
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_tickets_machine_model ON public.service_tickets (machine_model);
