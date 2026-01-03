-- ============================================================================
-- Verify and Recreate Genesis Event
-- ============================================================================
-- This script will check the current state and recreate genesis if needed
-- ============================================================================
-- Step 1: Check current state
DO $$
DECLARE event_count INT;
genesis_count INT;
seq_value BIGINT;
BEGIN
SELECT COUNT(*) INTO event_count
FROM reality_events;
SELECT COUNT(*) INTO genesis_count
FROM reality_events
WHERE prev_hash IS NULL;
SELECT last_value INTO seq_value
FROM reality_events_chain_position_seq;
RAISE NOTICE 'Current State:';
RAISE NOTICE '  Total events: %',
event_count;
RAISE NOTICE '  Genesis events: %',
genesis_count;
RAISE NOTICE '  Sequence value: %',
seq_value;
-- If events exist but no genesis, something is wrong
IF event_count > 0
AND genesis_count = 0 THEN RAISE NOTICE '⚠️  Events exist but no genesis! This violates constraints.';
RAISE NOTICE '   Deleting all events and resetting...';
DELETE FROM reality_events;
ALTER SEQUENCE reality_events_chain_position_seq RESTART WITH 1;
END IF;
-- If no events at all, create genesis
IF event_count = 0 THEN RAISE NOTICE 'Creating genesis event...';
-- Reset sequence first
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
    )
VALUES (
        '0000000000000000000000000000000000000000000000000000000000000000',
        NULL,
        'VERIFICATION',
        'realityos_genesis',
        'realityos_core',
        '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
        '2025-02-20 00:00:00'::timestamptz,
        '2025-02-20 00:00:00'::timestamptz
    );
RAISE NOTICE '✅ Genesis event created';
ELSIF genesis_count = 1 THEN RAISE NOTICE '✅ Genesis event already exists';
ELSE RAISE EXCEPTION 'Unexpected state: % events, % genesis events',
event_count,
genesis_count;
END IF;
END $$;
-- Step 2: Verify genesis exists and is correct
SELECT 'Genesis Verification' as check_name,
    chain_position,
    event_hash,
    entity_id,
    vertical_id,
    CASE
        WHEN chain_position = 1
        AND prev_hash IS NULL THEN '✅ Correct'
        ELSE '❌ Incorrect'
    END as status
FROM reality_events
WHERE prev_hash IS NULL;
-- Step 3: Show all events
SELECT 'All Events' as check_name,
    chain_position,
    LEFT(event_hash, 16) || '...' as event_hash_short,
    CASE
        WHEN prev_hash IS NULL THEN 'NULL (GENESIS)'
        ELSE LEFT(prev_hash, 16) || '...'
    END as prev_hash_short,
    entity_id,
    vertical_id,
    recorded_at
FROM reality_events
ORDER BY chain_position;
-- Step 4: Final count
SELECT 'Final Status' as check_name,
    COUNT(*) as total_events,
    COUNT(
        CASE
            WHEN prev_hash IS NULL THEN 1
        END
    ) as genesis_count,
    MIN(chain_position) as first_position,
    MAX(chain_position) as last_position,
    CASE
        WHEN COUNT(
            CASE
                WHEN prev_hash IS NULL THEN 1
            END
        ) = 1
        AND MIN(chain_position) = 1 THEN '✅ Ready'
        ELSE '❌ Issue'
    END as status
FROM reality_events;