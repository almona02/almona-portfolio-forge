-- Diagnostic script to check if migration 004 was applied correctly
-- Run this BEFORE running migration 006 to identify any issues

-- 1. Check if fabricator_profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_profiles'
    ) THEN '✓ Table fabricator_profiles EXISTS'
    ELSE '✗ Table fabricator_profiles DOES NOT EXIST - Run migration 004 first!'
  END as table_check;

-- 2. Check if user_id column exists in fabricator_profiles
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_profiles' 
      AND column_name = 'user_id'
    ) THEN '✓ Column user_id EXISTS in fabricator_profiles'
    ELSE '✗ Column user_id DOES NOT EXIST in fabricator_profiles - Migration 004 may have failed!'
  END as column_check;

-- 3. List all columns in fabricator_profiles (to see what actually exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'fabricator_profiles'
ORDER BY ordinal_position;

-- 4. Test if we can query the user_id column
DO $$
BEGIN
  BEGIN
    PERFORM user_id FROM public.fabricator_profiles LIMIT 1;
    RAISE NOTICE '✓ Successfully queried user_id column';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE EXCEPTION '✗ ERROR: user_id column does not exist or cannot be accessed';
    WHEN undefined_table THEN
      RAISE EXCEPTION '✗ ERROR: fabricator_profiles table does not exist';
    WHEN OTHERS THEN
      RAISE EXCEPTION '✗ ERROR accessing user_id: %', SQLERRM;
  END;
END $$;

-- 5. Check if profiles table exists (required for foreign keys)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
    ) THEN '✓ Table profiles EXISTS'
    ELSE '✗ Table profiles DOES NOT EXIST - This is required for foreign keys!'
  END as profiles_table_check;

