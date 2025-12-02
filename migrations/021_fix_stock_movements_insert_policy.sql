-- Migration 021: Fix stock_movements INSERT Policy
-- This migration updates the INSERT policy to ensure auth.uid() is not NULL
-- before checking equality, similar to the fix in migration 015 for fabricator_profiles.
-- ============================================================================

-- Fix stock_movements INSERT policy
DO $$
BEGIN
    -- Drop the existing policy if it exists
    DROP POLICY IF EXISTS "Users can insert their own stock movements" ON public.stock_movements;
    
    -- Create the updated INSERT policy with NULL check
    CREATE POLICY "Users can insert their own stock movements" ON public.stock_movements
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
      AND tablename = 'stock_movements'
      AND policyname = 'Users can insert their own stock movements';
    
    IF policy_count = 0 THEN
        RAISE EXCEPTION 'Failed to create INSERT policy for stock_movements';
    END IF;
END $$;
