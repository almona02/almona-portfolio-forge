-- ============================================================================
-- Security Hardening - Secure Materialized Views
-- ============================================================================
-- This migration secures materialized views by revoking public access and
-- granting SELECT only to authenticated users.
--
-- Security Issue: Materialized views containing analytics data are accessible
-- via the PostgREST API to anonymous users, potentially exposing sensitive
-- business metrics.
--
-- Solution: Revoke public access and grant SELECT to authenticated role only.
-- ============================================================================

-- Revoke all public access to materialized views
REVOKE ALL ON mv_category_performance FROM anon;
REVOKE ALL ON mv_category_performance FROM authenticated;

REVOKE ALL ON mv_daily_ticket_trends FROM anon;
REVOKE ALL ON mv_daily_ticket_trends FROM authenticated;

REVOKE ALL ON mv_product_performance FROM anon;
REVOKE ALL ON mv_product_performance FROM authenticated;

REVOKE ALL ON mv_ticket_stats_by_status FROM anon;
REVOKE ALL ON mv_ticket_stats_by_status FROM authenticated;

REVOKE ALL ON mv_technician_performance FROM anon;
REVOKE ALL ON mv_technician_performance FROM authenticated;

REVOKE ALL ON mv_event_type_distribution FROM anon;
REVOKE ALL ON mv_event_type_distribution FROM authenticated;

REVOKE ALL ON mv_top_products FROM anon;
REVOKE ALL ON mv_top_products FROM authenticated;

-- Grant SELECT to authenticated users only
GRANT SELECT ON mv_category_performance TO authenticated;
GRANT SELECT ON mv_daily_ticket_trends TO authenticated;
GRANT SELECT ON mv_product_performance TO authenticated;
GRANT SELECT ON mv_ticket_stats_by_status TO authenticated;
GRANT SELECT ON mv_technician_performance TO authenticated;
GRANT SELECT ON mv_event_type_distribution TO authenticated;
GRANT SELECT ON mv_top_products TO authenticated;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify materialized view permissions:
-- 
-- SELECT 
--     schemaname,
--     matviewname,
--     has_table_privilege('anon', schemaname || '.' || matviewname, 'SELECT') as anon_can_select,
--     has_table_privilege('authenticated', schemaname || '.' || matviewname, 'SELECT') as auth_can_select
-- FROM pg_matviews
-- WHERE schemaname = 'public'
--     AND matviewname LIKE 'mv_%';
-- 
-- Expected result:
-- - anon_can_select: false (for all views)
-- - auth_can_select: true (for all views)
-- ============================================================================
