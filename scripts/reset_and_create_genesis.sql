-- ============================================================================
-- RESET AND CREATE GENESIS - Use this if you need to start fresh
-- ============================================================================
-- WARNING: This will DELETE ALL existing events!
-- Only use this if you're testing and want to start from scratch.
-- ============================================================================

-- Step 1: Delete all existing events
DO $$
DECLARE
    event_count INT;
BEGIN
    SELECT COUNT(*) INTO event_count FROM reality_events;
    
    IF event_count > 0 THEN
        RAISE NOTICE '⚠️  Deleting % existing events...', event_count;
        DELETE FROM reality_events;
        RAISE NOTICE '✅ All events deleted';
    ELSE
        RAISE NOTICE '✅ No events to delete';
    END IF;
END $$;

-- Step 2: Reset the IDENTITY sequence to start at 1
DO $$
BEGIN
    -- Reset chain_position sequence
    ALTER SEQUENCE reality_events_chain_position_seq RESTART WITH 1;
    RAISE NOTICE '✅ Sequence reset to start at 1';
END $$;

-- Step 3: Create genesis event
DO $$
BEGIN
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
        '0000000000000000000000000000000000000000000000000000000000000000', -- 64 zeros
        NULL, -- Genesis has no parent
        'VERIFICATION',
        'realityos_genesis',
        'realityos_core',
        '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
        '2025-02-20 00:00:00'::timestamptz,
        '2025-02-20 00:00:00'::timestamptz
    );
    
    RAISE NOTICE '✅ Genesis event created at chain_position = 1';
END $$;

-- Step 4: Verify
SELECT 
    'Verification' as test_name,
    COUNT(*) as total_events,
    COUNT(CASE WHEN prev_hash IS NULL THEN 1 END) as genesis_count,
    MIN(chain_position) as first_position,
    MAX(chain_position) as last_position,
    CASE 
        WHEN COUNT(CASE WHEN prev_hash IS NULL THEN 1 END) = 1 
            AND MIN(chain_position) = 1 
        THEN '✅ Genesis event correctly positioned'
        ELSE '❌ Issue with genesis event'
    END as status
FROM reality_events;

-- Show genesis event
SELECT 
    'Genesis Event' as test_name,
    chain_position,
    event_hash,
    entity_id,
    vertical_id
FROM reality_events
WHERE prev_hash IS NULL;


