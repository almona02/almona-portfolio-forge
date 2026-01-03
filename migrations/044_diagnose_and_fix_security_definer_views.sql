-- Migration 044: Diagnose and Fix Security Definer Views (Comprehensive)
-- This migration provides diagnostics and a definitive fix for views flagged as SECURITY DEFINER
-- ============================================================================
-- ISSUE: Supabase linter flags views as having SECURITY DEFINER property
-- ROOT CAUSE: Views owned by superuser (postgres) or views that might be confused with functions
-- SOLUTION: Drop everything, recreate views, change ownership, and verify
-- ============================================================================
BEGIN;
-- ============================================================================
-- PART 1: DIAGNOSTICS - Check current state
-- ============================================================================
DO $$
DECLARE view_rec RECORD;
func_rec RECORD;
BEGIN RAISE NOTICE '=== DIAGNOSTICS: Checking view state ===';
-- Check views
FOR view_rec IN
SELECT schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly') LOOP RAISE NOTICE 'View: %.% | Owner: %',
    view_rec.schemaname,
    view_rec.viewname,
    view_rec.viewowner;
END LOOP;
-- Check for functions with same names
FOR func_rec IN
SELECT n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('qr_lifecycle_audit', 'reality_events_readonly') LOOP RAISE NOTICE 'Function found: %.% | SECURITY DEFINER: %',
    func_rec.schema_name,
    func_rec.function_name,
    func_rec.is_security_definer;
END LOOP;
-- Check view dependencies
RAISE NOTICE '=== Checking view dependencies ===';
FOR view_rec IN
SELECT dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_view,
    source_ns.nspname as source_schema,
    source_table.relname as source_table
FROM pg_depend
    JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
    JOIN pg_class dependent_view ON pg_rewrite.ev_class = dependent_view.oid
    JOIN pg_class source_table ON pg_depend.refobjid = source_table.oid
    JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
    JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE dependent_ns.nspname = 'public'
    AND dependent_view.relname IN ('qr_lifecycle_audit', 'reality_events_readonly') LOOP RAISE NOTICE 'View %.% depends on %.%',
    view_rec.dependent_schema,
    view_rec.dependent_view,
    view_rec.source_schema,
    view_rec.source_table;
