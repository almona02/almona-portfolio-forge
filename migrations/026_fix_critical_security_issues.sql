-- 026_fix_critical_security_issues.sql
-- Fixes critical security issues identified by Supabase Database Linter
-- Priority: ERROR level issues first, then WARN level
-- ============================================================================
-- PART 1: Enable RLS on tables missing it (ERROR level)
-- ============================================================================
-- Enable RLS on tables missing it (ERROR level)
-- Using DO blocks to handle tables that might not exist gracefully
DO $$
DECLARE tbl_name TEXT;
tables_to_fix TEXT [] := ARRAY [
    'erp_transaction_log',
    'security_events',
    'thermal_analysis',
    'grid_pricing',
    'model_variants',
    'audit_signatures',
    'machining_templates',
    'national_metrics',
    'predictive_maintenance_logs',
    'bending_calculations',
    'mass_production_runs'
  ];
BEGIN FOREACH tbl_name IN ARRAY tables_to_fix LOOP -- Check if table exists before enabling RLS
-- Use table alias 't' to avoid ambiguity with variable name
IF EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
        AND t.table_name = tbl_name
) THEN EXECUTE format(
    'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
    tbl_name
);
RAISE NOTICE 'Enabled RLS on table: %',
tbl_name;
ELSE RAISE NOTICE 'Table does not exist, skipping: %',
tbl_name;
END IF;
END LOOP;
END $$;
-- ============================================================================
-- PART 2: Create basic RLS policies for newly enabled tables
-- ============================================================================
-- RLS policies for erp_transaction_log
-- Note: This table may not have user_id, so we'll check and use quote_id as fallback
DO $$
DECLARE has_user_id BOOLEAN;
has_quote_id BOOLEAN;
BEGIN -- Check if columns exist
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
-- Only create policy if table exists
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'erp_transaction_log'
) THEN -- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own transaction logs" ON public.erp_transaction_log;
DROP POLICY IF EXISTS "Admins can view transaction logs" ON public.erp_transaction_log;
-- Create appropriate policy based on available columns
IF has_user_id THEN EXECUTE 'CREATE POLICY "Users can view own transaction logs" ON public.erp_transaction_log FOR SELECT USING (auth.uid() = user_id)';
ELSIF has_quote_id THEN -- Link through quotes table to get user_id
EXECUTE 'CREATE POLICY "Users can view own transaction logs" ON public.erp_transaction_log FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = erp_transaction_log.quote_id AND q.user_id = auth.uid())
      )';
ELSE -- No user association, allow admins only
EXECUTE 'CREATE POLICY "Admins can view transaction logs" ON public.erp_transaction_log FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
      )';
