-- Manage Unused Indexes Script
-- This script helps analyze and selectively remove unused indexes after running performance fixes
-- Execute this script ONLY after your application has been running for a while with the new indexes

-- =============================================================================
-- PART 1: ANALYZE CURRENT INDEX USAGE
-- =============================================================================

-- First, let's analyze which indexes are truly unused vs. newly created
DO $$
BEGIN
    RAISE NOTICE '=== INDEX USAGE ANALYSIS ===';
    RAISE NOTICE 'This analysis shows which indexes may be candidates for removal.';
    RAISE NOTICE 'NOTE: Newly created indexes may show 0 usage until queries actually use them.';
    RAISE NOTICE '';
END $$;

-- Display comprehensive index usage report
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as index_name,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED - Consider for removal after observation period'
        WHEN idx_scan < 10 THEN 'LOW USAGE - Monitor'
        WHEN idx_scan < 100 THEN 'MODERATE USAGE - Keep'
        ELSE 'HIGH USAGE - Keep'
    END as recommendation
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- =============================================================================
-- PART 2: CATEGORIZE INDEXES BY PURPOSE
-- =============================================================================

-- Foreign Key Indexes (Generally should be kept)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== FOREIGN KEY INDEXES (RECOMMENDED TO KEEP) ===';
    RAISE NOTICE 'These indexes support foreign key constraints and should typically be kept:';
END $$;

SELECT indexrelname as foreign_key_index, relname as tablename, idx_scan as scans
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND indexrelname ~ '_id$'
AND idx_scan = 0
ORDER BY relname, indexrelname;

-- Composite Indexes (Created for performance)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== COMPOSITE INDEXES (PERFORMANCE OPTIMIZATION) ===';
    RAISE NOTICE 'These indexes were created for specific query patterns:';
END $$;

SELECT indexrelname as composite_index, relname as tablename, idx_scan as scans
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND (indexrelname LIKE '%_user_%' OR 
     indexrelname LIKE '%_status_%' OR 
     indexrelname LIKE '%_created%' OR
     indexrelname LIKE '%_priority_%')
AND idx_scan = 0
ORDER BY relname, indexrelname;

-- =============================================================================
-- PART 3: SAFE REMOVAL CANDIDATES
-- =============================================================================

-- These are indexes that are likely safe to remove if truly unused
-- ONLY remove these after observing for 2-4 weeks in production

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== POTENTIAL REMOVAL CANDIDATES (OBSERVE FIRST) ===';
    RAISE NOTICE 'Consider removing these ONLY after 2-4 weeks of observation:';
END $$;

-- Legacy/redundant indexes that might be safe to remove
/*
-- UNCOMMENT THESE AFTER 2-4 WEEKS OF OBSERVATION IF STILL UNUSED

-- Remove obviously redundant single-column indexes on less critical fields
DROP INDEX IF EXISTS idx_products_featured; -- Covered by composite index
DROP INDEX IF EXISTS idx_service_tickets_type; -- Low usage expected
DROP INDEX IF EXISTS idx_service_tickets_source; -- Low usage expected

-- Remove some notification indexes if not used
DROP INDEX IF EXISTS idx_notifications_user_id; -- May be covered by composite

-- Remove some ticket message indexes if queries don't use them
DROP INDEX IF EXISTS idx_ticket_messages_message_type; -- Might not be queried
DROP INDEX IF EXISTS idx_ticket_messages_created_at; -- Covered by composite

-- Remove SLA-related indexes if SLA features aren't heavily used
DROP INDEX IF EXISTS idx_service_tickets_sla_response_due;
DROP INDEX IF EXISTS idx_service_tickets_sla_breached;

RAISE NOTICE 'Removed truly unused indexes after observation period';
*/

