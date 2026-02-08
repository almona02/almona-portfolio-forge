-- migrations/079_fabricator_dual_write_consistency_reports.sql
-- Dual-write consistency reports (v1 <-> v2) for dashboard visibility
--
-- Written by service-side monitor. Readable by authenticated users.
-- Append-only: no updates/deletes.
--
BEGIN;
CREATE TABLE IF NOT EXISTS public.fabricator_dual_write_consistency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional tenant scoping (null = global report)
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sample_size INTEGER NOT NULL,
  mismatch_count INTEGER NOT NULL,
  drift_rate NUMERIC(6, 5) NOT NULL,
  -- e.g. 0.00100 = 0.1%
  -- Evidence payload (ids sampled, hash mismatches, notes)
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Optional linkage
  chain_head_hash CHAR(64),
  reality_os_event_hash CHAR(64),
  reality_os_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.fabricator_dual_write_consistency_reports IS 'Append-only drift reports for Fabricator dual-write window. Produced by service-side monitor; consumed by dashboards.';
CREATE INDEX IF NOT EXISTS idx_fabricator_dual_write_reports_created_at ON public.fabricator_dual_write_consistency_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_dual_write_reports_owner ON public.fabricator_dual_write_consistency_reports(owner_user_id, created_at DESC)
WHERE owner_user_id IS NOT NULL;
ALTER TABLE public.fabricator_dual_write_consistency_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read dual-write reports" ON public.fabricator_dual_write_consistency_reports;
CREATE POLICY "Authenticated can read dual-write reports" ON public.fabricator_dual_write_consistency_reports FOR
SELECT USING (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );
DROP POLICY IF EXISTS "Service role inserts dual-write reports" ON public.fabricator_dual_write_consistency_reports;
CREATE POLICY "Service role inserts dual-write reports" ON public.fabricator_dual_write_consistency_reports FOR
INSERT WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "No updates on dual-write reports" ON public.fabricator_dual_write_consistency_reports;
CREATE POLICY "No updates on dual-write reports" ON public.fabricator_dual_write_consistency_reports FOR
UPDATE USING (false);
DROP POLICY IF EXISTS "No deletes on dual-write reports" ON public.fabricator_dual_write_consistency_reports;
CREATE POLICY "No deletes on dual-write reports" ON public.fabricator_dual_write_consistency_reports FOR DELETE USING (false);
COMMIT;