-- Profile Calibration & Machining Wizard Database Migration
-- Implements database schema for profile calibration, K-factors, machining zones, and optimization preferences

-- ============================================================================
-- 1. Enhance fabricator_profiles table with technical data and K-factors
-- ============================================================================

ALTER TABLE public.fabricator_profiles
  ADD COLUMN IF NOT EXISTS technical_drawing_url TEXT,
  ADD COLUMN IF NOT EXISTS data_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS cross_section_image_url TEXT,
  ADD COLUMN IF NOT EXISTS default_k_factor_45 DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS default_k_factor_90 DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS profile_annotations JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 2. Profile Calibrations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joint_type TEXT NOT NULL CHECK (joint_type IN ('miter_45', 'butt_90', 't_joint', 'l_joint', 'custom')),
  k_factor DECIMAL(5,2) NOT NULL,
  cut_angle DECIMAL(5,2) NOT NULL CHECK (cut_angle >= 0 AND cut_angle <= 180),
  profile_width_mm DECIMAL(5,2),
  profile_height_mm DECIMAL(5,2),
  material_thickness_mm DECIMAL(3,2),
  test_results JSONB DEFAULT '[]'::jsonb,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, user_id, joint_type)
);

-- ============================================================================
-- 3. Profile Machining Zones Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_machining_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('hinge_slot', 'lock_pocket', 'drainage', 'anchor', 'custom')),
  x_offset_mm DECIMAL(5,2) NOT NULL,
  y_offset_mm DECIMAL(5,2) NOT NULL,
  width_mm DECIMAL(5,2) NOT NULL CHECK (width_mm > 0),
  height_mm DECIMAL(5,2) NOT NULL CHECK (height_mm > 0),
  depth_mm DECIMAL(3,2),
  reference_corner TEXT NOT NULL CHECK (reference_corner IN ('top_left', 'top_right', 'bottom_left', 'bottom_right')),
  is_reusable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Optimization Equalizer Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.optimization_equalizer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  strategy_name TEXT NOT NULL,
  waste_reduction_weight INTEGER DEFAULT 50 CHECK (waste_reduction_weight >= 0 AND waste_reduction_weight <= 100),
  remnant_usage_weight INTEGER DEFAULT 50 CHECK (remnant_usage_weight >= 0 AND remnant_usage_weight <= 100),
  cut_complexity_weight INTEGER DEFAULT 50 CHECK (cut_complexity_weight >= 0 AND cut_complexity_weight <= 100),
  production_speed_weight INTEGER DEFAULT 50 CHECK (production_speed_weight >= 0 AND production_speed_weight <= 100),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profile_calibrations_profile_id ON public.profile_calibrations(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_calibrations_user_id ON public.profile_calibrations(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_calibrations_joint_type ON public.profile_calibrations(joint_type);
CREATE INDEX IF NOT EXISTS idx_profile_calibrations_active ON public.profile_calibrations(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_profile_machining_zones_profile_id ON public.profile_machining_zones(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_machining_zones_user_id ON public.profile_machining_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_machining_zones_type ON public.profile_machining_zones(zone_type);

CREATE INDEX IF NOT EXISTS idx_optimization_equalizer_user_id ON public.optimization_equalizer_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_equalizer_default ON public.optimization_equalizer_preferences(user_id, is_default) WHERE is_default = TRUE;

-- ============================================================================
-- 6. Row Level Security Policies
-- ============================================================================

-- Profile Calibrations: Users manage their own calibrations
ALTER TABLE public.profile_calibrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own calibrations" ON public.profile_calibrations;
CREATE POLICY "Users manage own calibrations" ON public.profile_calibrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile Machining Zones: Users manage their own zones
ALTER TABLE public.profile_machining_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own machining zones" ON public.profile_machining_zones;
CREATE POLICY "Users manage own machining zones" ON public.profile_machining_zones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Optimization Equalizer Preferences: Users manage their own preferences
ALTER TABLE public.optimization_equalizer_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own preferences" ON public.optimization_equalizer_preferences;
CREATE POLICY "Users manage own preferences" ON public.optimization_equalizer_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. Triggers for updated_at
-- ============================================================================

-- Function to update updated_at timestamp (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profile_calibrations_updated_at ON public.profile_calibrations;
CREATE TRIGGER update_profile_calibrations_updated_at
  BEFORE UPDATE ON public.profile_calibrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profile_machining_zones_updated_at ON public.profile_machining_zones;
CREATE TRIGGER update_profile_machining_zones_updated_at
  BEFORE UPDATE ON public.profile_machining_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_optimization_equalizer_updated_at ON public.optimization_equalizer_preferences;
CREATE TRIGGER update_optimization_equalizer_updated_at
  BEFORE UPDATE ON public.optimization_equalizer_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