-- =============================================================================
-- PART 4: CRITICAL INDEXES TO KEEP
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CRITICAL INDEXES TO ALWAYS KEEP ===';
    RAISE NOTICE 'These indexes should NOT be removed even if showing low usage:';
    RAISE NOTICE '';
    RAISE NOTICE 'Foreign Key Indexes:';
    RAISE NOTICE '- All *_user_id indexes (for user data access)';
    RAISE NOTICE '- All *_product_id indexes (for product lookups)'; 
    RAISE NOTICE '- All *_order_id, *_quote_id indexes (for order/quote details)';
    RAISE NOTICE '- All *_ticket_id indexes (for ticket threading)';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance Indexes:';
    RAISE NOTICE '- idx_products_sku (for product searches)';
    RAISE NOTICE '- idx_products_active (for active product filtering)';
    RAISE NOTICE '- idx_service_tickets_assigned_to (for staff dashboards)';
    RAISE NOTICE '- idx_service_tickets_ticket_number (for ticket lookups)';
    RAISE NOTICE '';
    RAISE NOTICE 'Composite Indexes:';
    RAISE NOTICE '- All *_user_status_created indexes (for user dashboards)';
    RAISE NOTICE '- All *_status_priority_created indexes (for admin dashboards)';
END $$;

-- =============================================================================
-- PART 5: MONITORING RECOMMENDATIONS
-- =============================================================================

-- Create a monitoring function for ongoing index analysis
CREATE OR REPLACE FUNCTION public.weekly_index_review()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    scans_this_week BIGINT,
    size_mb NUMERIC,
    recommendation TEXT,
    action_needed TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_user_indexes.relname::TEXT,
        pg_stat_user_indexes.indexrelname::TEXT,
        COALESCE(pg_stat_user_indexes.idx_scan, 0) as scans_this_week,
        ROUND(pg_relation_size(pg_stat_user_indexes.indexrelid) / 1024.0 / 1024.0, 2) as size_mb,
        CASE 
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) = 0 AND pg_relation_size(pg_stat_user_indexes.indexrelid) > 10 * 1024 * 1024 
            THEN 'LARGE UNUSED INDEX'
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) = 0 
            THEN 'UNUSED - MONITOR'
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) < 10 
            THEN 'LOW USAGE - KEEP FOR NOW'
            ELSE 'ACTIVE - KEEP'
        END::TEXT as recommendation,
        CASE 
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) = 0 AND pg_relation_size(pg_stat_user_indexes.indexrelid) > 50 * 1024 * 1024 
            THEN 'REVIEW FOR REMOVAL'
            WHEN COALESCE(pg_stat_user_indexes.idx_scan, 0) = 0 
            THEN 'OBSERVE FOR 2-4 WEEKS'
            ELSE 'NO ACTION NEEDED'
        END::TEXT as action_needed
    FROM pg_stat_user_indexes
    WHERE pg_stat_user_indexes.schemaname = 'public'
    ORDER BY COALESCE(pg_stat_user_indexes.idx_scan, 0) ASC, pg_relation_size(pg_stat_user_indexes.indexrelid) DESC;
END;
$$;

-- =============================================================================
-- PART 6: USAGE INSTRUCTIONS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== USAGE INSTRUCTIONS ===';
    RAISE NOTICE '';
    RAISE NOTICE '1. IMMEDIATE ACTIONS:';
    RAISE NOTICE '   - Review the index analysis above';
    RAISE NOTICE '   - Do NOT remove any indexes yet';
    RAISE NOTICE '   - Let your application run for 2-4 weeks';
    RAISE NOTICE '';
    RAISE NOTICE '2. WEEKLY MONITORING:';
    RAISE NOTICE '   - Run: SELECT * FROM public.weekly_index_review();';
    RAISE NOTICE '   - Look for consistently unused large indexes';
    RAISE NOTICE '   - Document any patterns you observe';
    RAISE NOTICE '';
    RAISE NOTICE '3. AFTER 2-4 WEEKS:';
    RAISE NOTICE '   - Identify indexes with 0 scans consistently';
    RAISE NOTICE '   - Verify they are not critical foreign key indexes';
    RAISE NOTICE '   - Remove only obviously redundant indexes';
    RAISE NOTICE '   - Test application thoroughly after removals';
    RAISE NOTICE '';
    RAISE NOTICE '4. INDEXES TO NEVER REMOVE:';
    RAISE NOTICE '   - Primary key indexes';
    RAISE NOTICE '   - Unique constraint indexes';
    RAISE NOTICE '   - Foreign key indexes on high-traffic tables';
    RAISE NOTICE '   - Indexes supporting critical business queries';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Always backup before removing indexes!';
END $$;