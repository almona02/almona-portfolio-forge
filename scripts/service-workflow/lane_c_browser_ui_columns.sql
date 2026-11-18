-- Columns the technician checklist screen selects. Not a product migration.
-- The disposable SQL battery does not render this screen.
-- Local checklist-browser stack only.

ALTER TABLE public.service_jobs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS visit_sequence integer NOT NULL DEFAULT 1;

ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz;

ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz;

ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS actual_end timestamptz;

ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS outcome_reason text;
