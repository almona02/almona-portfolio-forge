-- Migration 059: Add missing columns to fabricator_positions table
-- -----------------------------------------------------------------------------
-- This migration adds columns that are expected by ProjectPersistenceService
-- but were missing from the original schema (009_fabricator_projects_and_team.sql)
--
-- Added columns:
-- - components JSONB: Window components array
-- - grid JSONB: Window grid layout structure
-- - hardware JSONB: Hardware configuration
-- - selected_preset TEXT: Selected preset/pattern ID
-- - project_code TEXT: Project code (denormalized from fabricator_projects)
-- - customer TEXT: Customer name (can also be in position_meta)
-- - meta JSONB: Additional metadata (separate from position_meta)
-- - window_type TEXT: Alias for type (for code compatibility)
-- - overall_width INTEGER: Alias for overall_width_mm (for code compatibility)
-- - overall_height INTEGER: Alias for overall_height_mm (for code compatibility)
--
-- Note: window_type, overall_width, overall_height are added as aliases.
-- The code should ideally be updated to use type, overall_width_mm, overall_height_mm
-- but these columns allow backward compatibility.

-- Add missing columns
ALTER TABLE public.fabricator_positions
  ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grid JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hardware JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_preset TEXT,
  ADD COLUMN IF NOT EXISTS project_code TEXT,
  ADD COLUMN IF NOT EXISTS customer TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS window_type TEXT,
  ADD COLUMN IF NOT EXISTS overall_width INTEGER,
  ADD COLUMN IF NOT EXISTS overall_height INTEGER;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_fabricator_positions_project_code 
  ON public.fabricator_positions(project_code) 
  WHERE project_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fabricator_positions_customer 
  ON public.fabricator_positions(customer) 
  WHERE customer IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.fabricator_positions.components IS 'Array of window components (sashes, frames, etc.)';
COMMENT ON COLUMN public.fabricator_positions.grid IS 'Window grid layout structure (rows, cols, cells)';
COMMENT ON COLUMN public.fabricator_positions.hardware IS 'Hardware configuration (handles, locks, etc.)';
COMMENT ON COLUMN public.fabricator_positions.selected_preset IS 'Selected preset/pattern ID for the window design';
COMMENT ON COLUMN public.fabricator_positions.project_code IS 'Project code (denormalized for easier querying)';
COMMENT ON COLUMN public.fabricator_positions.customer IS 'Customer name (also available in position_meta)';
COMMENT ON COLUMN public.fabricator_positions.meta IS 'Additional metadata (saved_at, etc.)';
COMMENT ON COLUMN public.fabricator_positions.window_type IS 'Window type (alias for type column, for code compatibility)';
COMMENT ON COLUMN public.fabricator_positions.overall_width IS 'Overall width (alias for overall_width_mm, for code compatibility)';
COMMENT ON COLUMN public.fabricator_positions.overall_height IS 'Overall height (alias for overall_height_mm, for code compatibility)';

-- Create triggers to keep window_type, overall_width, overall_height in sync with type, overall_width_mm, overall_height_mm
-- This ensures data consistency between the alias columns and the canonical columns
CREATE OR REPLACE FUNCTION sync_fabricator_positions_aliases()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync window_type -> type
  IF NEW.window_type IS NOT NULL AND (OLD.window_type IS DISTINCT FROM NEW.window_type OR OLD IS NULL) THEN
    NEW.type := NEW.window_type;
  ELSIF NEW.type IS NOT NULL AND (OLD.type IS DISTINCT FROM NEW.type OR OLD IS NULL) THEN
    NEW.window_type := NEW.type;
  END IF;
  
  -- Sync overall_width -> overall_width_mm
  IF NEW.overall_width IS NOT NULL AND (OLD.overall_width IS DISTINCT FROM NEW.overall_width OR OLD IS NULL) THEN
    NEW.overall_width_mm := NEW.overall_width;
  ELSIF NEW.overall_width_mm IS NOT NULL AND (OLD.overall_width_mm IS DISTINCT FROM NEW.overall_width_mm OR OLD IS NULL) THEN
    NEW.overall_width := NEW.overall_width_mm;
  END IF;
  
  -- Sync overall_height -> overall_height_mm
  IF NEW.overall_height IS NOT NULL AND (OLD.overall_height IS DISTINCT FROM NEW.overall_height OR OLD IS NULL) THEN
    NEW.overall_height_mm := NEW.overall_height;
  ELSIF NEW.overall_height_mm IS NOT NULL AND (OLD.overall_height_mm IS DISTINCT FROM NEW.overall_height_mm OR OLD IS NULL) THEN
    NEW.overall_height := NEW.overall_height_mm;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_fabricator_positions_aliases_trigger ON public.fabricator_positions;
CREATE TRIGGER sync_fabricator_positions_aliases_trigger
  BEFORE INSERT OR UPDATE ON public.fabricator_positions
  FOR EACH ROW
  EXECUTE FUNCTION sync_fabricator_positions_aliases();
