-- realityos_core/schema/event_schema_v1.sql
-- Generic Event Schema for RealityOS (Option A: Flexible JSON)
-- DO NOT RUN DIRECTLY - This is the blueprint for the migration.
-- 1. ENUM for Core Event Types (ON/OFF/FAULT/INSPECTION/VERIFICATION)
CREATE TYPE core_event_type AS ENUM (
    'ON',
    -- Entity activated/started
    'OFF',
    -- Entity deactivated/stopped  
    'FAULT',
    -- Entity malfunction
    'INSPECTION',
    -- Entity inspected
    'VERIFICATION' -- Entity verified (catch-all for vertical-specific)
);
-- 2. MAIN EVENT TABLE (Parent - Append-only, Immutable)
-- NOTE: For partitioned tables, PRIMARY KEY must include partitioning column
CREATE TABLE reality_events (
    -- Core Immutable Fields (Principles 1-3)
    event_hash CHAR(64) NOT NULL,
    -- SHA-256: prev_hash + payload_hash + proof_hash + timestamp (Principle 3)
    prev_hash CHAR(64),
    -- Cryptographic chain (Principle 3)
    chain_position BIGINT GENERATED ALWAYS AS IDENTITY,
    -- Monotonic sequence for chain walking
    -- Event Context
    event_type core_event_type NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    -- What this event is about (asset_123, project_456)
    vertical_id VARCHAR(100) NOT NULL,
    -- Which vertical owns this event (almona, tmg_shield)
    -- Proof Bundle (Principle 1: Human-Verified)
    proof JSONB NOT NULL CHECK (
        jsonb_typeof(proof) = 'object'
        AND proof ? 'verified_by'
        AND -- WHO verified (Principle 1)
        proof ? 'timestamp'
        AND -- WHEN verified
        proof ? 'location' -- WHERE verified (GPS object or null)
        -- Note: QR and Photo are optional but recommended
    ),
    -- Payload (Vertical-Specific Data - Core doesn't interpret)
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- System Metadata (Immutable)
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- NO updated_at field - Events are immutable (Principle 2)
    -- Composite PRIMARY KEY includes partitioning column (PostgreSQL requirement)
    -- Must be defined AFTER all columns (especially recorded_at)
    PRIMARY KEY (event_hash, recorded_at) -- NOTE: UNIQUE constraints removed - PostgreSQL requires them to include partitioning column
    -- Global uniqueness enforced via:
    -- 1. Application logic (EventLedger checks for hash collisions)
    -- 2. chain_position is GENERATED ALWAYS AS IDENTITY (automatically unique)
    -- 3. event_hash is SHA-256 (collisions astronomically unlikely)
) PARTITION BY RANGE (recorded_at);
-- 3. ENFORCE APPEND-ONLY (Principle 2)
-- Revoke ALL modification permissions from application roles
COMMENT ON TABLE reality_events IS 'APPEND-ONLY: Events can be created but never modified or deleted.';
-- 4. INDEXES for Performance
CREATE INDEX idx_reality_events_entity ON reality_events(entity_id, recorded_at DESC);
CREATE INDEX idx_reality_events_vertical ON reality_events(vertical_id, recorded_at DESC);
CREATE INDEX idx_reality_events_prev_hash ON reality_events(prev_hash)
WHERE prev_hash IS NOT NULL;
CREATE INDEX idx_reality_events_chain_position ON reality_events(chain_position);
CREATE INDEX idx_reality_events_event_hash ON reality_events(event_hash);
-- 5. PARTITIONING for Scalability (Monthly partitions)
-- Note: Create initial partition for current month
-- Partitions will be created via migration script