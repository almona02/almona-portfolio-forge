-- ============================================================================
-- Debug COUNT Issue - All queries in single transaction
-- ============================================================================

BEGIN;

-- Test 1: Direct SELECT (this works)
SELECT 'Test 1: Direct SELECT' as test, COUNT(*) as count 
FROM reality_events;

-- Test 2: SELECT with WHERE (genesis)
SELECT 'Test 2: Genesis SELECT' as test, COUNT(*) as count 
FROM reality_events 
WHERE prev_hash IS NULL;

-- Test 3: Show actual rows
SELECT 'Test 3: Show Rows' as test, chain_position, entity_id 
FROM reality_events 
ORDER BY chain_position;

-- Test 4: Count from partition directly
SELECT 'Test 4: Count from Partition' as test, COUNT(*) as count 
FROM reality_events_2025_02;

-- Test 5: Count from parent table
SELECT 'Test 5: Count from Parent' as test, COUNT(*) as count 
FROM ONLY reality_events;

-- Test 6: Check if it's a view issue
SELECT 'Test 6: Check View' as test, COUNT(*) as count 
FROM reality_events_readonly;

-- Test 7: Explicit schema qualification
SELECT 'Test 7: Schema Qualified' as test, COUNT(*) as count 
FROM public.reality_events;

-- Test 8: Check table type
SELECT 
    'Test 8: Table Type' as test,
    relkind,
    relname,
    relispartition
FROM pg_class 
WHERE relname = 'reality_events' OR relname = 'reality_events_2025_02';

COMMIT;

-- Test 9: Outside transaction - simple count
SELECT 'Test 9: Simple Count (Outside TX)' as test, COUNT(*) as count 
FROM reality_events;

