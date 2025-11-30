-- Calibration Analytics Data Collection Table
-- Stores calibration test results, adjustments, and job outcomes for ML training
-- This table enables the CalibrationLearner system to learn from user behavior

CREATE TABLE IF NOT EXISTS public.calibration_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('test_result', 'adjustment', 'job_result', 'calibration_applied')),
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexed fields extracted from event_data for faster queries
  profile_id UUID,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joint_type TEXT,
  k_factor DECIMAL(5,2),
  
  -- For ML training: extract key features
  profile_width_mm DECIMAL(5,2),
  profile_height_mm DECIMAL(5,2),
  material_thickness_mm DECIMAL(3,2),
  cut_angle DECIMAL(5,2),
  accuracy_mm DECIMAL(5,2), -- Difference between expected and actual
  success BOOLEAN -- Whether calibration was successful
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_event_type ON public.calibration_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_profile_user ON public.calibration_analytics(profile_id, user_id);
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_joint_type ON public.calibration_analytics(joint_type);
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_created_at ON public.calibration_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_success ON public.calibration_analytics(success) WHERE success = TRUE;

-- GIN index for JSONB queries on event_data
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_event_data ON public.calibration_analytics USING GIN (event_data);

-- Row Level Security
ALTER TABLE public.calibration_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analytics data
DROP POLICY IF EXISTS "Users view own analytics" ON public.calibration_analytics;
CREATE POLICY "Users view own analytics" ON public.calibration_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert analytics (via service role or authenticated user)
DROP POLICY IF EXISTS "Users insert own analytics" ON public.calibration_analytics;
CREATE POLICY "Users insert own analytics" ON public.calibration_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to extract and index key fields from event_data
CREATE OR REPLACE FUNCTION extract_calibration_analytics_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract common fields from event_data JSONB
  NEW.profile_id := (NEW.event_data->>'profile_id')::UUID;
  NEW.user_id := (NEW.event_data->>'user_id')::UUID;
  NEW.joint_type := NEW.event_data->>'joint_type';
  NEW.k_factor := (NEW.event_data->>'k_factor')::DECIMAL;
  
  -- Extract profile dimensions if available
  NEW.profile_width_mm := (NEW.event_data->>'profile_width')::DECIMAL;
  NEW.profile_height_mm := (NEW.event_data->>'profile_height')::DECIMAL;
  NEW.material_thickness_mm := (NEW.event_data->>'material_thickness')::DECIMAL;
  NEW.cut_angle := (NEW.event_data->>'cut_angle')::DECIMAL;
  
  -- Extract accuracy metrics
  IF NEW.event_type = 'test_result' THEN
    NEW.accuracy_mm := ABS((NEW.event_data->>'difference')::DECIMAL);
    NEW.success := (NEW.event_data->>'difference')::DECIMAL BETWEEN -1 AND 1; -- Within 1mm is success
  ELSIF NEW.event_type = 'adjustment' THEN
    NEW.success := (NEW.event_data->>'success')::BOOLEAN;
  ELSIF NEW.event_type = 'job_result' THEN
    NEW.accuracy_mm := (NEW.event_data->>'average_accuracy')::DECIMAL;
    NEW.success := (NEW.event_data->>'successful_cuts')::INTEGER::DECIMAL / 
                   NULLIF((NEW.event_data->>'total_cuts')::INTEGER::DECIMAL, 0) > 0.95; -- 95%+ success rate
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-extract fields
DROP TRIGGER IF EXISTS trigger_extract_calibration_fields ON public.calibration_analytics;
CREATE TRIGGER trigger_extract_calibration_fields
  BEFORE INSERT ON public.calibration_analytics
  FOR EACH ROW EXECUTE FUNCTION extract_calibration_analytics_fields();

-- View for easy pattern analysis (for ML training)
CREATE OR REPLACE VIEW calibration_patterns AS
SELECT 
  profile_id,
  joint_type,
  profile_width_mm,
  profile_height_mm,
  material_thickness_mm,
  cut_angle,
  AVG(k_factor) as avg_k_factor,
  STDDEV(k_factor) as k_factor_stddev,
  AVG(accuracy_mm) as avg_accuracy,
  COUNT(*) as sample_count,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as success_rate
FROM public.calibration_analytics
WHERE event_type IN ('test_result', 'job_result')
  AND profile_width_mm IS NOT NULL
  AND material_thickness_mm IS NOT NULL
GROUP BY 
  profile_id,
  joint_type,
  profile_width_mm,
  profile_height_mm,
  material_thickness_mm,
  cut_angle
HAVING COUNT(*) >= 3; -- Minimum 3 samples for pattern recognition

-- Comment on table
COMMENT ON TABLE public.calibration_analytics IS 
  'Stores calibration test results, adjustments, and job outcomes for ML training. 
   Used by CalibrationLearner to identify patterns and suggest optimal K-factors.';

COMMENT ON VIEW calibration_patterns IS 
  'Aggregated calibration patterns for ML training. Groups similar profiles/joints 
   to identify successful K-factor ranges.';

