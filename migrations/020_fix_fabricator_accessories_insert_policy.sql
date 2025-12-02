-- Migration 020: Fix Missing INSERT Policy for fabricator_accessories
-- This migration adds the missing INSERT policy that was accidentally omitted
-- from migration 013, causing RLS violations when inserting new accessories.
-- ============================================================================

-- Fix fabricator_accessories INSERT policy
DO $$
BEGIN
    -- Drop the policy if it exists (in case of re-running)
    DROP POLICY IF EXISTS "auth_insert_accessories" ON public.fabricator_accessories;
    DROP POLICY IF EXISTS "Users can insert their own accessories" ON public.fabricator_accessories;
    
    -- Create the INSERT policy
    CREATE POLICY "auth_insert_accessories" ON public.fabricator_accessories
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
      AND tablename = 'fabricator_accessories'
      AND policyname = 'auth_insert_accessories';
    
    IF policy_count = 0 THEN
        RAISE EXCEPTION 'Failed to create INSERT policy for fabricator_accessories';
    END IF;
END $$;
