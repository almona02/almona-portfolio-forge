-- ============================================================================
-- Simple Summary Test - Debug why counts show 0
-- ============================================================================

-- Test 1: Direct count
SELECT 'Direct Count Test' as test_name, COUNT(*) as count FROM reality_events;

-- Test 2: Genesis count
SELECT 'Genesis Count Test' as test_name, COUNT(*) as count 
FROM reality_events 
WHERE prev_hash IS NULL;

-- Test 3: Show all events
SELECT 'All Events' as test_name, chain_position, entity_id, prev_hash 
FROM reality_events 
ORDER BY chain_position;

-- Test 4: CTE test
WITH stats AS (
    SELECT COUNT(*) as total FROM reality_events
)
SELECT 'CTE Test' as test_name, total FROM stats;

-- Test 5: Full qualified table name
SELECT 'Schema Qualified Test' as test_name, COUNT(*) as count 
FROM public.reality_events;

-- Test 6: Check if table exists in current schema
SELECT 'Table Check' as test_name, 
    schemaname, 
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'reality_events';

