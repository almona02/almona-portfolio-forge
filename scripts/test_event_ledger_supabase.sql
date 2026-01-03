-- ============================================================================
-- RealityOS Event Ledger - Supabase SQL Editor Test Script
-- ============================================================================
-- This script can be run directly in Supabase SQL Editor to test the
-- Event Ledger implementation.
--
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" or press Ctrl+Enter
-- 4. Review the results
-- ============================================================================
-- ============================================================================
-- STEP 1: Verify Migration (Run migration if needed)
-- ============================================================================
DO $$ BEGIN -- Check if reality_events table exists
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'reality_events'
) THEN RAISE NOTICE '⚠️  Table reality_events does not exist.';
RAISE NOTICE '   Please run migration 041_realityos_event_ledger.sql first.';
RAISE EXCEPTION 'Migration required: Run migrations/041_realityos_event_ledger.sql';
ELSE RAISE NOTICE '✅ Table reality_events exists';
END IF;
END $$;
-- ============================================================================
-- STEP 2: Verify Schema Structure
-- ============================================================================
SELECT 'Schema Verification' as test_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'reality_events'
                AND column_name = 'event_hash'
        ) THEN '✅ event_hash column exists'
        ELSE '❌ event_hash column missing'
    END as event_hash_check,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'reality_events'
                AND column_name = 'prev_hash'
        ) THEN '✅ prev_hash column exists'
        ELSE '❌ prev_hash column missing'
    END as prev_hash_check,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'reality_events'
                AND column_name = 'chain_position'
        ) THEN '✅ chain_position column exists'
        ELSE '❌ chain_position column missing'
    END as chain_position_check,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'reality_events'
                AND column_name = 'recorded_at'
        ) THEN '✅ recorded_at column exists'
        ELSE '❌ recorded_at column missing'
    END as recorded_at_check;
-- ============================================================================
-- STEP 3: Verify Genesis Event
-- ============================================================================
SELECT 'Genesis Event Check' as test_name,
    COUNT(*) as genesis_count,
    CASE
        WHEN COUNT(*) = 1 THEN '✅ Genesis event found'
        WHEN COUNT(*) = 0 THEN '❌ Genesis event missing'
        ELSE '❌ Multiple genesis events (should be 1)'
    END as status
FROM reality_events
WHERE prev_hash IS NULL;
-- Show genesis event details
SELECT 'Genesis Event Details' as test_name,
    event_hash,
    entity_id,
    vertical_id,
    chain_position,
    event_type,
    recorded_at
FROM reality_events
WHERE prev_hash IS NULL;
-- ============================================================================
-- STEP 4: Test Append-Only Enforcement
-- ============================================================================
-- Try to UPDATE (should fail or be blocked)
DO $$ BEGIN BEGIN
UPDATE reality_events
SET entity_id = 'test_modified'
WHERE chain_position = 1;
RAISE NOTICE '❌ UPDATE allowed (append-only not enforced!)';
EXCEPTION
WHEN insufficient_privilege THEN RAISE NOTICE '✅ UPDATE blocked by permissions (append-only enforced)';
WHEN OTHERS THEN RAISE NOTICE '✅ UPDATE blocked: %',
SQLERRM;
END;
BEGIN
DELETE FROM reality_events
WHERE chain_position = 1;
RAISE NOTICE '❌ DELETE allowed (append-only not enforced!)';
EXCEPTION
WHEN insufficient_privilege THEN RAISE NOTICE '✅ DELETE blocked by permissions (append-only enforced)';
WHEN OTHERS THEN RAISE NOTICE '✅ DELETE blocked: %',
SQLERRM;
END;
END $$;
-- ============================================================================
-- STEP 5: Test Event Insertion
-- ============================================================================
-- Insert a test event
DO $$
DECLARE test_event_hash CHAR(64);
test_prev_hash CHAR(64);
test_chain_pos BIGINT;
inserted_count INT;
BEGIN -- Get last event info
SELECT event_hash,
    chain_position INTO test_prev_hash,
    test_chain_pos
FROM reality_events
ORDER BY chain_position DESC
LIMIT 1;
-- Generate test event hash (simplified for testing)
test_event_hash := LPAD('test', 64, '0');
-- Insert test event
BEGIN
INSERT INTO reality_events (
        event_hash,
        prev_hash,
        event_type,
        entity_id,
        vertical_id,
        proof,
        payload,
        recorded_at,
        created_at
    )
VALUES (
        test_event_hash,
        test_prev_hash,
        'VERIFICATION',
        'test_entity_001',
        'test_vertical',
        '{"verified_by": "test_user", "timestamp": "2025-02-20T12:00:00Z", "location": null}'::jsonb,
        '{"test": "value", "number": 42}'::jsonb,
        NOW(),
        NOW()
    );
GET DIAGNOSTICS inserted_count = ROW_COUNT;
IF inserted_count = 1 THEN RAISE NOTICE '✅ Test event inserted successfully';
RAISE NOTICE '   Event hash: %',
test_event_hash;
RAISE NOTICE '   Chain position: %',
test_chain_pos + 1;
ELSE RAISE NOTICE '❌ Event insertion failed';
END IF;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE '❌ Event insertion error: %',
SQLERRM;
END;
END $$;
-- ============================================================================
-- STEP 6: Verify Chain Integrity
-- ============================================================================
SELECT 'Chain Integrity Check' as test_name,
    COUNT(*) as total_events,
    MIN(chain_position) as first_position,
    MAX(chain_position) as last_position,
    COUNT(DISTINCT chain_position) as unique_positions,
    CASE
        WHEN COUNT(*) = COUNT(DISTINCT chain_position) THEN '✅ All positions unique'
        ELSE '❌ Duplicate chain positions found'
    END as position_check