END IF;
END IF;
END $$;
-- RLS policies for security_events
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'security_events'
) THEN DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
CREATE POLICY "Admins can view all security events" ON public.security_events FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END IF;
END $$;
-- RLS policies for thermal_analysis
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN -- Check if user_id column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'thermal_analysis'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'thermal_analysis'
) THEN -- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own thermal analysis" ON public.thermal_analysis;
DROP POLICY IF EXISTS "Authenticated users can view thermal analysis" ON public.thermal_analysis;
-- Create appropriate policy
IF has_user_id THEN EXECUTE 'CREATE POLICY "Users can view own thermal analysis" ON public.thermal_analysis FOR SELECT USING (auth.uid() = user_id)';
ELSE EXECUTE 'CREATE POLICY "Authenticated users can view thermal analysis" ON public.thermal_analysis FOR SELECT USING (auth.role() = ''authenticated'')';
END IF;
END IF;
END $$;
-- RLS policies for grid_pricing
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'grid_pricing'
) THEN DROP POLICY IF EXISTS "Authenticated users can view grid pricing" ON public.grid_pricing;
CREATE POLICY "Authenticated users can view grid pricing" ON public.grid_pricing FOR
SELECT USING (auth.role() = 'authenticated');
END IF;
END $$;
-- RLS policies for model_variants
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'model_variants'
) THEN DROP POLICY IF EXISTS "Authenticated users can view model variants" ON public.model_variants;
CREATE POLICY "Authenticated users can view model variants" ON public.model_variants FOR
SELECT USING (auth.role() = 'authenticated');
END IF;
END $$;
-- RLS policies for audit_signatures
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'audit_signatures'
) THEN DROP POLICY IF EXISTS "Admins can view audit signatures" ON public.audit_signatures;
CREATE POLICY "Admins can view audit signatures" ON public.audit_signatures FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END IF;
END $$;
-- RLS policies for machining_templates
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machining_templates'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'machining_templates'
) THEN DROP POLICY IF EXISTS "Users can view own machining templates" ON public.machining_templates;
DROP POLICY IF EXISTS "Authenticated users can view machining templates" ON public.machining_templates;
IF has_user_id THEN EXECUTE 'CREATE POLICY "Users can view own machining templates" ON public.machining_templates FOR SELECT USING (auth.uid() = user_id)';
ELSE EXECUTE 'CREATE POLICY "Authenticated users can view machining templates" ON public.machining_templates FOR SELECT USING (auth.role() = ''authenticated'')';
END IF;
END IF;
END $$;
-- RLS policies for national_metrics
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'national_metrics'
) THEN DROP POLICY IF EXISTS "Authenticated users can view national metrics" ON public.national_metrics;
CREATE POLICY "Authenticated users can view national metrics" ON public.national_metrics FOR
SELECT USING (auth.role() = 'authenticated');
END IF;
END $$;
-- RLS policies for predictive_maintenance_logs
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'predictive_maintenance_logs'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'predictive_maintenance_logs'
) THEN DROP POLICY IF EXISTS "Users can view own maintenance logs" ON public.predictive_maintenance_logs;
DROP POLICY IF EXISTS "Authenticated users can view maintenance logs" ON public.predictive_maintenance_logs;
IF has_user_id THEN EXECUTE 'CREATE POLICY "Users can view own maintenance logs" ON public.predictive_maintenance_logs FOR SELECT USING (auth.uid() = user_id)';
ELSE EXECUTE 'CREATE POLICY "Authenticated users can view maintenance logs" ON public.predictive_maintenance_logs FOR SELECT USING (auth.role() = ''authenticated'')';
END IF;
END IF;
END $$;
-- RLS policies for bending_calculations
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'bending_calculations'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'bending_calculations'
) THEN DROP POLICY IF EXISTS "Users can view own bending calculations" ON public.bending_calculations;
DROP POLICY IF EXISTS "Authenticated users can view bending calculations" ON public.bending_calculations;
IF has_user_id THEN EXECUTE 'CREATE POLICY "Users can view own bending calculations" ON public.bending_calculations FOR SELECT USING (auth.uid() = user_id)';
ELSE EXECUTE 'CREATE POLICY "Authenticated users can view bending calculations" ON public.bending_calculations FOR SELECT USING (auth.role() = ''authenticated'')';
END IF;
END IF;
END $$;
-- RLS policies for mass_production_runs
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'mass_production_runs'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'mass_production_runs'
) THEN DROP POLICY IF EXISTS "Users can view own production runs" ON public.mass_production_runs;
DROP POLICY IF EXISTS "Authenticated users can view production runs" ON public.mass_production_runs;
IF has_user_id THEN EXECUTE 'CREATE POLICY "Users can view own production runs" ON public.mass_production_runs FOR SELECT USING (auth.uid() = user_id)';
ELSE EXECUTE 'CREATE POLICY "Authenticated users can view production runs" ON public.mass_production_runs FOR SELECT USING (auth.role() = ''authenticated'')';
END IF;
END IF;
END $$;
-- ============================================================================
-- PART 3: Fix Security Definer Views (ERROR level)
-- ============================================================================
-- Note: Views in PostgreSQL don't have SECURITY DEFINER, but the linter may detect
-- views that were created in a way that bypasses RLS. We'll recreate them properly.
-- If these were created as functions returning tables, we'll drop and recreate as views.
-- Fix erp_transaction_summary view
DO $$
DECLARE has_user_id BOOLEAN;
has_quote_id BOOLEAN;
has_amount BOOLEAN;
view_sql TEXT;
BEGIN -- Drop as function if it exists (in case it was created as a function)
DROP FUNCTION IF EXISTS public.erp_transaction_summary() CASCADE;
-- Only recreate if the underlying table exists
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'erp_transaction_log'
) THEN -- Check which columns exist
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
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'erp_transaction_log'
            AND column_name = 'amount'
    ) INTO has_amount;
