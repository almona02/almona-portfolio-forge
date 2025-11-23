-- Diagnostic script to find the exact line causing the "user_id does not exist" error
-- Run this BEFORE running migration 006 to verify the database state

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_column_exists BOOLEAN;
  v_test_query TEXT;
  v_result UUID;
  v_columns TEXT;
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC: Checking fabricator_profiles table ===';
  
  -- Check table existence
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'ERROR: fabricator_profiles table does not exist. Run migration 004 first.';
  END IF;
  
  RAISE NOTICE '✓ Table fabricator_profiles exists';
  
  -- Check column existence
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
    RAISE EXCEPTION 'ERROR: user_id column does not exist in fabricator_profiles. Existing columns: %', v_columns;
  END IF;
  
  RAISE NOTICE '✓ Column user_id exists in fabricator_profiles';
  
  -- Test direct access
  BEGIN
    SELECT user_id INTO v_result 
    FROM public.fabricator_profiles 
    LIMIT 1;
    RAISE NOTICE '✓ Can directly SELECT user_id from fabricator_profiles';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE EXCEPTION 'ERROR: Cannot SELECT user_id - column does not exist (undefined_column)';
    WHEN undefined_table THEN
      RAISE EXCEPTION 'ERROR: Cannot SELECT user_id - table does not exist (undefined_table)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'ERROR: Cannot SELECT user_id - Error: % (Code: %)', SQLERRM, SQLSTATE;
  END;
  
  -- Test dynamic SQL access
  BEGIN
    EXECUTE format('SELECT user_id FROM %I.%I LIMIT 1', 'public', 'fabricator_profiles') INTO v_result;
    RAISE NOTICE '✓ Can access user_id via dynamic SQL';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'ERROR: Cannot access user_id via dynamic SQL - Error: % (Code: %)', SQLERRM, SQLSTATE;
  END;
  
  -- Test in JOIN context (simulating the check_stock_levels function)
  BEGIN
    EXECUTE format('
      SELECT fp.id, fp.user_id 
      FROM %I.%I fp 
      LEFT JOIN %I.%I mr ON mr.profile_id = fp.id AND mr.user_id = fp.user_id 
      WHERE fp.user_id = $1 
      LIMIT 1
    ', 'public', 'fabricator_profiles', 'public', 'material_remnants') USING gen_random_uuid();
    RAISE NOTICE '✓ Can use user_id in JOIN context (even if material_remnants does not exist yet)';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '⚠ material_remnants table does not exist yet (this is expected before migration 006)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'ERROR: Cannot use user_id in JOIN - Error: % (Code: %)', SQLERRM, SQLSTATE;
  END;
  
  RAISE NOTICE '=== ALL CHECKS PASSED ===';
  RAISE NOTICE 'The database state looks correct. If migration 006 still fails,';
  RAISE NOTICE 'the error is likely in a specific function or statement.';
  RAISE NOTICE 'Please copy the EXACT error message including the line number.';
  
END $$;

