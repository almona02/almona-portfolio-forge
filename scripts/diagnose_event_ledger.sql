-- ============================================================================
-- RealityOS Event Ledger - Diagnostic Script
-- ============================================================================
-- Run this to diagnose why events might not be showing up
-- ============================================================================

-- Check 1: Direct count from reality_events
SELECT 
    'Direct Count' as check_name,
    COUNT(*) as total_events,
    COUNT(CASE WHEN prev_hash IS NULL THEN 1 END) as genesis_count
FROM reality_events;

-- Check 2: Check each partition separately
SELECT 
    'Partition Check' as check_name,
    schemaname,
    tablename as partition_name,
    (SELECT COUNT(*) FROM reality_events WHERE recorded_at >= '2025-01-01' AND recorded_at < '2025-02-01') as jan_2025_count,
    (SELECT COUNT(*) FROM reality_events WHERE recorded_at >= '2025-02-01' AND recorded_at < '2025-03-01') as feb_2025_count,
    (SELECT COUNT(*) FROM reality_events WHERE recorded_at >= '2025-03-01') as mar_2025_plus_count
FROM pg_tables
WHERE tablename LIKE 'reality_events%'
ORDER BY tablename;

-- Check 3: Show all events with partition info
SELECT 
    'All Events' as check_name,
    chain_position,
    LEFT(event_hash, 16) || '...' as event_hash_short,
    CASE WHEN prev_hash IS NULL THEN 'NULL (GENESIS)' ELSE LEFT(prev_hash, 16) || '...' END as prev_hash_short,
    entity_id,
    vertical_id,
    recorded_at,
    pg_get_expr(pg_class.relpartbound, pg_class.oid) as partition_bound
FROM reality_events
LEFT JOIN pg_class ON pg_class.relname = 'reality_events'
ORDER BY chain_position;

-- Check 4: Check if genesis is in the right partition
SELECT 
    'Genesis Partition Check' as check_name,
    chain_position,
    entity_id,
    recorded_at,
    CASE 
        WHEN recorded_at >= '2025-02-01' AND recorded_at < '2025-03-01' THEN '✅ In Feb 2025 partition'
        WHEN recorded_at >= '2025-01-01' AND recorded_at < '2025-02-01' THEN '⚠️  In Jan 2025 partition'
        ELSE '❌ Outside expected partitions'
    END as partition_status
FROM reality_events
WHERE prev_hash IS NULL;

-- Check 5: Verify table structure
SELECT 
    'Table Structure' as check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'reality_events'
ORDER BY ordinal_position;

-- Check 6: Check constraints
SELECT 
    'Constraints' as check_name,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'reality_events'::regclass
ORDER BY conname;

-- Check 7: Check sequence status
SELECT 
    'Sequence Status' as check_name,
    last_value,
    is_called
FROM reality_events_chain_position_seq;