-- Explicitly drop the view to remove any SECURITY DEFINER property
DROP VIEW IF EXISTS public.erp_transaction_summary CASCADE;
-- Build view SQL based on available columns
-- Based on actual schema: erp_transaction_log has quote_id, event_type, target_system, status, etc.
IF has_quote_id THEN -- Link through quotes table to get user_id
view_sql := 'CREATE VIEW public.erp_transaction_summary AS
        SELECT 
          q.user_id,
          DATE(etl.created_at) as transaction_date,
          etl.target_system,
          etl.event_type,
          COUNT(*) as transaction_count,
          COUNT(*) FILTER (WHERE etl.status = ''SUCCESS'') as success_count,
          COUNT(*) FILTER (WHERE etl.status = ''FAILED'') as failed_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (etl.processed_at - etl.created_at)) * 1000), 2) as avg_processing_ms
        FROM public.erp_transaction_log etl
        LEFT JOIN public.quotes q ON q.id = etl.quote_id
        WHERE q.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
        GROUP BY q.user_id, DATE(etl.created_at), etl.target_system, etl.event_type
        ORDER BY transaction_date DESC';
ELSE -- No quote_id, create admin-only view with basic aggregation
view_sql := 'CREATE VIEW public.erp_transaction_summary AS
        SELECT 
          DATE(created_at) as transaction_date,
          target_system,
          event_type,
          COUNT(*) as transaction_count,
          COUNT(*) FILTER (WHERE status = ''SUCCESS'') as success_count,
          COUNT(*) FILTER (WHERE status = ''FAILED'') as failed_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000), 2) as avg_processing_ms
        FROM public.erp_transaction_log
        WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
        GROUP BY DATE(created_at), target_system, event_type
        ORDER BY transaction_date DESC';
