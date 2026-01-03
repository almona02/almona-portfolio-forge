-- ============================================================================
-- Fix Genesis Event - Run this if genesis event is missing
-- ============================================================================
-- This script will create the genesis event if it doesn't exist.
-- If events already exist, it will handle the constraint properly.
-- ============================================================================
-- Step 1: Check current state
DO $$
DECLARE genesis_count INT;
total_events INT;
max_position BIGINT;
BEGIN
SELECT COUNT(*) INTO genesis_count
FROM reality_events
WHERE prev_hash IS NULL;
SELECT COUNT(*),
    COALESCE(MAX(chain_position), 0) INTO total_events,
    max_position
FROM reality_events;
RAISE NOTICE 'Current state: % total events, % genesis events, max position: %',
total_events,
genesis_count,
max_position;
-- If genesis exists, we're done
IF genesis_count = 1 THEN RAISE NOTICE '✅ Genesis event already exists';
RETURN;
END IF;
-- If there are existing events but no genesis, we need to handle this carefully
IF total_events > 0
AND genesis_count = 0 THEN RAISE NOTICE '⚠️  Events exist but no genesis. This is unusual.';
RAISE NOTICE '   Consider: DELETE FROM reality_events; then re-run this script.';
RAISE EXCEPTION 'Cannot create genesis: events already exist at wrong positions';
END IF;
-- If no events exist, create genesis
IF total_events = 0 THEN RAISE NOTICE 'Creating genesis event...';
-- Insert genesis event (will get chain_position = 1 from IDENTITY)
INSERT INTO reality_events (
        event_hash,
        prev_hash,
        event_type,
        entity_id,
        vertical_id,
        proof,
        recorded_at,
        created_at
    )
VALUES (
        '0000000000000000000000000000000000000000000000000000000000000000',
        -- 64 zeros
        NULL,
        -- Genesis has no parent
        'VERIFICATION',
        'realityos_genesis',
        'realityos_core',
        '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
        '2025-02-20 00:00:00'::timestamptz,
        '2025-02-20 00:00:00'::timestamptz
    );
RAISE NOTICE '✅ Genesis event created successfully';
END IF;
END $$;
-- Step 2: Verify genesis event
SELECT 'Genesis Event Verification' as test_name,
    COUNT(*) as genesis_count,
    CASE
        WHEN COUNT(*) = 1 THEN '✅ Genesis event exists'
        WHEN COUNT(*) = 0 THEN '❌ Genesis event still missing'
        ELSE '❌ Multiple genesis events (should be 1)'
    END as status
FROM reality_events
WHERE prev_hash IS NULL;
-- Step 3: Show genesis event details
SELECT 'Genesis Event Details' as test_name,
    event_hash,
    entity_id,
    vertical_id,
    chain_position,
    event_type,
    recorded_at
FROM reality_events
WHERE prev_hash IS NULL;
-- Step 4: Show all events (for debugging)
SELECT 'All Events' as test_name,
    chain_position,
    LEFT(event_hash, 16) || '...' as event_hash_short,
    CASE
        WHEN prev_hash IS NULL THEN 'NULL (genesis)'
        ELSE LEFT(prev_hash, 16) || '...'
    END as prev_hash_short,
    entity_id,
    vertical_id
FROM reality_events
ORDER BY chain_position;