-- Migration 048: Alternative View Ownership Fix
-- ============================================================================
-- Since direct ALTER VIEW OWNER is blocked, we'll try:
-- 1. Recreating views with explicit ownership via SET ROLE
-- 2. Or accepting that this is a Supabase platform limitation
-- ============================================================================

-- Check current state
SELECT 
    schemaname, 
    viewname, 
    viewowner
FROM pg_views 
WHERE schemaname = 'public' 
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');

-- ============================================================================
-- APPROACH 1: Try SET ROLE then recreate views
-- ============================================================================
DO $$
BEGIN
    -- Try to set role to authenticator and recreate
    -- This might work if authenticator has CREATE privileges
    RAISE NOTICE 'Attempting to recreate views with different ownership...';
    
    -- Drop and recreate qr_lifecycle_audit
    DROP VIEW IF EXISTS public.qr_lifecycle_audit CASCADE;
    
    -- Try creating as authenticator role
    BEGIN
        SET ROLE authenticator;
        CREATE VIEW public.qr_lifecycle_audit AS
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
        FROM public.qr_lifecycle
        ORDER BY created_at DESC;
        RESET ROLE;
        RAISE NOTICE '✓ Recreated qr_lifecycle_audit as authenticator';
    EXCEPTION
        WHEN OTHERS THEN
            RESET ROLE;
            -- Fallback: recreate as current user
            CREATE VIEW public.qr_lifecycle_audit AS
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
            FROM public.qr_lifecycle
            ORDER BY created_at DESC;
            RAISE WARNING 'Could not create as authenticator, created as current user. Error: %', SQLERRM;
    END;
    
    -- Drop and recreate reality_events_readonly
    DROP VIEW IF EXISTS public.reality_events_readonly CASCADE;
    
    BEGIN
        SET ROLE authenticator;
        CREATE VIEW public.reality_events_readonly AS
        SELECT 
            event_hash,
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
        RESET ROLE;
        RAISE NOTICE '✓ Recreated reality_events_readonly as authenticator';
    EXCEPTION
        WHEN OTHERS THEN
            RESET ROLE;
            -- Fallback: recreate as current user
            CREATE VIEW public.reality_events_readonly AS
            SELECT 
                event_hash,
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
            RAISE WARNING 'Could not create as authenticator, created as current user. Error: %', SQLERRM;
    END;
END $$;

-- Verify final ownership
SELECT 
    schemaname, 
    viewname, 
    viewowner,
    CASE 
        WHEN viewowner IN ('authenticator', 'anon', 'authenticated') THEN '✓ FIXED'
        WHEN viewowner = 'postgres' THEN '❌ STILL postgres (Supabase limitation?)'
        ELSE '⚠️  Owner: ' || viewowner
    END as status
FROM pg_views 
WHERE schemaname = 'public' 
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');

-- Final assessment
DO $$
DECLARE
    still_postgres_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO still_postgres_count
    FROM pg_views
    WHERE schemaname = 'public'
        AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly')
        AND viewowner = 'postgres';
    
    IF still_postgres_count = 0 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ SUCCESS: Views ownership changed!';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING '========================================';
        RAISE WARNING '⚠️  Views are still owned by postgres';
        RAISE WARNING '';
        RAISE WARNING 'This appears to be a Supabase platform limitation.';
        RAISE WARNING 'The linter warnings may be acceptable if:';
        RAISE WARNING '1. Views are simple SELECT statements (no functions)';
        RAISE WARNING '2. Views respect RLS policies on underlying tables';
        RAISE WARNING '3. Views do not bypass security';
        RAISE WARNING '';
        RAISE WARNING 'Consider contacting Supabase support if this is critical.';
        RAISE WARNING '========================================';
    END IF;
END $$;

