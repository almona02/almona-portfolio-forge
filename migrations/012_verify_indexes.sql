-- Migration 012: Verify Performance Indexes
-- Run this after migration 012_fix_performance_indexes.sql to verify indexes were created
-- ============================================================================

-- 1. Check if all new indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE 'idx_fabricator_profiles_user_created_desc' THEN '✓ Optimizes fabricator_profiles ORDER BY created_at DESC'
        WHEN indexname LIKE 'idx_stock_movements_user_created_desc' THEN '✓ Optimizes stock_movements ORDER BY created_at DESC'
        WHEN indexname LIKE 'idx_material_remnants_profile_user_status_length' THEN '✓ Optimizes get_remnant_consolidation_suggestions JOIN'
        WHEN indexname LIKE 'idx_material_remnants_user_status' THEN '✓ Optimizes material_remnants by user_id and status'
        WHEN indexname LIKE 'idx_material_remnants_user_status_created_desc' THEN '✓ Optimizes getAvailableRemnants ORDER BY created_at DESC'
        ELSE 'Foreign key or other index'
    END as purpose
FROM pg_indexes 
WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_fabricator_profiles_user_created_desc'
        OR indexname LIKE 'idx_stock_movements_user_created_desc'
        OR indexname LIKE 'idx_material_remnants_profile_user_status_length'
        OR indexname LIKE 'idx_material_remnants_user_status'
        OR indexname LIKE 'idx_material_remnants_user_status_created_desc'
        OR indexname LIKE 'idx_fabricator_backup_operations_source_backup_id'
        OR indexname LIKE 'idx_fabricator_customers_owner_user_id'
        OR indexname LIKE 'idx_fabricator_positions_owner_user_id'
        OR indexname LIKE 'idx_fabricator_project_members_member_profile_id'
        OR indexname LIKE 'idx_fabricator_system_packs_owner_user_id'
        OR indexname LIKE 'idx_fabricator_team_members_member_profile_id'
        OR indexname LIKE 'idx_inventory_logs_user_id'
        OR indexname LIKE 'idx_price_history_changed_by'
        OR indexname LIKE 'idx_price_validation_alerts_resolved_by'
        OR indexname LIKE 'idx_stock_alerts_acknowledged_by'
        OR indexname LIKE 'idx_stock_alerts_resolved_by'
        OR indexname LIKE 'idx_stock_movements_created_by'
        OR indexname LIKE 'idx_stock_movements_location_id'
        OR indexname LIKE 'idx_stock_movements_related_movement_id'
    )
ORDER BY tablename, indexname;

-- 2. Check index usage statistics (requires some query activity first)
-- Note: New indexes will show 0 scans until queries actually use them
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as index_name,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN '⚠️ Not used yet (may need query activity)'
        WHEN idx_scan < 10 THEN '✓ Low usage'
        WHEN idx_scan < 100 THEN '✓ Moderate usage'
        ELSE '✓ High usage'
    END as usage_status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
    AND (
        indexrelname LIKE 'idx_fabricator_profiles_user_created_desc'
        OR indexrelname LIKE 'idx_stock_movements_user_created_desc'
        OR indexrelname LIKE 'idx_material_remnants_profile_user_status_length'
        OR indexrelname LIKE 'idx_material_remnants_user_status'
        OR indexrelname LIKE 'idx_material_remnants_user_status_created_desc'
    )
ORDER BY idx_scan DESC, relname, indexrelname;

-- 3. Check query performance for optimized queries
-- This shows the actual application queries we optimized
SELECT 
    auth.rolname,
    LEFT(statements.query, 100) as query_preview,
    statements.calls,
    ROUND((statements.total_exec_time + statements.total_plan_time)::numeric, 2) as total_time_ms,
    ROUND(((statements.mean_exec_time + statements.mean_plan_time))::numeric, 2) as mean_time_ms,
    statements.rows / NULLIF(statements.calls, 0) as avg_rows_per_call,
    CASE 
        WHEN statements.query LIKE '%fabricator_profiles%user_id%created_at%DESC%' THEN '✓ Should use idx_fabricator_profiles_user_created_desc'
        WHEN statements.query LIKE '%stock_movements%user_id%created_at%DESC%' THEN '✓ Should use idx_stock_movements_user_created_desc'
        WHEN statements.query LIKE '%get_remnant_consolidation_suggestions%' THEN '✓ Should use idx_material_remnants indexes'
        WHEN statements.query LIKE '%material_remnants%user_id%status%created_at%DESC%' THEN '✓ Should use idx_material_remnants_user_status_created_desc'
        ELSE 'Other query'
    END as expected_index_usage
FROM pg_stat_statements as statements
INNER JOIN pg_authid as auth ON statements.userid = auth.oid
WHERE statements.query LIKE '%fabricator_profiles%user_id%created_at%DESC%'
    OR statements.query LIKE '%stock_movements%user_id%created_at%DESC%'
    OR statements.query LIKE '%get_remnant_consolidation_suggestions%'
    OR statements.query LIKE '%material_remnants%user_id%status%created_at%DESC%'
ORDER BY (statements.total_exec_time + statements.total_plan_time) DESC
LIMIT 20;

-- 4. Summary message
SELECT 
    'Index verification complete. Check the results above.' as status,
    'If indexes show 0 usage, run some application queries first, then re-run this script.' as note;

