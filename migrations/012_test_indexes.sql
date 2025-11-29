-- Test Index Performance
-- This script tests the optimized queries to verify indexes are being used
-- ============================================================================

-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with an actual user ID from your database
-- You can get a user ID by running: SELECT id FROM public.profiles LIMIT 1;

-- 1. Test fabricator_profiles query (should use idx_fabricator_profiles_user_created_desc)
-- First, let's get a real user_id
DO $$
DECLARE
    v_user_id UUID;
    v_test_result TEXT;
BEGIN
    -- Get first available user_id
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found in profiles table. Skipping fabricator_profiles test.';
    ELSE
        RAISE NOTICE 'Testing fabricator_profiles query with user_id: %', v_user_id;
        
        -- Run the query and explain it
        EXECUTE format('
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT * FROM public.fabricator_profiles 
            WHERE user_id = %L 
            ORDER BY created_at DESC 
            LIMIT 10
        ', v_user_id);
    END IF;
END $$;

-- 2. Test get_remnant_consolidation_suggestions function (should use material_remnants indexes)
DO $$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
BEGIN
    -- Get first available user_id and profile_id
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    SELECT id INTO v_profile_id FROM public.fabricator_profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Skipping remnant consolidation test.';
    ELSE
        RAISE NOTICE 'Testing get_remnant_consolidation_suggestions with user_id: %', v_user_id;
        
        -- Run the function and explain it
        IF v_profile_id IS NOT NULL THEN
            EXECUTE format('
                EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
                SELECT * FROM public.get_remnant_consolidation_suggestions(%L, %L)
            ', v_user_id, v_profile_id);
        ELSE
            EXECUTE format('
                EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
                SELECT * FROM public.get_remnant_consolidation_suggestions(%L, NULL)
            ', v_user_id);
        END IF;
    END IF;
END $$;

-- 3. Test stock_movements query (should use idx_stock_movements_user_created_desc)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Skipping stock_movements test.';
    ELSE
        RAISE NOTICE 'Testing stock_movements query with user_id: %', v_user_id;
        
        EXECUTE format('
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT * FROM public.stock_movements 
            WHERE user_id = %L 
            ORDER BY created_at DESC 
            LIMIT 10
        ', v_user_id);
    END IF;
END $$;

-- 4. Test material_remnants query (should use idx_material_remnants_user_status_created_desc)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Skipping material_remnants test.';
    ELSE
        RAISE NOTICE 'Testing material_remnants query with user_id: %', v_user_id;
        
        EXECUTE format('
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT * FROM public.material_remnants 
            WHERE user_id = %L 
            AND status = ''available''
            ORDER BY created_at DESC 
            LIMIT 10
        ', v_user_id);
    END IF;
END $$;

-- 5. Summary: Check if indexes exist
SELECT 
    'Index Verification Summary' as section,
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_fabricator_profiles_user_created_desc') as fabricator_profiles_index,
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_stock_movements_user_created_desc') as stock_movements_index,
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_material_remnants_profile_user_status_length') as remnants_join_index,
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_material_remnants_user_status_created_desc') as remnants_user_index
FROM pg_indexes
WHERE schemaname = 'public';

-- 6. Instructions
SELECT 
    'Test Complete' as status,
    'Check the EXPLAIN output above. Look for "Index Scan" or "Index Only Scan" in the plan.' as instruction,
    'If you see "Seq Scan" (sequential scan), the index may not be used (could be due to small table size).' as note;

