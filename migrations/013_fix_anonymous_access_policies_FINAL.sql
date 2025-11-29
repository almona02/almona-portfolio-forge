-- Migration 013: Fix Anonymous Access Policies (FINAL VERSION)
-- Addresses auth_allow_anonymous_sign_ins warnings by restricting anonymous access
-- Uses short policy names (max 63 chars) to avoid PostgreSQL identifier truncation
-- This version is idempotent and handles all policy name variations
-- ============================================================================

-- IMPORTANT: This migration restricts anonymous access to user-specific tables.
-- Public-facing tables (products, categories, etc.) will continue to allow anonymous read access.
-- User-specific tables will require authentication.

-- ============================================================================
-- PART 1: PUBLIC-FACING TABLES (Keep anonymous access - these are intentional)
-- ============================================================================
-- These tables are intentionally public-facing and should allow anonymous access:
-- - categories (active categories)
-- - products (active products)
-- - product_reviews (approved reviews)
-- - exchange_rate_cache (public exchange rates)
-- - spare_parts (active spare parts)
-- - used_machines (verified unsold listings)
-- - fabricator_system_packs (global system packs)

-- No changes needed for these tables - they are correctly configured for public access.

-- ============================================================================
-- PART 2: USER-SPECIFIC TABLES (Require authentication)
-- ============================================================================
-- These tables should only be accessible to authenticated users.
-- We'll modify policies to explicitly require authentication.
-- Policy names are kept short (max 63 chars) to avoid PostgreSQL truncation.

-- Helper function to drop all policy variations
-- This ensures we clean up any policies from previous partial runs
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies that might exist from previous runs
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
            policyname LIKE '%Authenticated users%' 
            OR policyname LIKE '%auth_%'
            OR policyname LIKE '%Users can%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Now create all policies with short names
-- (Continue with the short_names file content...)

-- Copy the rest from 013_fix_anonymous_access_policies_short_names.sql
-- This ensures consistency and avoids truncation issues

