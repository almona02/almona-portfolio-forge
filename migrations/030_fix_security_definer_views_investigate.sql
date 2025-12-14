-- Migration 030: Investigate and Fix Security Definer Views
-- This migration checks the actual state of views and fixes them properly
-- ============================================================================
-- First, let's check what the linter is actually seeing
DO $$
DECLARE view_rec RECORD;
BEGIN RAISE NOTICE '=== Checking view definitions ===';
FOR view_rec IN
SELECT schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN (
        'ml_training_data_view',
        'fabricator_connection_stats',
        'calibration_patterns',
        'erp_transaction_summary'
    ) LOOP RAISE NOTICE 'View: %.% owned by: %',
    view_rec.schemaname,
    view_rec.viewname,
    view_rec.viewowner;
END LOOP;
END $$;
-- Check if there are any functions with these names
DO $$
DECLARE func_rec RECORD;
BEGIN RAISE NOTICE '=== Checking for functions with these names ===';
FOR func_rec IN
SELECT n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'ml_training_data_view',
        'fabricator_connection_stats',
        'calibration_patterns',
        'erp_transaction_summary'
    ) LOOP RAISE NOTICE 'Function found: %.%',
    func_rec.schema_name,
    func_rec.function_name;
END LOOP;
END $$;
-- Now, let's recreate the views with explicit ownership and permissions
-- The key is to ensure they're owned by a regular role, not a superuser
-- 1. Fix ml_training_data_view
DO $$
DECLARE has_material_remnants BOOLEAN;
has_ml_snapshots BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'material_remnants'
    ) INTO has_material_remnants;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'ml_training_snapshots'
    ) INTO has_ml_snapshots;
-- Drop everything
DROP FUNCTION IF EXISTS public.ml_training_data_view() CASCADE;
DROP VIEW IF EXISTS public.ml_training_data_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.ml_training_data_view CASCADE;
IF has_material_remnants THEN -- Create view and explicitly set owner to postgres (or authenticated role)
CREATE VIEW public.ml_training_data_view WITH (security_invoker = true) AS
SELECT mr.id as remnant_id,
    mr.user_id,
    mr.profile_id,
    mr.length as remnant_length,
    EXTRACT(
        EPOCH
        FROM (NOW() - mr.created_at)
    ) / 86400 as age_days,
    mr.quality,
    il.name as location_name,
    mr.usage_count,
    mr.estimated_value,
    CASE
        WHEN mr.status = 'used' THEN 1
        WHEN mr.status = 'available'
        AND mr.created_at < NOW() - INTERVAL '90 days' THEN 0
        ELSE NULL
    END as label,
    mr.created_at,
    mr.used_at
FROM public.material_remnants mr
    LEFT JOIN public.inventory_locations il ON mr.location_id = il.id
WHERE mr.status IN ('used', 'available')
    AND (
        mr.status = 'used'
        OR mr.created_at < NOW() - INTERVAL '90 days'
    )
    AND mr.user_id = auth.uid();
-- Ensure proper ownership
ALTER VIEW public.ml_training_data_view OWNER TO postgres;
GRANT SELECT ON public.ml_training_data_view TO authenticated;
RAISE NOTICE 'Recreated view: ml_training_data_view (from material_remnants)';
ELSIF has_ml_snapshots THEN CREATE VIEW public.ml_training_data_view WITH (security_invoker = true) AS
SELECT id as remnant_id,
    user_id,
    id as model_id,
    model_type,
    training_data,
    created_at,
    NULL::TIMESTAMPTZ as used_at
FROM public.ml_training_snapshots
WHERE user_id = auth.uid();
ALTER VIEW public.ml_training_data_view OWNER TO postgres;
GRANT SELECT ON public.ml_training_data_view TO authenticated;
RAISE NOTICE 'Recreated view: ml_training_data_view (from ml_training_snapshots)';
END IF;
END $$;
-- 2. Fix fabricator_connection_stats
DO $$ BEGIN DROP FUNCTION IF EXISTS public.fabricator_connection_stats() CASCADE;
DROP VIEW IF EXISTS public.fabricator_connection_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.fabricator_connection_stats CASCADE;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'fabricator_profiles'
) THEN CREATE VIEW public.fabricator_connection_stats WITH (security_invoker = true) AS
SELECT user_id,
    COUNT(*) as connection_count,
    MAX(created_at) as last_connection
FROM public.fabricator_profiles
WHERE auth.uid() = user_id
GROUP BY user_id;
ALTER VIEW public.fabricator_connection_stats OWNER TO postgres;
GRANT SELECT ON public.fabricator_connection_stats TO authenticated;
RAISE NOTICE 'Recreated view: fabricator_connection_stats';
END IF;
END $$;
-- 3. Fix calibration_patterns
DO $$
DECLARE has_calibration_analytics BOOLEAN;
has_profile_calibrations BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'calibration_analytics'
    ) INTO has_calibration_analytics;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'profile_calibrations'
    ) INTO has_profile_calibrations;