END IF;
EXECUTE view_sql;
GRANT SELECT ON public.erp_transaction_summary TO authenticated;
RAISE NOTICE 'Recreated view: erp_transaction_summary';
ELSE RAISE NOTICE 'Table erp_transaction_log does not exist, skipping view creation';
END IF;
END $$;
-- Fix fabricator_connection_stats view
DO $$ BEGIN -- Drop as function if it exists (in case it was created as a function)
DROP FUNCTION IF EXISTS public.fabricator_connection_stats() CASCADE;
-- Only recreate if the underlying table exists
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'fabricator_profiles'
) THEN -- Explicitly drop view to remove any properties
DROP VIEW IF EXISTS public.fabricator_connection_stats CASCADE;
-- Recreate as a proper view (views don't have SECURITY DEFINER by default)
EXECUTE $view$ CREATE VIEW public.fabricator_connection_stats AS
SELECT user_id,
    COUNT(*) as connection_count,
    MAX(created_at) as last_connection
FROM public.fabricator_profiles
WHERE auth.uid() = user_id -- RLS-aware filtering
GROUP BY user_id;
$view$;
GRANT SELECT ON public.fabricator_connection_stats TO authenticated;
RAISE NOTICE 'Recreated view: fabricator_connection_stats';
ELSE RAISE NOTICE 'Table fabricator_profiles does not exist, skipping view creation';
END IF;
END $$;
-- Fix ml_training_data_view view
-- Note: The original view aggregates from material_remnants, not ml_training_snapshots
DO $$
DECLARE has_material_remnants BOOLEAN;
has_ml_snapshots BOOLEAN;
view_sql TEXT;
BEGIN -- Drop as function if it exists (in case it was created as a function)
DROP FUNCTION IF EXISTS public.ml_training_data_view() CASCADE;
-- Check which tables exist
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
IF has_material_remnants THEN -- Explicitly drop to remove SECURITY DEFINER if it exists
DROP VIEW IF EXISTS public.ml_training_data_view CASCADE;
-- Recreate without SECURITY DEFINER (default is SECURITY INVOKER)
view_sql := 'CREATE VIEW public.ml_training_data_view AS
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
          WHEN mr.status = ''used'' THEN 1
          WHEN mr.status = ''available'' AND mr.created_at < NOW() - INTERVAL ''90 days'' THEN 0
          ELSE NULL
        END as label,
        mr.created_at,
        mr.used_at
      FROM public.material_remnants mr
      LEFT JOIN public.inventory_locations il ON mr.location_id = il.id
      WHERE mr.status IN (''used'', ''available'')
        AND (mr.status = ''used'' OR mr.created_at < NOW() - INTERVAL ''90 days'')
        AND mr.user_id = auth.uid()';
EXECUTE view_sql;
GRANT SELECT ON public.ml_training_data_view TO authenticated;
RAISE NOTICE 'Recreated view: ml_training_data_view (from material_remnants)';
ELSIF has_ml_snapshots THEN -- Explicitly drop to remove SECURITY DEFINER if it exists
DROP VIEW IF EXISTS public.ml_training_data_view CASCADE;
-- Recreate without SECURITY DEFINER
view_sql := 'CREATE VIEW public.ml_training_data_view AS
      SELECT 
        id as remnant_id,
        user_id,
        id as model_id,
        model_type,
        model_version,
        training_data_count,
        accuracy_metrics,
        training_config,
        model_weights_url,
        snapshot_date,
        created_at
      FROM public.ml_training_snapshots
      WHERE user_id = auth.uid()';
EXECUTE view_sql;
GRANT SELECT ON public.ml_training_data_view TO authenticated;
RAISE NOTICE 'Recreated view: ml_training_data_view (from ml_training_snapshots)';
ELSE RAISE NOTICE 'Neither material_remnants nor ml_training_snapshots exist, skipping view creation';
END IF;
END $$;
-- Fix calibration_patterns view
-- Note: The original view aggregates from calibration_analytics, not profile_calibrations
DO $$
DECLARE has_calibration_analytics BOOLEAN;
has_profile_calibrations BOOLEAN;
view_sql TEXT;
BEGIN -- Drop as function if it exists (in case it was created as a function)
DROP FUNCTION IF EXISTS public.calibration_patterns() CASCADE;
-- Check which tables exist
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
IF has_calibration_analytics THEN -- Explicitly drop to remove SECURITY DEFINER if it exists
DROP VIEW IF EXISTS public.calibration_patterns CASCADE;
-- Recreate without SECURITY DEFINER (default is SECURITY INVOKER)
view_sql := 'CREATE VIEW public.calibration_patterns AS
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
      WHERE event_type IN (''test_result'', ''job_result'')
        AND profile_width_mm IS NOT NULL
        AND material_thickness_mm IS NOT NULL
        AND user_id = auth.uid()
      GROUP BY 
        profile_id,
        joint_type,
        profile_width_mm,
        profile_height_mm,
        material_thickness_mm,
        cut_angle
      HAVING COUNT(*) >= 3';
EXECUTE view_sql;
GRANT SELECT ON public.calibration_patterns TO authenticated;
RAISE NOTICE 'Recreated view: calibration_patterns (from calibration_analytics)';
ELSIF has_profile_calibrations THEN -- Explicitly drop to remove SECURITY DEFINER if it exists
DROP VIEW IF EXISTS public.calibration_patterns CASCADE;
-- Recreate without SECURITY DEFINER
view_sql := 'CREATE VIEW public.calibration_patterns AS
      SELECT 
        profile_id,
        joint_type,
        profile_width_mm,
        profile_height_mm,
        material_thickness_mm,
        cut_angle,
        k_factor,
        confidence_score,
        test_results,
        is_active,
        created_at,
        updated_at
      FROM public.profile_calibrations
      WHERE user_id = auth.uid()
        AND (is_active IS NULL OR is_active = true)';
EXECUTE view_sql;
GRANT SELECT ON public.calibration_patterns TO authenticated;
RAISE NOTICE 'Recreated view: calibration_patterns (from profile_calibrations)';
ELSE RAISE NOTICE 'Neither calibration_analytics nor profile_calibrations exist, skipping view creation';
END IF;
END $$;
-- ============================================================================
-- PART 4: Fix Function Search Path Issues (WARN level)
-- ============================================================================
-- Fix update_erp_log_updated_at function
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_erp_log_updated_at'
        AND pronamespace = 'public'::regnamespace
) THEN EXECUTE $func$
CREATE OR REPLACE FUNCTION public.update_erp_log_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    pg_temp AS $body$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$body$;
$func$;
RAISE NOTICE 'Fixed function: update_erp_log_updated_at';
ELSE RAISE NOTICE 'Function update_erp_log_updated_at does not exist, skipping';
END IF;
END $$;
-- Fix update_machine_profiles_updated_at function
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_machine_profiles_updated_at'
        AND pronamespace = 'public'::regnamespace
) THEN EXECUTE $func$
CREATE OR REPLACE FUNCTION public.update_machine_profiles_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    pg_temp AS $body$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$body$;
$func$;
RAISE NOTICE 'Fixed function: update_machine_profiles_updated_at';
ELSE RAISE NOTICE 'Function update_machine_profiles_updated_at does not exist, skipping';
END IF;
END $$;
-- ============================================================================
-- PART 5: Fix Materialized View Access (WARN level)
-- ============================================================================
-- Fix materialized view access (mv_top_products)
DO $$ BEGIN -- Only fix if the materialized view exists
IF EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
        AND matviewname = 'mv_top_products'
) THEN -- Revoke public SELECT
REVOKE
SELECT ON public.mv_top_products
FROM anon,
    authenticated;
