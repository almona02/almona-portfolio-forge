-- Migration 045: Final Fix for View Ownership (Security Definer Issue)
-- This migration definitively fixes the SECURITY DEFINER view warnings
-- ============================================================================
-- PROBLEM: Views owned by 'postgres' (superuser) are flagged by Supabase linter
-- SOLUTION: Change ownership to a non-superuser role
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Check current ownership
-- ============================================================================
DO $$
DECLARE
    v_view_owner TEXT;
BEGIN
    SELECT viewowner INTO v_view_owner
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'qr_lifecycle_audit';
    
    RAISE NOTICE 'Current owner of qr_lifecycle_audit: %', COALESCE(v_view_owner, 'NOT FOUND');
    
    SELECT viewowner INTO v_view_owner
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'reality_events_readonly';
    
    RAISE NOTICE 'Current owner of reality_events_readonly: %', COALESCE(v_view_owner, 'NOT FOUND');
END $$;

-- ============================================================================
-- STEP 2: Try to change ownership to authenticator role
-- ============================================================================
-- Note: This requires the current user to be the owner or a superuser
-- If this fails, you'll need to run the ALTER VIEW commands manually as postgres

DO $$
BEGIN
    -- Change qr_lifecycle_audit ownership
    EXECUTE 'ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator';
    RAISE NOTICE 'Successfully changed ownership of qr_lifecycle_audit to authenticator';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE WARNING 'Cannot change ownership - insufficient privileges. Run as postgres superuser:';
        RAISE WARNING '  ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;';
    WHEN undefined_object THEN
        RAISE WARNING 'authenticator role does not exist. Creating it...';
        -- Try to create the role (will fail if no permission, but worth trying)
        BEGIN
            CREATE ROLE authenticator;
            ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
            RAISE NOTICE 'Created authenticator role and changed ownership';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE WARNING 'Cannot create role - insufficient privileges';
            WHEN duplicate_object THEN
                -- Role exists, try ownership change again
                ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
                RAISE NOTICE 'Role exists, changed ownership';
        END;
    WHEN OTHERS THEN
        RAISE WARNING 'Error changing ownership of qr_lifecycle_audit: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Change reality_events_readonly ownership
    EXECUTE 'ALTER VIEW public.reality_events_readonly OWNER TO authenticator';
    RAISE NOTICE 'Successfully changed ownership of reality_events_readonly to authenticator';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE WARNING 'Cannot change ownership - insufficient privileges. Run as postgres superuser:';
        RAISE WARNING '  ALTER VIEW public.reality_events_readonly OWNER TO authenticator;';
    WHEN undefined_object THEN
        RAISE WARNING 'authenticator role does not exist. Creating it...';
        -- Try to create the role (will fail if no permission, but worth trying)
        BEGIN
            CREATE ROLE authenticator;
            ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
            RAISE NOTICE 'Created authenticator role and changed ownership';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE WARNING 'Cannot create role - insufficient privileges';
            WHEN duplicate_object THEN
                -- Role exists, try ownership change again
                ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
                RAISE NOTICE 'Role exists, changed ownership';
        END;
    WHEN OTHERS THEN
        RAISE WARNING 'Error changing ownership of reality_events_readonly: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Verify ownership changed
-- ============================================================================
DO $$
DECLARE
    v_view_owner TEXT;
    v_all_fixed BOOLEAN := true;
BEGIN
    RAISE NOTICE '=== Verifying ownership changes ===';
    
    SELECT viewowner INTO v_view_owner
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'qr_lifecycle_audit';
    
    IF v_view_owner = 'postgres' THEN
        RAISE WARNING 'qr_lifecycle_audit is still owned by postgres!';
        RAISE WARNING 'Run manually: ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;';
        v_all_fixed := false;
    ELSIF v_view_owner = 'authenticator' THEN
        RAISE NOTICE '✓ qr_lifecycle_audit ownership changed to authenticator';
    ELSE
        RAISE NOTICE 'qr_lifecycle_audit owner: %', v_view_owner;
    END IF;
    
    SELECT viewowner INTO v_view_owner
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'reality_events_readonly';
    
    IF v_view_owner = 'postgres' THEN
        RAISE WARNING 'reality_events_readonly is still owned by postgres!';
        RAISE WARNING 'Run manually: ALTER VIEW public.reality_events_readonly OWNER TO authenticator;';
        v_all_fixed := false;
    ELSIF v_view_owner = 'authenticator' THEN
        RAISE NOTICE '✓ reality_events_readonly ownership changed to authenticator';
    ELSE
        RAISE NOTICE 'reality_events_readonly owner: %', v_view_owner;
    END IF;
    
    IF v_all_fixed THEN
        RAISE NOTICE '=== All views ownership changed successfully! ===';
        RAISE NOTICE 'The linter should stop flagging these views after it refreshes (may take a few minutes)';
    ELSE
        RAISE WARNING '=== Some views still need manual ownership change ===';
        RAISE WARNING 'Run the ALTER VIEW commands shown above as postgres superuser';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- MANUAL FIX (if automatic change failed)
-- ============================================================================
-- If the views are still owned by 'postgres', run these commands manually
-- in Supabase SQL Editor (they require superuser privileges):
--
-- ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
-- ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
--
-- Verify with:
-- SELECT schemaname, viewname, viewowner 
-- FROM pg_views 
-- WHERE viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
--
-- Expected: Both should show viewowner = 'authenticator'
-- ============================================================================