DROP FUNCTION IF EXISTS public.calibration_patterns() CASCADE;
DROP VIEW IF EXISTS public.calibration_patterns CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.calibration_patterns CASCADE;
IF has_calibration_analytics THEN CREATE VIEW public.calibration_patterns WITH (security_invoker = true) AS
SELECT profile_id,
    joint_type,
    profile_width_mm,
    profile_height_mm,
    material_thickness_mm,
    cut_angle,
    AVG(k_factor) as avg_k_factor,
    STDDEV(k_factor) as k_factor_stddev,
    AVG(accuracy_mm) as avg_accuracy,
    COUNT(*) as sample_count,
    SUM(
        CASE
            WHEN success THEN 1
            ELSE 0
        END
    )::DECIMAL / COUNT(*) as success_rate
FROM public.calibration_analytics
WHERE event_type IN ('test_result', 'job_result')
    AND profile_width_mm IS NOT NULL
    AND material_thickness_mm IS NOT NULL
    AND user_id = auth.uid()
GROUP BY profile_id,
    joint_type,
    profile_width_mm,
    profile_height_mm,
    material_thickness_mm,
    cut_angle
HAVING COUNT(*) >= 3;
ALTER VIEW public.calibration_patterns OWNER TO postgres;
GRANT SELECT ON public.calibration_patterns TO authenticated;
RAISE NOTICE 'Recreated view: calibration_patterns (from calibration_analytics)';
ELSIF has_profile_calibrations THEN CREATE VIEW public.calibration_patterns WITH (security_invoker = true) AS
SELECT profile_id,
    joint_type,
    profile_width_mm,
    profile_height_mm,
    COUNT(*) as calibration_count,
    AVG(accuracy) as avg_accuracy,
    MIN(calibrated_at) as first_calibration,
    MAX(calibrated_at) as last_calibration
FROM public.profile_calibrations
WHERE user_id = auth.uid()
GROUP BY profile_id,
    joint_type,
    profile_width_mm,
    profile_height_mm;
ALTER VIEW public.calibration_patterns OWNER TO postgres;
GRANT SELECT ON public.calibration_patterns TO authenticated;
RAISE NOTICE 'Recreated view: calibration_patterns (from profile_calibrations)';
END IF;
END $$;
-- 4. Fix erp_transaction_summary
DO $$
DECLARE has_user_id BOOLEAN;
has_quote_id BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'erp_transaction_log'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'erp_transaction_log'
            AND column_name = 'quote_id'
    ) INTO has_quote_id;
DROP FUNCTION IF EXISTS public.erp_transaction_summary() CASCADE;
DROP VIEW IF EXISTS public.erp_transaction_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.erp_transaction_summary CASCADE;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'erp_transaction_log'
) THEN IF has_quote_id THEN CREATE VIEW public.erp_transaction_summary WITH (security_invoker = true) AS
SELECT q.user_id,
    DATE(etl.created_at) as transaction_date,
    etl.target_system,
    etl.event_type,
    COUNT(*) as transaction_count,
    SUM(
        CASE
            WHEN etl.status = 'success' THEN 1
            ELSE 0
        END
    ) as success_count
FROM public.erp_transaction_log etl
    LEFT JOIN public.quotes q ON etl.quote_id = q.id
WHERE (
        q.user_id = auth.uid()
        OR (
            q.user_id IS NULL
            AND EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                    AND role = 'admin'
            )
        )
    )
GROUP BY q.user_id,
    DATE(etl.created_at),
    etl.target_system,
    etl.event_type;
ELSIF has_user_id THEN CREATE VIEW public.erp_transaction_summary WITH (security_invoker = true) AS
SELECT user_id,
    DATE(created_at) as transaction_date,
    target_system,
    event_type,
    COUNT(*) as transaction_count,
    SUM(
        CASE
            WHEN status = 'success' THEN 1
            ELSE 0
        END
    ) as success_count
FROM public.erp_transaction_log
WHERE user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role = 'admin'
    )
GROUP BY user_id,
    DATE(created_at),
    target_system,
    event_type;
ELSE CREATE VIEW public.erp_transaction_summary WITH (security_invoker = true) AS
SELECT DATE(created_at) as transaction_date,
    target_system,
    event_type,
    COUNT(*) as transaction_count,
    SUM(
        CASE
            WHEN status = 'success' THEN 1
            ELSE 0
        END
    ) as success_count
FROM public.erp_transaction_log
WHERE EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role = 'admin'
    )
GROUP BY DATE(created_at),
    target_system,
    event_type;
END IF;
ALTER VIEW public.erp_transaction_summary OWNER TO postgres;
GRANT SELECT ON public.erp_transaction_summary TO authenticated;
RAISE NOTICE 'Recreated view: erp_transaction_summary';
END IF;
END $$;
SELECT 'Migration 030 completed: Views recreated with explicit security_invoker and ownership' as message;