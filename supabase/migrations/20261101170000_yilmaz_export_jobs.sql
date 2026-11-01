-- Yilmaz CNC export job ledger + private artifact bucket.
-- Additive only: does not alter stock-release / position_release objects.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.yilmaz_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL CHECK (length(trim(project_id)) BETWEEN 1 AND 120),
  position_id text CHECK (position_id IS NULL OR length(trim(position_id)) BETWEEN 1 AND 120),
  order_number text NOT NULL CHECK (length(trim(order_number)) BETWEEN 1 AND 120),
  machine_model text NOT NULL CHECK (length(trim(machine_model)) BETWEEN 1 AND 40),
  export_format text NOT NULL CHECK (export_format IN ('gcode', 'csv', 'mdb', 'all')),
  checksum text NOT NULL DEFAULT '' CHECK (length(checksum) <= 64),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  file_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  storage_paths text[] NOT NULL DEFAULT '{}',
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yilmaz_export_jobs_owner_created_idx
  ON public.yilmaz_export_jobs (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS yilmaz_export_jobs_project_idx
  ON public.yilmaz_export_jobs (project_id, created_at DESC);

COMMENT ON TABLE public.yilmaz_export_jobs IS
  'Operator Yilmaz CNC export runs (.cnc/.csv/.mdb). Artifacts optional in storage; human validation required.';

ALTER TABLE public.yilmaz_export_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.yilmaz_export_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.yilmaz_export_jobs TO authenticated;
GRANT ALL ON public.yilmaz_export_jobs TO service_role;

DROP POLICY IF EXISTS yilmaz_export_jobs_select_own ON public.yilmaz_export_jobs;
CREATE POLICY yilmaz_export_jobs_select_own ON public.yilmaz_export_jobs
  FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS yilmaz_export_jobs_insert_own ON public.yilmaz_export_jobs;
CREATE POLICY yilmaz_export_jobs_insert_own ON public.yilmaz_export_jobs
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS yilmaz_export_jobs_update_own ON public.yilmaz_export_jobs;
CREATE POLICY yilmaz_export_jobs_update_own ON public.yilmaz_export_jobs
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- Private artifact bucket (USB-transfer downloads also stay local via browser Blob).
INSERT INTO storage.buckets (id, name, public)
VALUES ('yilmaz-export-artifacts', 'yilmaz-export-artifacts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "yilmaz-export-artifacts-select-own" ON storage.objects;
CREATE POLICY "yilmaz-export-artifacts-select-own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'yilmaz-export-artifacts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "yilmaz-export-artifacts-insert-own" ON storage.objects;
CREATE POLICY "yilmaz-export-artifacts-insert-own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'yilmaz-export-artifacts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "yilmaz-export-artifacts-update-own" ON storage.objects;
CREATE POLICY "yilmaz-export-artifacts-update-own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'yilmaz-export-artifacts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'yilmaz-export-artifacts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

COMMIT;
