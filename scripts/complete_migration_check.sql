-- ============================================================================
-- Complete Migration Check - Verify all migration steps completed
-- ============================================================================
-- Run this to check if migration 041 completed successfully
-- ============================================================================

-- Step 1: Check if table exists
SELECT 
    'Table Check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'reality_events'
        ) THEN '✅ Table exists'
        ELSE '❌ Table missing - Run migration first!'
    END as status;

-- Step 2: Check if ENUM type exists
SELECT 
    'ENUM Type Check' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'core_event_type'
        ) THEN '✅ ENUM type exists'
        ELSE '❌ ENUM type missing'
    END as status;

-- Step 3: Check if partition exists
SELECT 
    'Partition Check' as check_name,
    COUNT(*) as partition_count,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ Partitions exist'
        ELSE '❌ No partitions found'
    END as status
FROM pg_tables
WHERE tablename LIKE 'reality_events_%';

-- Step 4: Check if constraints exist
SELECT 
    'Constraint Check' as check_name,
    conname as constraint_name,
    CASE contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        ELSE 'OTHER'
    END as constraint_type
FROM pg_constraint
WHERE conrelid = 'reality_events'::regclass
ORDER BY conname;

-- Step 5: Check if indexes exist
SELECT 
    'Index Check' as check_name,
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Indexes exist'
        ELSE '⚠️  Some indexes may be missing'
    END as status
FROM pg_indexes
WHERE tablename = 'reality_events';

-- Step 6: Check if genesis event exists
SELECT 
    'Genesis Event Check' as check_name,
    COUNT(*) as genesis_count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ Genesis event exists'
        WHEN COUNT(*) = 0 THEN '❌ Genesis event missing - Run fix_genesis_event.sql'
        ELSE '❌ Multiple genesis events (should be 1)'
    END as status
FROM reality_events 
WHERE prev_hash IS NULL;

-- Step 7: Check permissions
SELECT 
    'Permission Check' as check_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'reality_events'
ORDER BY grantee, privilege_type;

-- Summary
SELECT 
    '=== MIGRATION STATUS SUMMARY ===' as summary;

SELECT 
    'Table' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reality_events') 
        THEN '✅' ELSE '❌' END as status
UNION ALL
SELECT 
    'ENUM Type',
    CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'core_event_type') 
        THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Partitions',
    CASE WHEN (SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'reality_events_%') >= 1 
        THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Constraints',
    CASE WHEN (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'reality_events'::regclass) >= 2 
        THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Indexes',
    CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'reality_events') >= 5 
        THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Genesis Event',
    CASE WHEN (SELECT COUNT(*) FROM reality_events WHERE prev_hash IS NULL) = 1 
        THEN '✅' ELSE '❌' END;