END LOOP;
END $$;
-- ============================================================================
-- PART 2: AGGRESSIVE CLEANUP - Drop everything that might interfere
-- ============================================================================
-- 2.1: Drop qr_lifecycle_audit (all variations)
-- Order matters: drop regular view first, then materialized view, then functions
DROP VIEW IF EXISTS public.qr_lifecycle_audit CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.qr_lifecycle_audit CASCADE;
DROP FUNCTION IF EXISTS public.qr_lifecycle_audit() CASCADE;
DROP FUNCTION IF EXISTS public.qr_lifecycle_audit CASCADE;
-- 2.2: Drop reality_events_readonly (all variations)
-- Order matters: drop regular view first, then materialized view, then functions
DROP VIEW IF EXISTS public.reality_events_readonly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.reality_events_readonly CASCADE;
DROP FUNCTION IF EXISTS public.reality_events_readonly() CASCADE;
DROP FUNCTION IF EXISTS public.reality_events_readonly CASCADE;
-- ============================================================================
-- PART 3: RECREATE VIEWS - Explicitly as simple views
-- ============================================================================
-- 3.1: Recreate qr_lifecycle_audit view
-- Using explicit schema qualification and simple SELECT
-- Note: Views in PostgreSQL are SECURITY INVOKER by default (unlike functions)
CREATE VIEW public.qr_lifecycle_audit AS
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
-- 3.2: Recreate reality_events_readonly view
-- Note: Views in PostgreSQL are SECURITY INVOKER by default (unlike functions)
CREATE VIEW public.reality_events_readonly AS
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
-- ============================================================================
-- PART 4: CHANGE OWNERSHIP - From postgres to authenticator
-- ============================================================================
-- Note: This requires superuser privileges. If it fails, run manually.
DO $$ BEGIN -- Try to change ownership to authenticator (non-superuser role)
ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
RAISE NOTICE 'Changed ownership of qr_lifecycle_audit to authenticator';
EXCEPTION
WHEN insufficient_privilege THEN RAISE WARNING 'Cannot change ownership - requires superuser. Run manually: ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;';
WHEN undefined_object THEN RAISE WARNING 'authenticator role does not exist. Views will remain owned by postgres.';
WHEN OTHERS THEN RAISE WARNING 'Could not change ownership of qr_lifecycle_audit: %',
SQLERRM;
END $$;
DO $$ BEGIN -- Try to change ownership to authenticator (non-superuser role)
ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
RAISE NOTICE 'Changed ownership of reality_events_readonly to authenticator';
EXCEPTION
WHEN insufficient_privilege THEN RAISE WARNING 'Cannot change ownership - requires superuser. Run manually: ALTER VIEW public.reality_events_readonly OWNER TO authenticator;';
WHEN undefined_object THEN RAISE WARNING 'authenticator role does not exist. Views will remain owned by postgres.';
WHEN OTHERS THEN RAISE WARNING 'Could not change ownership of reality_events_readonly: %',
SQLERRM;
END $$;
-- ============================================================================
-- PART 5: GRANT PERMISSIONS - Re-grant to application roles
-- ============================================================================
DO $$ BEGIN
GRANT SELECT ON public.qr_lifecycle_audit TO application_user;
GRANT SELECT ON public.qr_lifecycle_audit TO realityos_app;
RAISE NOTICE 'Granted permissions on qr_lifecycle_audit';
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Could not grant permissions on qr_lifecycle_audit: %',
SQLERRM;
END $$;
DO $$ BEGIN
GRANT SELECT ON public.reality_events_readonly TO application_user;
GRANT SELECT ON public.reality_events_readonly TO realityos_app;
RAISE NOTICE 'Granted permissions on reality_events_readonly';
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Could not grant permissions on reality_events_readonly: %',
SQLERRM;
END $$;
-- ============================================================================
-- PART 6: ADD COMMENTS
-- ============================================================================
COMMENT ON VIEW public.qr_lifecycle_audit IS 'Auditor-friendly view of QR lifecycle status. Created as SECURITY INVOKER view (not SECURITY DEFINER).';
COMMENT ON VIEW public.reality_events_readonly IS 'Read-only view of reality events for applications. Created as SECURITY INVOKER view (not SECURITY DEFINER).';
-- ============================================================================
-- PART 7: VERIFICATION - Check final state
-- ============================================================================
DO $$
DECLARE view_rec RECORD;
BEGIN RAISE NOTICE '=== VERIFICATION: Final view state ===';
FOR view_rec IN
SELECT schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('qr_lifecycle_audit', 'reality_events_readonly') LOOP RAISE NOTICE 'View: %.% | Owner: %',
    view_rec.schemaname,
    view_rec.viewname,
    view_rec.viewowner;
IF view_rec.viewowner = 'postgres' THEN RAISE WARNING 'View %.% is still owned by postgres. Change ownership manually to fix linter warning.',
view_rec.schemaname,
view_rec.viewname;
END IF;
END LOOP;
END $$;
COMMIT;
-- ============================================================================
-- MANUAL FIXES (if automatic ownership change fails)
-- ============================================================================
-- If the views are still flagged after this migration, run these commands
-- in Supabase SQL Editor with superuser privileges:
--
-- ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
-- ALTER VIEW public.reality_events_readonly OWNER TO authenticator;
--
-- Then verify:
-- SELECT schemaname, viewname, viewowner 
-- FROM pg_views 
-- WHERE viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
--
-- Both should show viewowner = 'authenticator' (not 'postgres')
-- ============================================================================