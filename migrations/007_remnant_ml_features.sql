-- Migration: Remnant ML Features
-- Adds columns to material_remnants table to support ML-based prediction and location priority
-- Date: 2024

-- Add ML feature columns (usage_count already exists in 006_remnant_management.sql)
ALTER TABLE public.material_remnants
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location_priority INTEGER DEFAULT 1;

-- Add index on usage_count for faster queries
CREATE INDEX IF NOT EXISTS idx_material_remnants_usage_count 
ON public.material_remnants(usage_count);

-- Add index on last_used_at for age-based queries
CREATE INDEX IF NOT EXISTS idx_material_remnants_last_used_at 
ON public.material_remnants(last_used_at);

-- Add index on location_priority for location-based prioritization
CREATE INDEX IF NOT EXISTS idx_material_remnants_location_priority 
ON public.material_remnants(location_priority);

-- Add comment explaining location_priority
COMMENT ON COLUMN public.material_remnants.location_priority IS 
'Priority score for location (1 = main/high priority, lower values for secondary locations). Used for ML-based remnant matching.';

-- Add comment explaining usage_count
COMMENT ON COLUMN public.material_remnants.usage_count IS 
'Number of times this remnant has been used or partially used. Used for ML prediction scoring.';

-- Add comment explaining last_used_at
COMMENT ON COLUMN public.material_remnants.last_used_at IS 
'Timestamp of when this remnant was last used. Used for age-based prediction scoring.';

-- Update existing remnants to set default values
UPDATE public.material_remnants
SET 
  usage_count = 0,
  location_priority = CASE 
    WHEN location_id IS NULL THEN 1
    ELSE 1
  END
WHERE usage_count IS NULL OR location_priority IS NULL;

