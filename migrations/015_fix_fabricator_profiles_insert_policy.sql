-- Migration 015: Fix Missing INSERT Policy for fabricator_profiles
-- This migration adds the missing INSERT policy that was accidentally omitted
-- from migration 013, causing RLS violations when inserting new profiles.
-- ============================================================================

-- Fix fabricator_profiles INSERT policy
DO $$
BEGIN
    -- Drop the policy if it exists (in case of re-running)
    DROP POLICY IF EXISTS "auth_insert_profiles" ON public.fabricator_profiles;
    DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.fabricator_profiles;
    
    -- Create the INSERT policy
    CREATE POLICY "auth_insert_profiles" ON public.fabricator_profiles
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- Verify the policy was created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fabricator_profiles'
      AND policyname = 'auth_insert_profiles';
    
    IF policy_count = 0 THEN
        RAISE EXCEPTION 'Failed to create INSERT policy for fabricator_profiles';
    END IF;
END $$;

