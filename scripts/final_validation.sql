-- ============================================================================
-- Final Validation - Single Transaction, Force Fresh Query
-- ============================================================================
-- This script runs everything in one transaction to ensure consistency
-- ============================================================================

BEGIN;

-- Force a fresh query by using explicit table scan
SET LOCAL enable_seqscan = ON;
SET LOCAL enable_indexscan = ON;

-- Step 1: Direct count (no subqueries, no CTEs)
SELECT 
    'Step 1: Direct Count' as test_step,
    COUNT(*) as total_events,
    COUNT(CASE WHEN prev_hash IS NULL THEN 1 END) as genesis_count
FROM reality_events;

-- Step 2: Count from partition directly
SELECT 
    'Step 2: Partition Count' as test_step,
    COUNT(*) as partition_events
FROM reality_events_2025_02;

-- Step 3: Show all events (if any)
SELECT 
    'Step 3: All Events' as test_step,
    chain_position,
    entity_id,
    LEFT(event_hash, 16) || '...' as hash_short,
    CASE WHEN prev_hash IS NULL THEN 'GENESIS' ELSE 'CHAINED' END as event_type
FROM reality_events
ORDER BY chain_position;

-- Step 4: Check if table is actually a view
SELECT 
    'Step 4: Table Type' as test_step,
    relkind,
    relname,
    CASE 
        WHEN relkind = 'r' THEN 'Regular Table'
        WHEN relkind = 'v' THEN 'View'
        WHEN relkind = 'p' THEN 'Partitioned Table'
        ELSE 'Other'
    END as table_type
FROM pg_class
WHERE relname IN ('reality_events', 'reality_events_2025_02', 'reality_events_readonly')
ORDER BY relname;

-- Step 5: Check RLS policies
SELECT 
    'Step 5: RLS Status' as test_step,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'reality_events';

-- Step 6: If no events, create genesis NOW
DO $$
DECLARE
    event_count INT;
BEGIN
    SELECT COUNT(*) INTO event_count FROM reality_events;
    
    IF event_count = 0 THEN
        RAISE NOTICE 'No events found. Creating genesis in this transaction...';
        
        -- Reset sequence
        ALTER SEQUENCE reality_events_chain_position_seq RESTART WITH 1;
        
        -- Insert genesis
        INSERT INTO reality_events (
            event_hash,
            prev_hash,
            event_type,
            entity_id,
            vertical_id,
            proof,
            recorded_at,
            created_at
        ) VALUES (
            '0000000000000000000000000000000000000000000000000000000000000000',
            NULL,
            'VERIFICATION'::core_event_type,
            'realityos_genesis',
            'realityos_core',
            '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
            '2025-02-20 00:00:00'::timestamptz,
            '2025-02-20 00:00:00'::timestamptz
        );
        
        RAISE NOTICE 'Genesis created. Verifying...';
        
        -- Verify immediately
        SELECT COUNT(*) INTO event_count FROM reality_events;
        RAISE NOTICE 'After insert: % events found', event_count;
    ELSE
        RAISE NOTICE 'Events already exist: %', event_count;
    END IF;
END $$;

-- Step 7: Final count AFTER potential insert
SELECT 
    'Step 7: Final Count' as test_step,
    COUNT(*) as total_events,
    COUNT(CASE WHEN prev_hash IS NULL THEN 1 END) as genesis_count,
    MIN(chain_position) as first_position,
    MAX(chain_position) as last_position
FROM reality_events;

COMMIT;

-- Step 8: Count AFTER commit (outside transaction)
SELECT 
    'Step 8: Post-Commit Count' as test_step,
    COUNT(*) as total_events,
    COUNT(CASE WHEN prev_hash IS NULL THEN 1 END) as genesis_count
FROM reality_events;

