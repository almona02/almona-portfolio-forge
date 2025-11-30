-- Performance Indexes Migration
-- Adds optimal indexes for common query patterns in calibration and analytics tables
-- This migration significantly improves query performance for read-heavy operations

-- ============================================================================
-- Calibration Analytics Indexes
-- ============================================================================

-- Composite index for PersonalAnalytics queries (user_id + date range + event_type)
-- Used by: PersonalAnalytics.getEfficiencyTrends(), getAllInsights()
-- Query pattern: WHERE user_id = ? AND created_at >= ? AND event_type = ?
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_user_date_type 
ON public.calibration_analytics(user_id, created_at DESC, event_type)
WHERE user_id IS NOT NULL;

-- Composite index for profile-specific analytics
-- Used by: PersonalAnalytics.getSuccessRateByProfile()
-- Query pattern: WHERE profile_id = ? AND event_type = 'job_result'
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_profile_event 
ON public.calibration_analytics(profile_id, event_type)
WHERE profile_id IS NOT NULL AND event_type = 'job_result';

-- Index for ML training data queries
-- Used by: CalibrationLearner.loadTrainingData()
-- Query pattern: WHERE event_type = 'test_result' AND success = true AND profile_width_mm IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_training_data 
ON public.calibration_analytics(event_type, success, profile_width_mm, material_thickness_mm, k_factor)
WHERE event_type = 'test_result' AND success = true 
  AND profile_width_mm IS NOT NULL 
  AND material_thickness_mm IS NOT NULL 
  AND k_factor IS NOT NULL;

-- Index for pattern analysis view queries
-- Used by: CalibrationLearner pattern recognition
-- Query pattern: GROUP BY profile_id, joint_type, profile_width_mm, material_thickness_mm
CREATE INDEX IF NOT EXISTS idx_calibration_analytics_pattern_analysis 
ON public.calibration_analytics(profile_id, joint_type, profile_width_mm, profile_height_mm, material_thickness_mm, cut_angle)
WHERE profile_width_mm IS NOT NULL AND material_thickness_mm IS NOT NULL;

-- ============================================================================
-- Profile Calibrations Indexes
-- ============================================================================

-- Composite index for calibration lookups
-- Used by: CalibrationWizard, ProfileDefinitionManager
-- Query pattern: WHERE profile_id = ? AND user_id = ? AND joint_type = ?
CREATE INDEX IF NOT EXISTS idx_profile_calibrations_lookup 
ON public.profile_calibrations(profile_id, user_id, joint_type)
WHERE is_active = true;

-- Index for active calibrations by user
-- Used by: PersonalAnalytics.getProfileHealth()
-- Query pattern: WHERE user_id = ? AND is_active = true
CREATE INDEX IF NOT EXISTS idx_profile_calibrations_user_active 
ON public.profile_calibrations(user_id, is_active, updated_at DESC)
WHERE is_active = true;

-- Index for calibration confidence scoring
-- Used by: Analytics queries for high-confidence calibrations
-- Query pattern: WHERE confidence_score > 0.7 ORDER BY confidence_score DESC
CREATE INDEX IF NOT EXISTS idx_profile_calibrations_confidence 
ON public.profile_calibrations(confidence_score DESC, updated_at DESC)
WHERE confidence_score IS NOT NULL AND is_active = true;

-- ============================================================================
-- Profile Machining Zones Indexes
-- ============================================================================

-- Composite index for zone lookups
-- Used by: MachiningZoneEditor, ProductionPreviewDialog
-- Query pattern: WHERE profile_id = ? AND user_id = ?
CREATE INDEX IF NOT EXISTS idx_profile_machining_zones_lookup 
ON public.profile_machining_zones(profile_id, user_id);

-- Index for reusable zones
-- Used by: Zone macro system
-- Query pattern: WHERE is_reusable = true AND zone_type = ?
CREATE INDEX IF NOT EXISTS idx_profile_machining_zones_reusable 
ON public.profile_machining_zones(zone_type, is_reusable)
WHERE is_reusable = true;

-- ============================================================================
-- Optimization Equalizer Preferences Indexes
-- ============================================================================

-- Index for user preferences lookup
-- Used by: OptimizationEqualizer component
-- Query pattern: WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_optimization_equalizer_user_default 
ON public.optimization_equalizer_preferences(user_id, is_default DESC, created_at DESC);

-- ============================================================================
-- Optimization Comparisons Indexes
-- ============================================================================

-- Composite index for position optimization history
-- Used by: Optimization history queries
-- Query pattern: WHERE position_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_optimization_comparisons_position_date 
ON public.optimization_comparisons(position_id, created_at DESC)
WHERE position_id IS NOT NULL;

-- Note: optimization_comparisons does not have a user_id column
-- User-based queries must join through fabricator_positions.owner_user_id
-- The position_id index above is sufficient for most queries

-- ============================================================================
-- Fabricator Profiles Indexes (if not already exist)
-- ============================================================================

-- Index for profile lookups by user and material
-- Used by: ProfileManagement, InventoryDashboard
-- Query pattern: WHERE user_id = ? AND material = ?
-- Note: category is stored in specifications JSONB, not as a separate column
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_material 
ON public.fabricator_profiles(user_id, material)
WHERE user_id IS NOT NULL;

-- Index for stock level queries
-- Used by: Low stock alerts, inventory management
-- Query pattern: WHERE user_id = ? AND stock_quantity < min_stock_level
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_stock_level 
ON public.fabricator_profiles(user_id, stock_quantity, min_stock_level)
WHERE user_id IS NOT NULL AND min_stock_level > 0;

-- ============================================================================
-- Fabricator Positions Indexes
-- ============================================================================

-- Note: fabricator_positions does not have assigned_operator_id or assigned_installer_id columns
-- Assignment information is stored in fabricator_project_members table or position_meta JSONB
-- The owner_user_id index below is sufficient for most queries

-- Index for owner positions
-- Used by: User's own projects
-- Query pattern: WHERE owner_user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_fabricator_positions_owner_date 
ON public.fabricator_positions(owner_user_id, created_at DESC)
WHERE owner_user_id IS NOT NULL;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON INDEX idx_calibration_analytics_user_date_type IS 
  'Optimizes PersonalAnalytics queries filtering by user, date range, and event type. Critical for dashboard performance.';

COMMENT ON INDEX idx_profile_calibrations_lookup IS 
  'Optimizes calibration lookups by profile, user, and joint type. Used heavily in CalibrationWizard.';

COMMENT ON INDEX idx_calibration_analytics_training_data IS 
  'Optimizes ML training data queries. Used by CalibrationLearner for model training.';

COMMENT ON INDEX idx_optimization_comparisons_position_date IS 
  'Optimizes optimization history queries by position. Used in workflow and analytics.';

-- ============================================================================
-- Analyze Tables for Query Planner
-- ============================================================================

-- Update statistics for query planner
ANALYZE public.calibration_analytics;
ANALYZE public.profile_calibrations;
ANALYZE public.profile_machining_zones;
ANALYZE public.optimization_equalizer_preferences;
ANALYZE public.optimization_comparisons;
ANALYZE public.fabricator_profiles;
ANALYZE public.fabricator_positions;

