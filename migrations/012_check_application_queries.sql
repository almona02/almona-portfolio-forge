-- Check Application Query Performance
-- This shows the actual application queries that should be using the new indexes
-- ============================================================================

-- 1. Find fabricator_profiles queries (should use idx_fabricator_profiles_user_created_desc)
SELECT 
    auth.rolname,
    statements.calls,
    ROUND((statements.total_exec_time + statements.total_plan_time)::numeric, 2) as total_time_ms,
    ROUND((statements.mean_exec_time + statements.mean_plan_time)::numeric, 2) as mean_time_ms,
    ROUND((statements.min_exec_time + statements.min_plan_time)::numeric, 2) as min_time_ms,
    ROUND((statements.max_exec_time + statements.max_plan_time)::numeric, 2) as max_time_ms,
    LEFT(REPLACE(REPLACE(statements.query, E'\n', ' '), '  ', ' '), 150) as query_preview
FROM pg_stat_statements as statements
INNER JOIN pg_authid as auth ON statements.userid = auth.oid
WHERE statements.query ILIKE '%fabricator_profiles%'
    AND statements.query ILIKE '%user_id%'
    AND statements.query ILIKE '%created_at%'
    AND statements.calls > 0
ORDER BY (statements.total_exec_time + statements.total_plan_time) DESC
LIMIT 10;

-- 2. Find get_remnant_consolidation_suggestions queries (should use material_remnants indexes)
SELECT 
    auth.rolname,
    statements.calls,
    ROUND((statements.total_exec_time + statements.total_plan_time)::numeric, 2) as total_time_ms,
    ROUND((statements.mean_exec_time + statements.mean_plan_time)::numeric, 2) as mean_time_ms,
    ROUND((statements.min_exec_time + statements.min_plan_time)::numeric, 2) as min_time_ms,
    ROUND((statements.max_exec_time + statements.max_plan_time)::numeric, 2) as max_time_ms,
    LEFT(REPLACE(REPLACE(statements.query, E'\n', ' '), '  ', ' '), 150) as query_preview
FROM pg_stat_statements as statements
INNER JOIN pg_authid as auth ON statements.userid = auth.oid
WHERE statements.query ILIKE '%get_remnant_consolidation_suggestions%'
    AND statements.calls > 0
ORDER BY (statements.total_exec_time + statements.total_plan_time) DESC
LIMIT 10;

-- 3. Find stock_movements queries (should use idx_stock_movements_user_created_desc)
SELECT 
    auth.rolname,
    statements.calls,
    ROUND((statements.total_exec_time + statements.total_plan_time)::numeric, 2) as total_time_ms,
    ROUND((statements.mean_exec_time + statements.mean_plan_time)::numeric, 2) as mean_time_ms,
    ROUND((statements.min_exec_time + statements.min_plan_time)::numeric, 2) as min_time_ms,
    ROUND((statements.max_exec_time + statements.max_plan_time)::numeric, 2) as max_time_ms,
    LEFT(REPLACE(REPLACE(statements.query, E'\n', ' '), '  ', ' '), 150) as query_preview
FROM pg_stat_statements as statements
INNER JOIN pg_authid as auth ON statements.userid = auth.oid
WHERE statements.query ILIKE '%stock_movements%'
    AND statements.query ILIKE '%user_id%'
    AND statements.query ILIKE '%created_at%'
    AND statements.calls > 0
ORDER BY (statements.total_exec_time + statements.total_plan_time) DESC
LIMIT 10;

-- 4. Find material_remnants queries (should use material_remnants indexes)
SELECT 
    auth.rolname,
    statements.calls,
    ROUND((statements.total_exec_time + statements.total_plan_time)::numeric, 2) as total_time_ms,
    ROUND((statements.mean_exec_time + statements.mean_plan_time)::numeric, 2) as mean_time_ms,
    ROUND((statements.min_exec_time + statements.min_plan_time)::numeric, 2) as min_time_ms,
    ROUND((statements.max_exec_time + statements.max_plan_time)::numeric, 2) as max_time_ms,
    LEFT(REPLACE(REPLACE(statements.query, E'\n', ' '), '  ', ' '), 150) as query_preview
FROM pg_stat_statements as statements
INNER JOIN pg_authid as auth ON statements.userid = auth.oid
WHERE statements.query ILIKE '%material_remnants%'
    AND statements.query ILIKE '%user_id%'
    AND statements.calls > 0
ORDER BY (statements.total_exec_time + statements.total_plan_time) DESC
LIMIT 10;

-- 5. Show all top queries by total time (excluding dashboard queries)
SELECT 
    auth.rolname,
    statements.calls,
    ROUND((statements.total_exec_time + statements.total_plan_time)::numeric, 2) as total_time_ms,
    ROUND((statements.mean_exec_time + statements.mean_plan_time)::numeric, 2) as mean_time_ms,
    LEFT(REPLACE(REPLACE(statements.query, E'\n', ' '), '  ', ' '), 200) as query_preview
FROM pg_stat_statements as statements
INNER JOIN pg_authid as auth ON statements.userid = auth.oid
WHERE statements.query NOT ILIKE '%pg_stat_statements%'
    AND statements.query NOT ILIKE '%pg_statio%'
    AND statements.query NOT ILIKE '%reports-query-performance%'
    AND statements.query NOT ILIKE '%SET statement_timeout%'
    AND statements.query NOT ILIKE '%SET idle_session_timeout%'
    AND statements.query NOT ILIKE '%set search_path%'
    AND statements.calls > 0
ORDER BY (statements.total_exec_time + statements.total_plan_time) DESC
LIMIT 20;

-- 6. Summary
SELECT 
    'Application queries check complete.' as status,
    'If no results appear, your application may not have run queries yet.' as note,
    'Try using your application (load profiles, view inventory) and then re-run this script.' as action;

