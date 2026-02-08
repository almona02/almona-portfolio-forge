-- migrations/076_fabricator_migration_certificates.sql
-- Migration Certificates for Fabricator v1 -> v2 consolidation
-- AICS-001: Machine-readable proof of migration integrity (30-day validity window)
--
-- Important RealityOS nuance:
-- - public.reality_events is partitioned and has composite PK (event_hash, recorded_at).
-- - We therefore store RealityOS event identifiers as references (hash + recorded_at),
--   and do NOT enforce an FK to public.reality_events to avoid invalid/fragile constraints.
--
BEGIN;
CREATE TABLE IF NOT EXISTS public.fabricator_migration_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Certificate identity (hash of canonical certificate payload)
  certificate_hash CHAR(64) NOT NULL,
  -- Link to migration chain head (enforced via unique index in 073 migration)
  chain_head_hash CHAR(64) NOT NULL REFERENCES public.fabricator_migration_chain(migration_hash),
  -- Link to RealityOS event that anchored this certificate (reference only)
  reality_os_event_hash CHAR(64),
  reality_os_recorded_at TIMESTAMPTZ,
  -- Machine-readable certificate payload
  migration_summary JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  constitutional_metadata JSONB NOT NULL DEFAULT jsonb_build_object(
    'tier',
    'Tier 3',
    'deterministic',
    true,
    'certificate_type',
    'migration_integrity',
    'constitutional_version',
    'AICS-001_v1.0.0'
  )
);
COMMENT ON TABLE public.fabricator_migration_certificates IS 'Machine-readable certificates proving Fabricator migration integrity (chain head + RealityOS anchor reference + validity window).';
CREATE UNIQUE INDEX IF NOT EXISTS ux_fabricator_migration_certificates_hash ON public.fabricator_migration_certificates(certificate_hash);
CREATE INDEX IF NOT EXISTS idx_fabricator_migration_certificates_chain_head ON public.fabricator_migration_certificates(chain_head_hash);
CREATE INDEX IF NOT EXISTS idx_fabricator_migration_certificates_realityos ON public.fabricator_migration_certificates(reality_os_event_hash)
WHERE reality_os_event_hash IS NOT NULL;
-- RLS (certificates are global audit artifacts; restrict to authenticated by default)
ALTER TABLE public.fabricator_migration_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read migration certificates" ON public.fabricator_migration_certificates;
CREATE POLICY "Authenticated can read migration certificates" ON public.fabricator_migration_certificates FOR
SELECT USING (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );
-- Only service role can insert certificates
DROP POLICY IF EXISTS "Service role inserts migration certificates" ON public.fabricator_migration_certificates;
CREATE POLICY "Service role inserts migration certificates" ON public.fabricator_migration_certificates FOR
INSERT WITH CHECK (auth.role() = 'service_role');
-- Append-only: forbid UPDATE and DELETE
DROP POLICY IF EXISTS "No updates on migration certificates" ON public.fabricator_migration_certificates;
CREATE POLICY "No updates on migration certificates" ON public.fabricator_migration_certificates FOR
UPDATE USING (false);
DROP POLICY IF EXISTS "No deletes on migration certificates" ON public.fabricator_migration_certificates;
CREATE POLICY "No deletes on migration certificates" ON public.fabricator_migration_certificates FOR DELETE USING (false);
COMMIT;