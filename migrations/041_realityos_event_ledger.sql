-- migrations/041_realityos_event_ledger.sql
-- Migration: Create RealityOS Event Ledger
-- IMPORTANT: Run in a transaction, test in staging first
BEGIN;
-- 1. Create Core Event Type ENUM (idempotent)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'core_event_type'
) THEN CREATE TYPE core_event_type AS ENUM (
    'ON',
    'OFF',
    'FAULT',
    'INSPECTION',
    'VERIFICATION'
);
END IF;
END $$;
-- 2. Create Main Event Table (February 2025 partition)
-- NOTE: PRIMARY KEY must include partitioning column (recorded_at)
-- Global uniqueness enforced via application logic (see comments in table definition)
CREATE TABLE IF NOT EXISTS reality_events (
    event_hash CHAR(64) NOT NULL,
    prev_hash CHAR(64),
    chain_position BIGINT GENERATED ALWAYS AS IDENTITY,
    event_type core_event_type NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    vertical_id VARCHAR(100) NOT NULL,
    proof JSONB NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Composite PRIMARY KEY includes partitioning column (required by PostgreSQL)
    PRIMARY KEY (event_hash, recorded_at) -- NOTE: UNIQUE constraints removed - PostgreSQL requires them to include partitioning column
    -- Global uniqueness enforced via:
    -- 1. Application logic (EventLedger checks for hash collisions)
    -- 2. chain_position is GENERATED ALWAYS AS IDENTITY (automatically unique)
    -- 3. event_hash is SHA-256 (collisions astronomically unlikely)
    -- Foreign key constraint removed for partitioned table compatibility
    -- Chain integrity is enforced via application logic and CHECK constraints
) PARTITION BY RANGE (recorded_at);
-- 3. Create Initial Partition (Current Month) - idempotent
CREATE TABLE IF NOT EXISTS reality_events_2025_02 PARTITION OF reality_events FOR
VALUES
FROM ('2025-02-01') TO ('2025-03-01');
-- 4. Apply Constraints (idempotent)
DO $$ BEGIN -- Chain integrity constraint
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_prev_hash_valid'
        AND conrelid = 'reality_events'::regclass
) THEN
ALTER TABLE reality_events
ADD CONSTRAINT chk_prev_hash_valid CHECK (
        (
            prev_hash IS NULL
            AND chain_position = 1
        )
        OR (
            prev_hash IS NOT NULL
            AND chain_position > 1
        )
    );
END IF;
-- Proof structure constraint
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_proof_structure'
        AND conrelid = 'reality_events'::regclass
) THEN
ALTER TABLE reality_events
ADD CONSTRAINT chk_proof_structure CHECK (
        proof IS NOT NULL
        AND jsonb_typeof(proof) = 'object'
        AND proof ? 'verified_by'
        AND proof ? 'timestamp'
    );
END IF;
END $$;
-- 5. Create Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_reality_events_entity ON reality_events(entity_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reality_events_vertical ON reality_events(vertical_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reality_events_prev_hash ON reality_events(prev_hash)
WHERE prev_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reality_events_chain_position ON reality_events(chain_position);
CREATE INDEX IF NOT EXISTS idx_reality_events_event_hash ON reality_events(event_hash);
-- NOTE: Unique indexes on partitioned tables also require partitioning column
-- Global uniqueness is enforced via:
-- 1. Application logic (EventLedger._hash_exists() checks before insert)
-- 2. chain_position IDENTITY ensures sequential uniqueness
-- 3. event_hash SHA-256 makes collisions virtually impossible
-- 6. Create Genesis Event (First event in chain) - idempotent
-- This event represents the "Big Bang" of the RealityOS event ledger
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
SELECT '0000000000000000000000000000000000000000000000000000000000000000',
    -- 64 zeros
    NULL,
    -- Genesis has no parent
    'VERIFICATION'::core_event_type,
    'realityos_genesis',
    'realityos_core',
    '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
    '2025-02-20 00:00:00'::timestamptz,
    '2025-02-20 00:00:00'::timestamptz
WHERE NOT EXISTS (
        SELECT 1
        FROM reality_events
        WHERE entity_id = 'realityos_genesis'
            AND prev_hash IS NULL
    );
-- 7. Create Read-Only View for Applications (Safety layer) - idempotent
DROP VIEW IF EXISTS reality_events_readonly;
CREATE VIEW reality_events_readonly AS
SELECT event_hash,
    prev_hash,
    chain_position,
    event_type,
    entity_id,
    vertical_id,
    proof,
    payload,
    recorded_at
FROM reality_events
ORDER BY chain_position;
-- Grant SELECT only to application users (idempotent - will fail harmlessly if roles don't exist)
DO $$ BEGIN
GRANT SELECT ON reality_events_readonly TO application_user;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Role application_user does not exist, skipping grant';
END $$;
DO $$ BEGIN
GRANT SELECT ON reality_events_readonly TO realityos_app;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Role realityos_app does not exist, skipping grant';
END $$;
-- 8. Revoke Direct Table Access from Applications (idempotent)
DO $$ BEGIN REVOKE ALL ON reality_events
FROM application_user,
    realityos_app;
GRANT INSERT ON reality_events TO realityos_app;
-- Only core can insert
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Roles not found for permission management: %',
SQLERRM;
END $$;
COMMIT;
-- 9. Verification Query (Run after migration to verify)
SELECT '✅ Migration Successful' as status,
    COUNT(*) as total_events,
    MIN(chain_position) as first_chain_position,
    MAX(chain_position) as last_chain_position
FROM reality_events;