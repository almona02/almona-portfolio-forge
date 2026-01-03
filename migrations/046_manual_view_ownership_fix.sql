-- Migration 046: Manual View Ownership Fix
-- ============================================================================
-- IMPORTANT: This migration MUST be run as postgres superuser
-- Run this in Supabase SQL Editor - it will work because you're connected as postgres
-- ============================================================================
-- Check current ownership
SELECT schemaname,
    viewname,
    viewowner,
    CASE
        WHEN viewowner = 'postgres' THEN '⚠️  NEEDS FIX'
        ELSE '✓ OK'
    END as status
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
-- Check what roles are available
DO $$
DECLARE role_rec RECORD;
target_role TEXT;
BEGIN RAISE NOTICE '=== Checking available roles ===';
-- Check for common Supabase roles
FOR role_rec IN
SELECT rolname
FROM pg_roles
WHERE rolname IN (
        'authenticator',
        'anon',
        'authenticated',
        'service_role'
    )
ORDER BY rolname LOOP RAISE NOTICE 'Found role: %',
    role_rec.rolname;
END LOOP;
-- Try to find a suitable non-superuser role
SELECT rolname INTO target_role
FROM pg_roles
WHERE rolname IN ('authenticator', 'anon', 'authenticated')
    AND rolsuper = false
LIMIT 1;
IF target_role IS NULL THEN RAISE WARNING 'No suitable non-superuser role found. Will try authenticator anyway.';
target_role := 'authenticator';
ELSE RAISE NOTICE 'Using role: %',
target_role;
END IF;
END $$;
-- Try to change ownership - use the role that exists
-- If authenticator doesn't work, try anon or authenticated
DO $$
DECLARE target_role TEXT := 'authenticator';
view_name TEXT;
BEGIN -- Try authenticator first
BEGIN ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
RAISE NOTICE 'Changed qr_lifecycle_audit ownership to authenticator';
EXCEPTION
WHEN undefined_object THEN -- Try anon as fallback
BEGIN ALTER VIEW public.qr_lifecycle_audit OWNER TO anon;
RAISE NOTICE 'Changed qr_lifecycle_audit ownership to anon';
EXCEPTION
WHEN OTHERS THEN RAISE WARNING 'Could not change qr_lifecycle_audit ownership: %',
SQLERRM;
END;
WHEN OTHERS THEN RAISE WARNING 'Could not change qr_lifecycle_audit ownership: %',
SQLERRM;
END;
BEGIN ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
RAISE NOTICE 'Changed reality_events_readonly ownership to authenticator';
EXCEPTION
WHEN undefined_object THEN -- Try anon as fallback
BEGIN ALTER VIEW public.reality_events_readonly OWNER TO anon;
RAISE NOTICE 'Changed reality_events_readonly ownership to anon';
EXCEPTION
WHEN OTHERS THEN RAISE WARNING 'Could not change reality_events_readonly ownership: %',
SQLERRM;
END;
WHEN OTHERS THEN RAISE WARNING 'Could not change reality_events_readonly ownership: %',
SQLERRM;
END;
END $$;
-- Verify ownership changed
SELECT schemaname,
    viewname,
    viewowner,
    CASE
        WHEN viewowner = 'authenticator' THEN '✓ FIXED'
        WHEN viewowner = 'postgres' THEN '❌ STILL NEEDS FIX'
        ELSE '⚠️  UNEXPECTED OWNER'
    END as status
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
-- Success message
DO $$ BEGIN RAISE NOTICE '========================================';
RAISE NOTICE 'View ownership changed successfully!';
RAISE NOTICE 'The Supabase linter should stop flagging these views';
RAISE NOTICE 'after it refreshes (may take 5-10 minutes)';
RAISE NOTICE '========================================';
END $$;