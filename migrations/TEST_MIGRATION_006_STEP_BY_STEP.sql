-- Step-by-step test for migration 006
-- Run each section separately to identify where the error occurs

-- STEP 1: Verify prerequisites
SELECT 'STEP 1: Checking prerequisites...' as step;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_profiles')
    THEN '✓ fabricator_profiles table exists'
    ELSE '✗ fabricator_profiles table MISSING'
  END as check_1;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fabricator_profiles' AND column_name = 'user_id')
    THEN '✓ user_id column exists in fabricator_profiles'
    ELSE '✗ user_id column MISSING in fabricator_profiles'
  END as check_2;

-- STEP 2: Test creating inventory_locations table
SELECT 'STEP 2: Testing inventory_locations table creation...' as step;

CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_location_code UNIQUE (user_id, code)
);

SELECT '✓ inventory_locations table created' as result;

-- STEP 3: Test creating index on inventory_locations
SELECT 'STEP 3: Testing index creation on inventory_locations...' as step;

CREATE INDEX IF NOT EXISTS idx_inventory_locations_user_id ON public.inventory_locations(user_id);

SELECT '✓ Index created on inventory_locations.user_id' as result;

-- STEP 4: Test creating material_remnants table
SELECT 'STEP 4: Testing material_remnants table creation...' as step;

CREATE TABLE IF NOT EXISTS public.material_remnants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  length DECIMAL(10,2) NOT NULL CHECK (length > 0),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  thickness DECIMAL(10,2),
  source_project_id UUID,
  source_cut_id UUID,
  source_stock_length DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_in_project_id UUID,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'used', 'expired', 'scrapped')),
  quality TEXT DEFAULT 'good' CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
  expiration_date TIMESTAMPTZ,
  estimated_value DECIMAL(10,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  barcode TEXT UNIQUE,
  qr_code_url TEXT,
  notes TEXT,
  tags TEXT[],
  CONSTRAINT valid_dimensions CHECK (length > 0 AND (width IS NULL OR width > 0)),
  CONSTRAINT valid_value CHECK (estimated_value >= 0)
);

SELECT '✓ material_remnants table created' as result;

-- STEP 5: Test creating index on material_remnants
SELECT 'STEP 5: Testing index creation on material_remnants...' as step;

CREATE INDEX IF NOT EXISTS idx_material_remnants_user_id ON public.material_remnants(user_id);

SELECT '✓ Index created on material_remnants.user_id' as result;

-- STEP 6: Test the function with simplest possible query
SELECT 'STEP 6: Testing function creation...' as step;

CREATE OR REPLACE FUNCTION test_user_id_access()
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.fabricator_profiles WHERE user_id IS NOT NULL;
  RETURN v_count >= 0;
END;
$$ LANGUAGE plpgsql;

SELECT '✓ Function created successfully' as result;

-- STEP 7: Test the dynamic SQL function
SELECT 'STEP 7: Testing dynamic SQL function...' as step;

CREATE OR REPLACE FUNCTION test_dynamic_user_id()
RETURNS INTEGER AS $$
DECLARE
  v_query TEXT;
  v_count INTEGER;
BEGIN
  v_query := format('SELECT COUNT(*) FROM %I.%I WHERE user_id IS NOT NULL', 'public', 'fabricator_profiles');
  EXECUTE v_query INTO v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

SELECT '✓ Dynamic SQL function created successfully' as result;

SELECT 'All tests passed! The issue is likely in a specific part of migration 006.' as final_result;

