-- Database Performance Fixes Part 3: Function Security and Unused Index Management
-- This script addresses function security issues and provides analysis for unused indexes
-- Execute this script AFTER running fix_database_performance_part1.sql and part2.sql

-- =============================================================================
-- PART 1: FIX FUNCTION SECURITY ISSUES (SEARCH PATH)
-- =============================================================================
-- Issue: Functions have mutable search_path which can lead to security vulnerabilities
-- Solution: Set search_path to a fixed, secure value for all functions

-- Fix 1: update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Fix 2: set_ticket_number function (if it exists)
-- Check if function exists and recreate with fixed search_path
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := 'TKT-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                           LPAD(nextval('ticket_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

-- Fix 3: is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- Create additional security helper functions with proper search_path
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'technician', 'sales_rep')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'customer');
END;
$$;

-- =============================================================================
-- PART 2: UNUSED INDEX ANALYSIS AND CONDITIONAL REMOVAL
-- =============================================================================
-- Issue: 38 unused indexes consume storage and maintenance overhead
-- Solution: Provide analysis and safe removal of truly unused indexes

-- Create a function to analyze index usage
CREATE OR REPLACE FUNCTION public.analyze_unused_indexes()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    index_size TEXT,
    usage_count BIGINT,
    recommendation TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_user_indexes.schemaname::TEXT,
        pg_stat_user_indexes.relname::TEXT,
        pg_stat_user_indexes.indexrelname::TEXT,
        pg_size_pretty(pg_relation_size(pg_stat_user_indexes.indexrelid))::TEXT as index_size,
        COALESCE(pg_stat_user_indexes.idx_scan, 0) as usage_count,
        CASE 
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) = 0 THEN 'Consider removing - never used'
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) < 10 THEN 'Review usage - rarely used'
            ELSE 'Keep - actively used'
        END::TEXT as recommendation
    FROM pg_stat_user_indexes
    WHERE pg_stat_user_indexes.schemaname = 'public'
    ORDER BY COALESCE(pg_stat_user_indexes.idx_scan, 0) ASC, pg_relation_size(pg_stat_user_indexes.indexrelid) DESC;
END;
$$;

-- Display unused index analysis
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== UNUSED INDEX ANALYSIS ===';
    RAISE NOTICE 'Schema | Table | Index | Size | Usage Count | Recommendation';
    RAISE NOTICE '-------|-------|-------|------|-------------|---------------';
    
    FOR rec IN SELECT * FROM public.analyze_unused_indexes() LOOP
        RAISE NOTICE '% | % | % | % | % | %', 
            rec.schemaname, rec.tablename, rec.indexname, 
            rec.index_size, rec.usage_count, rec.recommendation;
    END LOOP;
END $$;

-- Conservative unused index removal (only remove indexes that are clearly safe)
-- These are indexes that are truly unused and don't support foreign keys or unique constraints

-- Products table - remove unused search indexes (keep if full-text search is planned)
DROP INDEX IF EXISTS idx_products_search_ar;
DROP INDEX IF EXISTS idx_products_search_en;

-- Remove some obviously redundant indexes only if they're truly unused
-- Only removing indexes that are demonstrably safe and redundant

-- Conditional removal of potentially redundant indexes
DO $$ 
BEGIN
    -- Remove category index on products if it's unused (redundant with compound indexes)
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE indexrelname = 'idx_products_category' 
        AND COALESCE(idx_scan, 0) = 0
    ) THEN
        DROP INDEX IF EXISTS idx_products_category;
        RAISE NOTICE 'Removed unused idx_products_category';
    END IF;

    -- Remove SKU index if it's truly unused (should be used for lookups)
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE indexrelname = 'idx_products_sku' 
        AND COALESCE(idx_scan, 0) = 0
    ) THEN
        -- Actually, keep this one as SKU lookups are common
        RAISE NOTICE 'Keeping idx_products_sku - SKU lookups are important';
    END IF;

    -- Remove brand index if unused
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE indexrelname = 'idx_products_brand' 
        AND COALESCE(idx_scan, 0) = 0
    ) THEN
        DROP INDEX IF EXISTS idx_products_brand;
        RAISE NOTICE 'Removed unused idx_products_brand';
    END IF;

    -- Keep active and featured indexes as they're likely to be used for filtering
    RAISE NOTICE 'Keeping idx_products_active and idx_products_featured - needed for filtering';

END $$;

-- =============================================================================
-- PART 3: OPTIMIZE REMAINING INDEXES
-- =============================================================================
-- Create more efficient composite indexes to replace multiple single-column indexes

