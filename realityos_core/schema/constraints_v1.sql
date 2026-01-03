-- realityos_core/schema/constraints_v1.sql
-- Database-level enforcement of constitutional principles
-- NOTE: This file assumes reality_events table exists. Run migration 041 first.
-- Check if table exists before applying constraints
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'reality_events'
) THEN -- PRINCIPLE 2: Append-Only Enforcement
-- Revoke UPDATE/DELETE from ALL application roles
BEGIN REVOKE
UPDATE,
    DELETE ON reality_events
FROM PUBLIC;
REVOKE
UPDATE,
    DELETE ON reality_events
FROM application_user;
REVOKE
UPDATE,
    DELETE ON reality_events
FROM realityos_app;
EXCEPTION
WHEN others THEN -- Roles might not exist in test environments
RAISE NOTICE 'Roles not found for permission revocation: %',
SQLERRM;
END;
ELSE RAISE NOTICE 'Table reality_events does not exist. Run migration 041_realityos_event_ledger.sql first.';
END IF;
END $$;
-- PRINCIPLE 3: Hash Chain Integrity Constraint
-- Ensure prev_hash either references existing event OR is NULL (genesis)
-- (Applied in migration 041, included here for reference)
-- PRINCIPLE 1: Basic Proof Validation
-- At minimum, proof must have verified_by and timestamp
-- (Applied in migration 041, included here for reference)
-- Event Type Validation (Prevents invalid core types)
-- (Enforced by ENUM type, included here for reference)
-- Chain Position must be positive and unique (enforced by GENERATED ALWAYS AS IDENTITY)