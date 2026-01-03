-- Migration 047: Simple View Ownership Fix (No Role Creation)
-- ============================================================================
-- This version only changes ownership to existing roles - no role creation
-- Run this in Supabase SQL Editor
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
-- Try to change ownership to existing roles (in order of preference)
-- Supabase typically has: authenticator, anon, authenticated, service_role
DO $$ BEGIN -- Try authenticator first (most common in Supabase)
BEGIN ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
RAISE NOTICE '✓ Changed qr_lifecycle_audit ownership to authenticator';
EXCEPTION
WHEN undefined_object THEN -- Try anon as fallback
BEGIN ALTER VIEW public.qr_lifecycle_audit OWNER TO anon;
RAISE NOTICE '✓ Changed qr_lifecycle_audit ownership to anon';
EXCEPTION
WHEN OTHERS THEN RAISE WARNING 'Could not change qr_lifecycle_audit ownership. Error: %',
SQLERRM;
RAISE WARNING 'Try running manually: ALTER VIEW public.qr_lifecycle_audit OWNER TO anon;';
END;
WHEN OTHERS THEN RAISE WARNING 'Could not change qr_lifecycle_audit ownership. Error: %',
SQLERRM;
END;
BEGIN ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
RAISE NOTICE '✓ Changed reality_events_readonly ownership to authenticator';
EXCEPTION
WHEN undefined_object THEN -- Try anon as fallback
BEGIN ALTER VIEW public.reality_events_readonly OWNER TO anon;
RAISE NOTICE '✓ Changed reality_events_readonly ownership to anon';
EXCEPTION
WHEN OTHERS THEN RAISE WARNING 'Could not change reality_events_readonly ownership. Error: %',
SQLERRM;
RAISE WARNING 'Try running manually: ALTER VIEW public.reality_events_readonly OWNER TO anon;';
END;
WHEN OTHERS THEN RAISE WARNING 'Could not change reality_events_readonly ownership. Error: %',
SQLERRM;
END;
END $$;
-- Verify ownership changed
SELECT schemaname,
    viewname,
    viewowner,
    CASE
        WHEN viewowner IN ('authenticator', 'anon', 'authenticated') THEN '✓ FIXED'
        WHEN viewowner = 'postgres' THEN '❌ STILL NEEDS FIX'
        ELSE '⚠️  UNEXPECTED OWNER: ' || viewowner
    END as status
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
-- Final status
DO $$
DECLARE still_postgres_count INTEGER;
BEGIN
SELECT COUNT(*) INTO still_postgres_count
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly')
    AND viewowner = 'postgres';
IF still_postgres_count = 0 THEN RAISE NOTICE '========================================';
RAISE NOTICE '✓ SUCCESS: All views ownership changed!';
RAISE NOTICE 'The Supabase linter should stop flagging these';
RAISE NOTICE 'views after it refreshes (5-10 minutes)';
RAISE NOTICE '========================================';
ELSE RAISE WARNING '========================================';
RAISE WARNING '⚠️  Some views are still owned by postgres';
RAISE WARNING 'You may need to run the ALTER VIEW commands';
RAISE WARNING 'manually with superuser privileges';
RAISE WARNING '========================================';
END IF;
END $$;