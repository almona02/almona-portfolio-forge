-- DEBUG VERSION: Migration 006 with detailed error reporting
-- This version will help identify exactly which statement fails

-- Enable UUID extension if not already enabled
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  RAISE NOTICE 'Step 1: UUID extension enabled';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed at Step 1 (UUID extension): %', SQLERRM;
END $$;

-- Pre-flight check
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_column_exists BOOLEAN;
  v_test_result UUID;
  v_columns TEXT;
BEGIN
  RAISE NOTICE 'Step 2: Starting pre-flight check';
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Migration 004 must be applied first. The fabricator_profiles table does not exist.';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles' 
    AND column_name = 'user_id'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    SELECT string_agg(column_name, ', ') INTO v_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles';
    RAISE EXCEPTION 'The fabricator_profiles table exists but is missing the user_id column. Existing columns: %', v_columns;
  END IF;
  
  BEGIN
    SELECT public.fabricator_profiles.user_id INTO v_test_result FROM public.fabricator_profiles LIMIT 1;
  EXCEPTION
    WHEN undefined_column THEN
      RAISE EXCEPTION 'Cannot access user_id column. Error code: %', SQLSTATE;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Cannot access user_id column. Error: % (Code: %)', SQLERRM, SQLSTATE;
  END;
  
  RAISE NOTICE 'Step 2: Pre-flight check passed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed at Step 2 (Pre-flight check): %', SQLERRM;
END $$;

-- Create tables one by one with error handling
DO $$
BEGIN
  RAISE NOTICE 'Step 3: Creating inventory_locations table';
  CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    address TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_default_location UNIQUE (user_id, is_default) WHERE is_default = TRUE
  );
  RAISE NOTICE 'Step 3: inventory_locations table created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed at Step 3 (inventory_locations table): %', SQLERRM;
END $$;

-- Continue with remaining tables and functions...
-- (This is a diagnostic version - the full version would continue)

