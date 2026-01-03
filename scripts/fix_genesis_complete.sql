-- ============================================================================
-- Complete Genesis Fix - Handles all edge cases
-- ============================================================================
-- This script will:
-- 1. Check current state
-- 2. Delete any orphaned events
-- 3. Reset sequence properly
-- 4. Create genesis event
-- 5. Verify everything is correct
-- ============================================================================
-- Step 1: Check and report current state
DO $$
DECLARE event_count INT;
genesis_count INT;
seq_value BIGINT;
seq_called BOOLEAN;
BEGIN
SELECT COUNT(*) INTO event_count
FROM reality_events;
SELECT COUNT(*) INTO genesis_count
FROM reality_events
WHERE prev_hash IS NULL;
SELECT last_value,
    is_called INTO seq_value,
    seq_called
FROM reality_events_chain_position_seq;
RAISE NOTICE '========================================';
RAISE NOTICE 'Current State:';
RAISE NOTICE '  Total events: %',
event_count;
RAISE NOTICE '  Genesis events: %',
genesis_count;
RAISE NOTICE '  Sequence last_value: %',
seq_value;
RAISE NOTICE '  Sequence is_called: %',
seq_called;
RAISE NOTICE '========================================';
END $$;
-- Step 2: Clean up - Delete all events if any exist
DO $$
DECLARE event_count INT;
BEGIN
SELECT COUNT(*) INTO event_count
FROM reality_events;
IF event_count > 0 THEN RAISE NOTICE '⚠️  Found % existing events. Deleting...',
event_count;
DELETE FROM reality_events;
RAISE NOTICE '✅ All events deleted';
ELSE RAISE NOTICE '✅ No events to delete';
END IF;
END $$;
-- Step 3: Reset sequence to start at 1
DO $$ BEGIN RAISE NOTICE 'Resetting sequence to start at 1...';
ALTER SEQUENCE reality_events_chain_position_seq RESTART WITH 1;
RAISE NOTICE '✅ Sequence reset';
END $$;
-- Step 4: Create genesis event (idempotent)
DO $$
DECLARE genesis_exists INT;
BEGIN -- Check if genesis already exists
SELECT COUNT(*) INTO genesis_exists
FROM reality_events
WHERE entity_id = 'realityos_genesis'
    AND prev_hash IS NULL;
IF genesis_exists = 0 THEN RAISE NOTICE 'Creating genesis event...';
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
        'VERIFICATION'::core_event_type,
        'realityos_genesis',
        'realityos_core',
        '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
        '2025-02-20 00:00:00'::timestamptz,
        '2025-02-20 00:00:00'::timestamptz
    );
RAISE NOTICE '✅ Genesis event created at chain_position = 1';
ELSE RAISE NOTICE '✅ Genesis event already exists';
END IF;
END $$;
-- Step 5: Verify final state
SELECT 'Final Verification' as check_name,
    COUNT(*) as total_events,
    COUNT(
        CASE
            WHEN prev_hash IS NULL THEN 1
        END
    ) as genesis_count,
    MIN(chain_position) as first_position,
    MAX(chain_position) as last_position,
    (
        SELECT last_value
        FROM reality_events_chain_position_seq
    ) as sequence_value,
    CASE
        WHEN COUNT(
            CASE
                WHEN prev_hash IS NULL THEN 1
            END
        ) = 1
        AND MIN(chain_position) = 1
        AND (
            SELECT last_value
            FROM reality_events_chain_position_seq
        ) = 1 THEN '✅ All Correct'
        ELSE '❌ Issue Detected'
    END as status
FROM reality_events;
-- Step 6: Show genesis event details
SELECT 'Genesis Event Details' as check_name,
    chain_position,
    event_hash,
    entity_id,
    vertical_id,
    event_type,
    recorded_at
FROM reality_events
WHERE prev_hash IS NULL;
-- Step 7: Show all events (should only be genesis)
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