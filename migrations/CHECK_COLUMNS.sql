-- Quick check: Verify all user_id columns exist in relevant tables
-- Run this to see what columns actually exist

-- 1. Check fabricator_profiles columns
SELECT 
  'fabricator_profiles' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'fabricator_profiles'
ORDER BY ordinal_position;

-- 2. Check if user_id exists in fabricator_profiles
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_profiles' 
      AND column_name = 'user_id'
    ) THEN 'user_id EXISTS in fabricator_profiles'
    ELSE 'user_id DOES NOT EXIST in fabricator_profiles'
  END as check_result;

-- 3. Check material_remnants table (if it exists from migration 006)
SELECT 
  'material_remnants' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'material_remnants'
ORDER BY ordinal_position;

-- 4. Try to query user_id directly
SELECT user_id FROM public.fabricator_profiles LIMIT 1;

