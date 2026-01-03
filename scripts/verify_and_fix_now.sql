-- ============================================================================
-- Verify Current State and Fix Immediately
-- ============================================================================
-- This script checks the ACTUAL current state and fixes if needed
-- ============================================================================
-- Step 1: Check what actually exists RIGHT NOW
SELECT 'Current State Check' as step,
    COUNT(*) as total_events,
    COUNT(
        CASE
            WHEN prev_hash IS NULL THEN 1
        END
    ) as genesis_count,
    (
        SELECT COUNT(*)
        FROM reality_events_2025_02
    ) as partition_count
FROM reality_events;
-- Step 2: Show any existing events
SELECT 'Existing Events' as step,
    chain_position,
    entity_id,
    LEFT(event_hash, 16) || '...' as hash_short
FROM reality_events
ORDER BY chain_position;
-- Step 3: If no events exist, create genesis
DO $$
DECLARE event_count INT;
genesis_exists INT;
BEGIN
SELECT COUNT(*) INTO event_count
FROM reality_events;
SELECT COUNT(*) INTO genesis_exists
FROM reality_events
WHERE prev_hash IS NULL;
RAISE NOTICE 'Before fix: % total events, % genesis events',
event_count,
genesis_exists;
-- If no events at all, delete any orphaned data and reset
IF event_count = 0 THEN RAISE NOTICE 'No events found. Resetting sequence and creating genesis...';
-- Reset sequence
ALTER SEQUENCE reality_events_chain_position_seq RESTART WITH 1;
-- Create genesis
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
        'VERIFICATION'::core_event_type,
        'realityos_genesis',
        'realityos_core',
        '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
        '2025-02-20 00:00:00'::timestamptz,
        '2025-02-20 00:00:00'::timestamptz
    );
RAISE NOTICE '✅ Genesis event created';
ELSIF genesis_exists = 0
AND event_count > 0 THEN RAISE NOTICE '⚠️  Events exist but no genesis. This is invalid.';
RAISE NOTICE '   Deleting all events and recreating genesis...';
DELETE FROM reality_events;
ALTER SEQUENCE reality_events_chain_position_seq RESTART WITH 1;
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
        'VERIFICATION'::core_event_type,
        'realityos_genesis',
        'realityos_core',
        '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
        '2025-02-20 00:00:00'::timestamptz,
        '2025-02-20 00:00:00'::timestamptz
    );
RAISE NOTICE '✅ Fixed: Genesis event created';
ELSE RAISE NOTICE '✅ Genesis event already exists';
END IF;
-- Verify after fix
SELECT COUNT(*) INTO event_count
FROM reality_events;
SELECT COUNT(*) INTO genesis_exists
FROM reality_events
WHERE prev_hash IS NULL;
RAISE NOTICE 'After fix: % total events, % genesis events',
event_count,
genesis_exists;
END $$;
-- Step 4: Verify final state
SELECT 'Final Verification' as step,
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
        AND MIN(chain_position) = 1 THEN '✅ CORRECT'
        ELSE '❌ STILL BROKEN'
    END as status
FROM reality_events;
-- Step 5: Show genesis event
SELECT 'Genesis Event' as step,
    chain_position,
    event_hash,
    entity_id,
    vertical_id
FROM reality_events
WHERE prev_hash IS NULL;