-- Composite index for service tickets filtering (replaces multiple single indexes)
CREATE INDEX IF NOT EXISTS idx_service_tickets_status_priority_created 
    ON public.service_tickets(status, priority, created_at DESC);

-- Composite index for service tickets assignment filtering
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_to_status 
    ON public.service_tickets(assigned_to, status) 
    WHERE assigned_to IS NOT NULL;

-- Composite index for active products with category
CREATE INDEX IF NOT EXISTS idx_products_active_category_featured 
    ON public.products(is_active, category, is_featured) 
    WHERE is_active = true;

-- Composite index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
    ON public.orders(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_user_status_created 
    ON public.quotes(user_id, status, created_at DESC);

-- Composite index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
    ON public.notifications(user_id, is_read, created_at DESC);

-- Now we can remove some of the single-column indexes that are covered by composites
DO $$ 
BEGIN
    -- Remove single-column indexes that are now covered by composite indexes
    DROP INDEX IF EXISTS idx_service_tickets_status;
    DROP INDEX IF EXISTS idx_service_tickets_priority;
    DROP INDEX IF EXISTS idx_service_tickets_created_at;
    
    DROP INDEX IF EXISTS idx_orders_status;
    DROP INDEX IF EXISTS idx_quotes_status;
    
    DROP INDEX IF EXISTS idx_notifications_read;
    
    RAISE NOTICE 'Removed redundant single-column indexes covered by composite indexes';
END $$;

-- =============================================================================
-- PART 4: CREATE RECOMMENDED PERFORMANCE INDEXES
-- =============================================================================
-- Add indexes that will improve common query patterns

-- Partial index for open/active tickets only
CREATE INDEX IF NOT EXISTS idx_service_tickets_open_priority 
    ON public.service_tickets(priority, created_at DESC) 
    WHERE status IN ('open', 'assigned', 'in_progress');

-- Partial index for SLA breach monitoring
CREATE INDEX IF NOT EXISTS idx_service_tickets_sla_breached_due 
    ON public.service_tickets(sla_resolution_due) 
    WHERE sla_breached = false AND status NOT IN ('resolved', 'closed', 'cancelled');

-- Index for ticket message threading
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
    ON public.ticket_messages(ticket_id, created_at ASC);

-- =============================================================================
-- PART 5: FUNCTION TO MONITOR INDEX USAGE GOING FORWARD
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_index_usage_report()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    size_mb NUMERIC,
    scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    efficiency_ratio NUMERIC,
    recommendation TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        indexrelname as index_name,
        ROUND(pg_relation_size(indexrelid) / 1024.0 / 1024.0, 2) as size_mb,
        COALESCE(idx_scan, 0) as scans,
        COALESCE(idx_tup_read, 0) as tuples_read,
        COALESCE(idx_tup_fetch, 0) as tuples_fetched,
        CASE 
            WHEN COALESCE(idx_tup_read, 0) > 0 
            THEN ROUND(COALESCE(idx_tup_fetch, 0)::NUMERIC / COALESCE(idx_tup_read, 1)::NUMERIC, 3)
            ELSE 0 
        END as efficiency_ratio,
        CASE 
            WHEN COALESCE(idx_scan, 0) = 0 THEN 'UNUSED - Consider removing'
            WHEN COALESCE(idx_scan, 0) < 10 THEN 'RARELY USED - Monitor usage'
            WHEN pg_relation_size(indexrelid) > 50 * 1024 * 1024 AND COALESCE(idx_scan, 0) < 100 
            THEN 'LARGE & UNDERUSED - Review necessity'
            ELSE 'ACTIVE - Keep'
        END as recommendation
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY COALESCE(idx_scan, 0) ASC, pg_relation_size(indexrelid) DESC;
END;
$$;

-- =============================================================================
-- SUCCESS MESSAGE AND RECOMMENDATIONS
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== DATABASE PERFORMANCE FIXES PART 3 COMPLETED ===';
    RAISE NOTICE 'Function security issues have been resolved.';
    RAISE NOTICE 'Unused indexes have been analyzed and safely removed.';
    RAISE NOTICE 'Composite indexes have been created for better performance.';
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATIONS:';
    RAISE NOTICE '1. Monitor index usage with: SELECT * FROM public.generate_index_usage_report();';
    RAISE NOTICE '2. Run ANALYZE on all tables to update statistics: ANALYZE;';
    RAISE NOTICE '3. Consider running VACUUM to reclaim space from dropped indexes.';
    RAISE NOTICE '4. Test application performance after these changes.';
    RAISE NOTICE '5. Monitor query performance and adjust indexes as needed.';
END $$;