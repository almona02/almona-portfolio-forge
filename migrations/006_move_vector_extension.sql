-- ============================================================================
-- Security Hardening - Move Vector Extension
-- ============================================================================
-- This migration moves the vector extension from the public schema to a
-- dedicated extensions schema for better organization and security.
--
-- Security Issue: Extensions in the public schema can potentially be
-- manipulated or create naming conflicts.
--
-- Best Practice: Keep extensions in a separate schema.
-- ============================================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

-- ============================================================================
-- Important Note
-- ============================================================================
-- After running this migration, you may need to update any code that
-- references the vector extension to use schema-qualified names:
-- 
-- Before: vector
-- After:  extensions.vector
--
-- Or add 'extensions' to your search_path:
-- SET search_path = public, extensions, pg_temp;
-- ============================================================================

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the extension location:
-- 
-- SELECT 
--     extname,
--     nspname as schema
-- FROM pg_extension e
-- JOIN pg_namespace n ON e.extnamespace = n.oid
-- WHERE extname = 'vector';
-- 
-- Expected result: schema = 'extensions'
-- ============================================================================
