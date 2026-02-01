-- =====================================================
-- SUPABASE MIGRATION STATUS CHECK
-- Run this in Supabase SQL Editor to check current state
-- =====================================================

-- 1. Check all existing tables in public schema
SELECT 
    'TABLES' as check_type,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check for custom schemas (aftersales, fabricator, realityos, ioms)
SELECT 
    'SCHEMAS' as check_type,
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- 3. Check installed extensions
SELECT 
    'EXTENSIONS' as check_type,
    extname as extension_name,
    extversion as version
FROM pg_extension
ORDER BY extname;

-- 4. Check custom ENUM types
SELECT 
    'ENUM_TYPES' as check_type,
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- 5. Check RLS status on all tables
SELECT 
    'RLS_STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. Check existing indexes
SELECT 
    'INDEXES' as check_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY tablename, indexname;

-- 7. Check for specific core tables (E-commerce)
SELECT 
    'CORE_ECOMMERCE_TABLES' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (
    VALUES 
        ('profiles'),
        ('products'),
        ('product_variants'),
        ('categories'),
        ('quotes'),
        ('quote_items'),
        ('orders'),
        ('order_items'),
        ('pricing_tiers'),
        ('product_reviews'),
        ('wishlists'),
        ('recently_viewed'),
        ('notifications'),
        ('audit_logs')
) AS t(table_name)
ORDER BY table_name;

-- 8. Check for Inventory tables
SELECT 
    'INVENTORY_TABLES' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (
    VALUES 
        ('inventory_reservations'),
        ('inventory_logs'),
        ('stock_alerts')
) AS t(table_name)
ORDER BY table_name;

-- 9. Check for Fabricator tables
SELECT 
    'FABRICATOR_TABLES' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (
    VALUES 
        ('fabricator_profiles'),
        ('fabricator_projects'),
        ('fabricator_accessories'),
        ('remnants'),
        ('remnant_movements'),
        ('cutting_optimizations'),
        ('calibration_sessions'),
        ('system_packs'),
        ('profiles_library')
) AS t(table_name)
ORDER BY table_name;

-- 10. Check for YDT Service tables
SELECT 
    'YDT_SERVICE_TABLES' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (
    VALUES 
        ('yilmaz_machines'),
        ('yilmaz_machine_knowledge'),
        ('machine_components'),
        ('machine_faults'),
        ('knowledge_validation_feedback'),
        ('review_tasks'),
        ('learning_courses'),
        ('service_tickets'),
        ('ticket_messages'),
        ('machine_telemetry')
) AS t(table_name)
ORDER BY table_name;

-- 11. Check for RealityOS tables
SELECT 
    'REALITYOS_TABLES' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (
    VALUES 
        ('event_ledger'),
        ('qr_lifecycle'),
        ('activity_events')
) AS t(table_name)
ORDER BY table_name;

-- 12. Check for IOMS tables
SELECT 
    'IOMS_TABLES' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (
    VALUES 
        ('operations'),
        ('operation_logs'),
        ('dashboard_metrics'),
        ('report_schedules')
) AS t(table_name)
ORDER BY table_name;

-- 13. Check for functions
SELECT 
    'FUNCTIONS' as check_type,
    routine_name as function_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 14. Check for triggers
SELECT 
    'TRIGGERS' as check_type,
    trigger_schema,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 15. Check RLS policies
SELECT 
    'RLS_POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 16. Check for vector extension (for YDT knowledge graph)
SELECT 
    'VECTOR_EXTENSION' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
        THEN '✅ pgvector installed' 
        ELSE '❌ pgvector NOT installed (needed for YDT)' 
    END as status;

-- 17. Check for pg_trgm extension (for full-text search)
SELECT 
    'TRGM_EXTENSION' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') 
        THEN '✅ pg_trgm installed' 
        ELSE '❌ pg_trgm NOT installed (needed for search)' 
    END as status;

-- 18. Check table row counts (for populated tables)
SELECT 
    'TABLE_ROW_COUNTS' as check_type,
    schemaname,
    relname as table_name,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- 19. Summary statistics
SELECT 
    'SUMMARY' as check_type,
    (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') as total_functions,
    (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- 20. Check for migration tracking table
SELECT 
    'MIGRATION_TRACKING' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') 
        THEN '✅ schema_migrations table exists' 
        ELSE '❌ No migration tracking table found' 
    END as status;

-- If schema_migrations exists, show applied migrations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        RAISE NOTICE 'Fetching applied migrations...';
    END IF;
END $$;
