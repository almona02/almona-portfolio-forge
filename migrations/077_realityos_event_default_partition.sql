-- migrations/077_realityos_event_default_partition.sql
-- RealityOS Event Ledger: ensure inserts always succeed
--
-- The original ledger migration (041) created a single 2025-02 partition.
-- Without additional partitions, inserts for later dates will fail.
--
-- This migration creates a DEFAULT partition as a safety net.
-- Range partitions can still be added for performance/retention, but this
-- guarantees append-only recording works across time.
--
BEGIN;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'reality_events'
) THEN RAISE NOTICE 'reality_events table not found; skipping default partition creation.';
RETURN;
END IF;
END $$;
-- Create DEFAULT partition (idempotent)
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'reality_events_default'
) THEN EXECUTE 'CREATE TABLE public.reality_events_default PARTITION OF public.reality_events DEFAULT;';
END IF;
END $$;
-- Ensure RLS is enabled on the default partition (matches 043 approach)
ALTER TABLE IF EXISTS public.reality_events_default ENABLE ROW LEVEL SECURITY;
-- Service role full access (idempotent)
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'reality_events_default'
    AND policyname = 'Service role full access'
) THEN EXECUTE 'CREATE POLICY "Service role full access" ON public.reality_events_default FOR ALL TO service_role USING (true) WITH CHECK (true);';
END IF;
END $$;
COMMIT;