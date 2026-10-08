-- Shared trigger helper used by production/execution/drafts tables.
-- Must exist before 20260115_production_workflow_tables (first consumer).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
