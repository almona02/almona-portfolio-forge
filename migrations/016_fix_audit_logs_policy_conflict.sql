-- Migration 016: Fix Policy Conflicts in Migration 013
-- This migration fixes policy conflict errors when running migration 013
-- by ensuring policies are properly checked before creation
-- ============================================================================

-- Fix fabricator_audit_logs policies
DO $$
BEGIN
    -- Drop all possible policy names (including any variations)
    DROP POLICY IF EXISTS "Service role can view all audit logs" ON public.fabricator_audit_logs;
    DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.fabricator_audit_logs;
    DROP POLICY IF EXISTS "service_role_view_all_audit_logs" ON public.fabricator_audit_logs;
    DROP POLICY IF EXISTS "auth_view_own_audit_logs" ON public.fabricator_audit_logs;
    
    -- Recreate policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'fabricator_audit_logs' 
          AND policyname = 'service_role_view_all_audit_logs'
    ) THEN
        CREATE POLICY "service_role_view_all_audit_logs" ON public.fabricator_audit_logs
            FOR SELECT TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'fabricator_audit_logs' 
          AND policyname = 'auth_view_own_audit_logs'
    ) THEN
        CREATE POLICY "auth_view_own_audit_logs" ON public.fabricator_audit_logs
            FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    END IF;
END $$;

-- Fix fabricator_query_metrics policies
DO $$
BEGIN
    -- Drop all possible policy names
    DROP POLICY IF EXISTS "Service role can view all query metrics" ON public.fabricator_query_metrics;
    DROP POLICY IF EXISTS "Users can view their own query metrics" ON public.fabricator_query_metrics;
    DROP POLICY IF EXISTS "service_role_view_all_metrics" ON public.fabricator_query_metrics;
    DROP POLICY IF EXISTS "auth_view_own_metrics" ON public.fabricator_query_metrics;
    
    -- Recreate policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'fabricator_query_metrics' 
          AND policyname = 'service_role_view_all_metrics'
    ) THEN
        CREATE POLICY "service_role_view_all_metrics" ON public.fabricator_query_metrics
            FOR SELECT TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'fabricator_query_metrics' 
          AND policyname = 'auth_view_own_metrics'
    ) THEN
        CREATE POLICY "auth_view_own_metrics" ON public.fabricator_query_metrics
            FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    END IF;
END $$;