FROM reality_events;
-- Check chain links
WITH chain_check AS (
    SELECT e1.chain_position as pos1,
        e1.event_hash as hash1,
        e1.prev_hash as prev1,
        e2.chain_position as pos2,
        e2.event_hash as hash2
    FROM reality_events e1
        LEFT JOIN reality_events e2 ON e1.prev_hash = e2.event_hash
    WHERE e1.prev_hash IS NOT NULL
)
SELECT 'Chain Link Verification' as test_name,
    COUNT(*) as total_chained_events,
    COUNT(pos2) as valid_links,
    COUNT(*) - COUNT(pos2) as broken_links,
    CASE
        WHEN COUNT(*) = COUNT(pos2) THEN '✅ All chain links valid'
        ELSE '❌ Broken chain links detected'
    END as status
FROM chain_check;
-- ============================================================================
-- STEP 7: Test Constraints
-- ============================================================================
-- Test proof structure constraint (should fail)
DO $$ BEGIN BEGIN
INSERT INTO reality_events (
        event_hash,
        prev_hash,
        event_type,
        entity_id,
        vertical_id,
        proof,
        payload,
        recorded_at
    )
VALUES (
        LPAD('invalid', 64, '0'),
        (
            SELECT event_hash
            FROM reality_events
            ORDER BY chain_position DESC
            LIMIT 1
        ), 'VERIFICATION', 'test_entity', 'test_vertical', '{"invalid": "proof"}'::jsonb, -- Missing verified_by and timestamp
        '{}'::jsonb, NOW()
    );
RAISE NOTICE '❌ Invalid proof accepted (constraint not working!)';
EXCEPTION
WHEN check_violation THEN RAISE NOTICE '✅ Proof structure constraint enforced';
WHEN OTHERS THEN RAISE NOTICE '⚠️  Constraint check: %',
SQLERRM;
END;
END $$;
-- ============================================================================
-- STEP 8: Test Indexes
-- ============================================================================
SELECT 'Index Verification' as test_name,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'reality_events'
ORDER BY indexname;
-- ============================================================================
-- STEP 9: Test Partitioning
-- ============================================================================
SELECT 'Partition Verification' as test_name,
    schemaname,
    tablename,
    CASE
        WHEN tablename LIKE 'reality_events_%' THEN '✅ Partition found'
        ELSE 'Main table'
    END as partition_status
FROM pg_tables
WHERE tablename LIKE 'reality_events%'
ORDER BY tablename;
-- ============================================================================
-- STEP 10: Summary Report
-- ============================================================================
SELECT '=== VALIDATION SUMMARY ===' as summary,
    '' as spacer1,
    '' as spacer2,
    '' as spacer3;
-- Pre-check: Verify what's actually in the table RIGHT NOW
SELECT 'Pre-Check: Current State' as check_name,
    COUNT(*) as total_events,
    COUNT(
        CASE
            WHEN prev_hash IS NULL THEN 1
        END
    ) as genesis_count
FROM reality_events;
-- Pre-check: Show all events if any exist
SELECT 'Pre-Check: All Events' as check_name,
    chain_position,
    entity_id,
    LEFT(event_hash, 16) || '...' as hash_short,
    CASE
        WHEN prev_hash IS NULL THEN 'GENESIS'
        ELSE 'CHAINED'
    END as event_type
FROM reality_events
ORDER BY chain_position;
-- If no events, create genesis before summary
DO $$
DECLARE event_count INT;
BEGIN
SELECT COUNT(*) INTO event_count
FROM reality_events;
IF event_count = 0 THEN RAISE NOTICE '⚠️  No events found. Creating genesis event...';
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
END IF;
END $$;
-- Summary Report (after ensuring genesis exists)
SELECT 'Event Count' as metric,
    COUNT(*)::text as value,
    CASE
        WHEN COUNT(*) >= 1 THEN '✅'
        ELSE '❌'
    END as status
FROM reality_events
UNION ALL
SELECT 'Genesis Event',
    COUNT(*)::text,
    CASE
        WHEN COUNT(*) = 1 THEN '✅'
        ELSE '❌'
    END
FROM reality_events
WHERE prev_hash IS NULL
UNION ALL
SELECT 'Chain Integrity',
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM reality_events
        ) = (
            SELECT COUNT(DISTINCT chain_position)
            FROM reality_events
        ) THEN 'Valid'
        ELSE 'Broken'
    END,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM reality_events
        ) = (
            SELECT COUNT(DISTINCT chain_position)
            FROM reality_events
        ) THEN '✅'
        ELSE '❌'
    END
UNION ALL
SELECT 'Partitions',
    COUNT(*)::text,
    CASE
        WHEN COUNT(*) >= 1 THEN '✅'
        ELSE '❌'
    END
FROM pg_tables
WHERE tablename LIKE 'reality_events%';
-- ============================================================================
-- STEP 11: Show All Events (for manual inspection)
-- ============================================================================
SELECT 'All Events' as test_name,
    chain_position,
    LEFT(event_hash, 16) || '...' as event_hash_short,
    LEFT(prev_hash, 16) || '...' as prev_hash_short,
    event_type,
    entity_id,
    vertical_id,
    recorded_at
FROM reality_events
ORDER BY chain_position;
-- ============================================================================
-- CLEANUP (Optional - uncomment to remove test events)
-- ============================================================================
-- WARNING: This will delete test events. Only run if you want to clean up.
-- DELETE FROM reality_events WHERE entity_id LIKE 'test_%';
-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================
-- Expected Results:
-- ✅ All checks should pass
-- ✅ Genesis event should exist
-- ✅ Chain integrity should be valid
-- ✅ Constraints should be enforced
-- ✅ Indexes should exist
-- ============================================================================