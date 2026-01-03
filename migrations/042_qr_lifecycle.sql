-- migrations/042_qr_lifecycle.sql
-- Migration: Create QR Lifecycle Management Table
-- IMPORTANT: Run in a transaction, test in staging first
-- Purpose: Enforce single-use QR codes with transactional safety
BEGIN;

-- 1. Create QR Status ENUM (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'qr_status'
    ) THEN
        CREATE TYPE qr_status AS ENUM (
            'UNUSED',      -- QR generated, not yet scanned
            'USED',        -- QR scanned and event recorded
            'REVOKED',     -- QR explicitly revoked (superseded)
            'EXPIRED'      -- QR past valid_to timestamp
        );
    END IF;
END $$;

-- 2. Create QR Lifecycle Table
-- Purpose: Track QR state for single-use enforcement and audit trail
CREATE TABLE IF NOT EXISTS qr_lifecycle (
    -- Primary Key
    qr_id VARCHAR(255) NOT NULL PRIMARY KEY,
    
    -- QR Content (from signed QR data)
    entity_id VARCHAR(255) NOT NULL,
    vertical_id VARCHAR(100) NOT NULL,
    
    -- QR Metadata
    qr_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    
    -- Status Tracking
    status qr_status NOT NULL DEFAULT 'UNUSED',
    
    -- Usage Tracking (populated when QR is used)
    used_at TIMESTAMPTZ,
    used_by VARCHAR(100),  -- verified_by from event
    event_hash CHAR(64),   -- Links to reality_events.event_hash
    
    -- Revocation Tracking (derived from events, not authoritative)
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(100),
    revocation_event_hash CHAR(64),
    
    -- Audit Fields
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Indexes for Performance
-- Index on entity_id for entity-based queries
CREATE INDEX IF NOT EXISTS idx_qr_lifecycle_entity_id 
    ON qr_lifecycle(entity_id);

-- Index on vertical_id for vertical-based queries
CREATE INDEX IF NOT EXISTS idx_qr_lifecycle_vertical_id 
    ON qr_lifecycle(vertical_id);

-- Index on status for status-based queries (most common: find UNUSED QRs)
CREATE INDEX IF NOT EXISTS idx_qr_lifecycle_status 
    ON qr_lifecycle(status);

-- Index on valid_to for expiration queries
CREATE INDEX IF NOT EXISTS idx_qr_lifecycle_valid_to 
    ON qr_lifecycle(valid_to);

-- Index on event_hash for reverse lookup (event → QR)
CREATE INDEX IF NOT EXISTS idx_qr_lifecycle_event_hash 
    ON qr_lifecycle(event_hash) 
    WHERE event_hash IS NOT NULL;

-- Composite index for common query pattern: find UNUSED QRs for entity
CREATE INDEX IF NOT EXISTS idx_qr_lifecycle_entity_status 
    ON qr_lifecycle(entity_id, status);

-- 4. Add Constraints
-- Ensure valid_from < valid_to
ALTER TABLE qr_lifecycle
    ADD CONSTRAINT chk_qr_validity_window 
    CHECK (valid_from < valid_to);

-- Ensure validity window is reasonable (max 7 days)
ALTER TABLE qr_lifecycle
    ADD CONSTRAINT chk_qr_max_window 
    CHECK (valid_to - valid_from <= INTERVAL '7 days');

-- Ensure used_at is set when status = USED
ALTER TABLE qr_lifecycle
    ADD CONSTRAINT chk_qr_used_fields 
    CHECK (
        (status = 'USED' AND used_at IS NOT NULL AND used_by IS NOT NULL AND event_hash IS NOT NULL)
        OR (status != 'USED')
    );

-- Ensure revoked_at is set when status = REVOKED
ALTER TABLE qr_lifecycle
    ADD CONSTRAINT chk_qr_revoked_fields 
    CHECK (
        (status = 'REVOKED' AND revoked_at IS NOT NULL)
        OR (status != 'REVOKED')
    );

-- 5. Create Function to Update Status Automatically
-- This function marks QR as USED in same transaction as event insertion
CREATE OR REPLACE FUNCTION mark_qr_used(
    p_qr_id VARCHAR(255),
    p_used_by VARCHAR(100),
    p_event_hash CHAR(64)
) RETURNS VOID AS $$
BEGIN
    UPDATE qr_lifecycle
    SET 
        status = 'USED',
        used_at = NOW(),
        used_by = p_used_by,
        event_hash = p_event_hash,
        updated_at = NOW()
    WHERE 
        qr_id = p_qr_id
        AND status = 'UNUSED'
        AND NOW() >= valid_from
        AND NOW() <= valid_to;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'QR % cannot be marked as USED (not UNUSED, expired, or invalid)', p_qr_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Create Function to Check QR Validity (for validation)
-- Returns validation result without modifying state
CREATE OR REPLACE FUNCTION check_qr_validity(
    p_qr_id VARCHAR(255),
    p_entity_id VARCHAR(255),
    p_vertical_id VARCHAR(100)
) RETURNS TABLE(
    is_valid BOOLEAN,
    reason TEXT,
    current_status qr_status,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN q.status = 'UNUSED' 
                AND NOW() >= q.valid_from 
                AND NOW() <= q.valid_to
                AND q.entity_id = p_entity_id
                AND q.vertical_id = p_vertical_id
            THEN TRUE
            ELSE FALSE
        END as is_valid,
        CASE 
            WHEN q.status != 'UNUSED' THEN 'QR already used or revoked'
            WHEN NOW() < q.valid_from THEN 'QR not yet valid'
            WHEN NOW() > q.valid_to THEN 'QR expired'
            WHEN q.entity_id != p_entity_id THEN 'QR entity_id mismatch'
            WHEN q.vertical_id != p_vertical_id THEN 'QR vertical_id mismatch'
            ELSE 'Valid'
        END as reason,
        q.status as current_status,
        q.valid_from,
        q.valid_to
    FROM qr_lifecycle q
    WHERE q.qr_id = p_qr_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'QR not found', NULL::qr_status, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create Trigger to Auto-Update updated_at
CREATE OR REPLACE FUNCTION update_qr_lifecycle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_qr_lifecycle_updated_at
    BEFORE UPDATE ON qr_lifecycle
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_lifecycle_updated_at();

-- 8. Grant Permissions (idempotent)
DO $$ BEGIN
    -- Grant SELECT to application users (for validation checks)
    GRANT SELECT ON qr_lifecycle TO application_user;
    GRANT SELECT ON qr_lifecycle TO realityos_app;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Roles not found for permission management: %', SQLERRM;
END $$;

DO $$ BEGIN
    -- Grant INSERT/UPDATE to service role only (QR generation and marking)
    GRANT INSERT, UPDATE ON qr_lifecycle TO service_role;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Role service_role not found: %', SQLERRM;
END $$;

-- 9. Create View for Auditor-Friendly Queries
CREATE OR REPLACE VIEW qr_lifecycle_audit AS
SELECT 
    qr_id,
    entity_id,
    vertical_id,
    status,
    created_at,
    valid_from,
    valid_to,
    used_at,
    used_by,
    event_hash,
    revoked_at,
    revoked_by,
    revocation_event_hash,
    CASE 
        WHEN status = 'EXPIRED' AND NOW() > valid_to THEN 'Expired'
        WHEN status = 'REVOKED' THEN 'Revoked'
        WHEN status = 'USED' THEN 'Used'
        WHEN status = 'UNUSED' AND NOW() >= valid_from AND NOW() <= valid_to THEN 'Active'
        WHEN status = 'UNUSED' AND NOW() < valid_from THEN 'Not Yet Valid'
        ELSE 'Unknown'
    END as audit_status
FROM qr_lifecycle
ORDER BY created_at DESC;

COMMIT;

-- 10. Verification Query (Run after migration to verify)
SELECT 
    '✅ QR Lifecycle Migration Successful' as status,
    COUNT(*) as total_qrs,
    COUNT(CASE WHEN status = 'UNUSED' THEN 1 END) as unused_qrs,
    COUNT(CASE WHEN status = 'USED' THEN 1 END) as used_qrs
FROM qr_lifecycle;

