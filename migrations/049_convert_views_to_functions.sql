-- Migration 049: Convert Views to Functions (Optional - Eliminates Warnings)
-- ============================================================================
-- This migration converts the views to SECURITY INVOKER functions
-- This will eliminate the linter warnings but requires application code changes
-- ============================================================================
-- WARNING: This will break any code that queries these as views
-- You'll need to update application code to call these as functions instead
-- ============================================================================
BEGIN;
-- ============================================================================
-- PART 1: Convert qr_lifecycle_audit view to function
-- ============================================================================
-- Drop the view
DROP VIEW IF EXISTS public.qr_lifecycle_audit CASCADE;
-- Create as SECURITY INVOKER function (explicitly set)
CREATE OR REPLACE FUNCTION public.qr_lifecycle_audit() RETURNS TABLE(
        qr_id VARCHAR(255),
        entity_id VARCHAR(255),
        vertical_id VARCHAR(100),
        status qr_status,
        created_at TIMESTAMPTZ,
        valid_from TIMESTAMPTZ,
        valid_to TIMESTAMPTZ,
        used_at TIMESTAMPTZ,
        used_by VARCHAR(100),
        event_hash CHAR(64),
        revoked_at TIMESTAMPTZ,
        revoked_by VARCHAR(100),
        revocation_event_hash CHAR(64),
        audit_status TEXT
    ) LANGUAGE sql SECURITY INVOKER -- Explicitly set to invoker (caller's privileges)
    STABLE AS $$
SELECT qr_id,
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
        WHEN status = 'EXPIRED'
        AND NOW() > valid_to THEN 'Expired'
        WHEN status = 'REVOKED' THEN 'Revoked'
        WHEN status = 'USED' THEN 'Used'
        WHEN status = 'UNUSED'
        AND NOW() >= valid_from
        AND NOW() <= valid_to THEN 'Active'
        WHEN status = 'UNUSED'
        AND NOW() < valid_from THEN 'Not Yet Valid'
        ELSE 'Unknown'
    END as audit_status
FROM public.qr_lifecycle
ORDER BY created_at DESC;
$$;
COMMENT ON FUNCTION public.qr_lifecycle_audit() IS 'Returns QR lifecycle audit data. SECURITY INVOKER - uses caller''s privileges and respects RLS.';
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.qr_lifecycle_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.qr_lifecycle_audit() TO anon;
-- ============================================================================
-- PART 2: Convert reality_events_readonly view to function
-- ============================================================================
-- Drop the view
DROP VIEW IF EXISTS public.reality_events_readonly CASCADE;
-- Create as SECURITY INVOKER function (explicitly set)
CREATE OR REPLACE FUNCTION public.reality_events_readonly() RETURNS TABLE(
        event_hash CHAR(64),
        prev_hash CHAR(64),
        chain_position BIGINT,
        event_type core_event_type,
        entity_id VARCHAR(255),
        vertical_id VARCHAR(100),
        proof JSONB,
        payload JSONB,
        recorded_at TIMESTAMPTZ
    ) LANGUAGE sql SECURITY INVOKER -- Explicitly set to invoker (caller's privileges)
    STABLE AS $$
SELECT event_hash,
    prev_hash,
    chain_position,
    event_type,
    entity_id,
    vertical_id,
    proof,
    payload,
    recorded_at
FROM public.reality_events
ORDER BY chain_position;
$$;
COMMENT ON FUNCTION public.reality_events_readonly() IS 'Returns reality events data. SECURITY INVOKER - uses caller''s privileges and respects RLS.';
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reality_events_readonly() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reality_events_readonly() TO anon;
-- Re-grant to application roles if they exist
DO $$ BEGIN
GRANT EXECUTE ON FUNCTION public.qr_lifecycle_audit() TO application_user;
GRANT EXECUTE ON FUNCTION public.reality_events_readonly() TO application_user;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'application_user role does not exist, skipping grant';
END $$;
DO $$ BEGIN
GRANT EXECUTE ON FUNCTION public.qr_lifecycle_audit() TO realityos_app;
GRANT EXECUTE ON FUNCTION public.reality_events_readonly() TO realityos_app;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'realityos_app role does not exist, skipping grant';
END $$;
-- ============================================================================
-- PART 3: Verification
-- ============================================================================
DO $$ BEGIN RAISE NOTICE '========================================';
RAISE NOTICE 'Views converted to SECURITY INVOKER functions';
RAISE NOTICE '';
RAISE NOTICE '⚠️  IMPORTANT: Application code changes required!';
RAISE NOTICE '';
RAISE NOTICE 'Before: SELECT * FROM qr_lifecycle_audit;';
RAISE NOTICE 'After:  SELECT * FROM qr_lifecycle_audit();';
RAISE NOTICE '';
RAISE NOTICE 'Before: SELECT * FROM reality_events_readonly;';
RAISE NOTICE 'After:  SELECT * FROM reality_events_readonly();';
RAISE NOTICE '';
RAISE NOTICE 'The linter warnings should now be resolved.';
RAISE NOTICE '========================================';
END $$;
COMMIT;
-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
-- 
-- Query as function (with parentheses):
-- SELECT * FROM qr_lifecycle_audit();
-- SELECT * FROM reality_events_readonly();
--
-- With WHERE clause:
-- SELECT * FROM qr_lifecycle_audit() WHERE status = 'ACTIVE';
-- SELECT * FROM reality_events_readonly() WHERE entity_id = 'some-id';
--
-- In application code (Supabase client):
-- const { data } = await supabase.rpc('qr_lifecycle_audit');
-- const { data } = await supabase.rpc('reality_events_readonly');
-- ============================================================================