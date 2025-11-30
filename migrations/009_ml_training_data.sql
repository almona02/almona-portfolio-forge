-- Migration: ML Training Data Collection
-- Enhances database schema to support ML model training and analytics
-- Date: 2024

-- 1. Create table for storing ML training data snapshots
CREATE TABLE IF NOT EXISTS public.ml_training_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL CHECK (model_type IN ('remnant_predictor', 'complexity_predictor', 'consumption_forecaster')),
  model_version TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  training_data_count INTEGER DEFAULT 0,
  accuracy_metrics JSONB,
  training_config JSONB,
  model_weights_url TEXT, -- URL to stored model weights
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table for tracking prediction accuracy
CREATE TABLE IF NOT EXISTS public.ml_prediction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prediction_id TEXT, -- Reference to the entity being predicted (e.g., remnant_id)
  predicted_value DECIMAL(10,4),
  actual_value DECIMAL(10,4),
  confidence DECIMAL(5,2),
  features JSONB, -- Stored feature values for analysis
  prediction_timestamp TIMESTAMPTZ DEFAULT NOW(),
  actual_outcome_timestamp TIMESTAMPTZ, -- When actual outcome was recorded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table for algorithm performance tracking
CREATE TABLE IF NOT EXISTS public.algorithm_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id TEXT, -- Reference to project/job
  algorithm_type TEXT NOT NULL CHECK (algorithm_type IN ('greedy', 'linear', 'genetic', 'adaptive')),
  complexity_score DECIMAL(5,2),
  total_cuts INTEGER,
  unique_profiles INTEGER,
  duration_ms INTEGER,
  waste_percentage DECIMAL(5,2),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_training_snapshots_user_model 
ON public.ml_training_snapshots(user_id, model_type, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_user_model 
ON public.ml_prediction_logs(user_id, model_type, prediction_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_algorithm_performance_user_algorithm 
ON public.algorithm_performance_logs(user_id, algorithm_type, created_at DESC);

-- 5. Add columns to material_remnants for ML features (if not already present)
ALTER TABLE public.material_remnants
ADD COLUMN IF NOT EXISTS ml_features JSONB,
ADD COLUMN IF NOT EXISTS prediction_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS prediction_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS prediction_timestamp TIMESTAMPTZ;

-- 6. Add comment explaining ML features column
COMMENT ON COLUMN public.material_remnants.ml_features IS 
'Stored feature values used for ML prediction (length, age, quality, etc.) for model improvement';

COMMENT ON COLUMN public.material_remnants.prediction_score IS 
'ML prediction score (0-100) for reuse likelihood';

COMMENT ON COLUMN public.material_remnants.prediction_confidence IS 
'ML prediction confidence level (0-100)';

-- 7. Create view for ML training data aggregation
CREATE OR REPLACE VIEW public.ml_training_data_view AS
SELECT 
  mr.id as remnant_id,
  mr.user_id,
  mr.profile_id,
  mr.length as remnant_length,
  EXTRACT(EPOCH FROM (NOW() - mr.created_at)) / 86400 as age_days,
  mr.quality,
  il.name as location_name,
  mr.usage_count,
  mr.estimated_value,
  CASE 
    WHEN mr.status = 'used' THEN 1
    WHEN mr.status = 'available' AND mr.created_at < NOW() - INTERVAL '90 days' THEN 0
    ELSE NULL
  END as label, -- 1 = reused, 0 = not reused
  mr.created_at,
  mr.used_at
FROM public.material_remnants mr
LEFT JOIN public.inventory_locations il ON mr.location_id = il.id
WHERE mr.status IN ('used', 'available')
  AND (mr.status = 'used' OR mr.created_at < NOW() - INTERVAL '90 days');

-- 8. Grant permissions (adjust based on your RLS policies)
-- These views and tables should respect existing RLS policies