-- Create a secure function wrapper
EXECUTE $func$
CREATE OR REPLACE FUNCTION public.get_top_products(limit_count INTEGER DEFAULT 10) RETURNS TABLE (
        product_id UUID,
        product_name TEXT,
        view_count BIGINT
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    pg_temp AS $body$ BEGIN RETURN QUERY
SELECT p.id as product_id,
    p.name_en as product_name,
    mv.view_count
FROM public.mv_top_products mv
    JOIN public.products p ON p.id = mv.product_id
WHERE p.is_active = true
ORDER BY mv.view_count DESC
LIMIT limit_count;
END;
$body$;
$func$;
GRANT EXECUTE ON FUNCTION public.get_top_products(INTEGER) TO authenticated;
RAISE NOTICE 'Fixed materialized view access: mv_top_products';
ELSE RAISE NOTICE 'Materialized view mv_top_products does not exist, skipping';
END IF;
END $$;
-- ============================================================================
-- PART 6: Final Verification - Ensure views don't have SECURITY DEFINER
-- ============================================================================
-- Note: In PostgreSQL, views don't have SECURITY DEFINER property (only functions do).
-- If the linter detects SECURITY DEFINER on views, they may have been created as
-- functions returning tables. We've dropped and recreated them as proper views.
-- Views use the permissions of the querying user (SECURITY INVOKER by default).
-- ============================================================================
-- PART 7: Summary and Verification
-- ============================================================================
-- Create a function to verify RLS is enabled on all tables
CREATE OR REPLACE FUNCTION public.verify_rls_enabled() RETURNS TABLE (table_name TEXT, rls_enabled BOOLEAN) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    pg_temp AS $$ BEGIN RETURN QUERY
SELECT t.tablename::TEXT,
    t.rowsecurity as rls_enabled
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'erp_transaction_log',
        'security_events',
        'thermal_analysis',
        'grid_pricing',
        'model_variants',
        'audit_signatures',
        'machining_templates',
        'national_metrics',
        'predictive_maintenance_logs',
        'bending_calculations',
        'mass_production_runs'
    )
ORDER BY t.tablename;
END;
$$;
-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_rls_enabled() TO authenticated;
-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Anonymous Access Policies (WARN): Many tables intentionally allow anonymous
--    access for public-facing features (products, categories, etc.). These are
--    expected and acceptable for e-commerce functionality.
--
-- 2. Leaked Password Protection: Enable this in Supabase Dashboard:
--    Authentication > Settings > Password Protection > Enable "Leaked Password Protection"
--
-- 3. Postgres Version: Upgrade your Postgres version through Supabase Dashboard:
--    Settings > Database > Upgrade Database
--
-- 4. After running this migration, verify with:
--    SELECT * FROM public.verify_rls_enabled();
-- ============================================================================