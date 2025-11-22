-- Migration 004: Fabricator Profiles and Accessories
-- Creates tables for user-defined profiles and accessories with full CRUD support
-- Includes compatibility matrix and regional presets for Turkish and Egyptian markets

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User-defined profiles table
CREATE TABLE IF NOT EXISTS public.fabricator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  material TEXT NOT NULL CHECK (material IN ('aluminum', 'upvc', 'wood')),
  width DECIMAL(8,2) NOT NULL,
  height DECIMAL(8,2),
  thickness DECIMAL(8,2),
  color TEXT DEFAULT '#C0C0C0',
  cost_per_meter DECIMAL(10,2) NOT NULL DEFAULT 0,
  cutting_allowance DECIMAL(5,2) DEFAULT 3.0,
  grain_direction TEXT CHECK (grain_direction IN ('horizontal', 'vertical', NULL)),
  supplier TEXT,
  stock_quantity DECIMAL(10,2) DEFAULT 0,
  min_stock_level DECIMAL(10,2) DEFAULT 0,
  max_stock_level DECIMAL(10,2),
  system_brand TEXT, -- 'Yilmaz', 'Kale', 'Profilma', 'Alumil', 'Salam', 'Kastamonu', 'Standard', 'Other'
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dimensions CHECK (width > 0 AND (height IS NULL OR height > 0)),
  CONSTRAINT valid_stock CHECK (stock_quantity >= 0 AND min_stock_level >= 0),
  CONSTRAINT valid_cutting_allowance CHECK (cutting_allowance >= 0)
);

-- 2. User-defined accessories table
CREATE TABLE IF NOT EXISTS public.fabricator_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hinge', 'lock', 'handle', 'seal', 'spacer', 'corner', 'other')),
  category TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  base_cost DECIMAL(10,2) NOT NULL,
  markup_percentage DECIMAL(5,2) DEFAULT 30.0,
  supplier TEXT,
  sku TEXT,
  description TEXT,
  compatible_materials TEXT[] DEFAULT '{}', -- Array of materials: ['aluminum', 'upvc', 'wood']
  region TEXT[] DEFAULT '{global}', -- Array of regions: ['turkey', 'egypt', 'global']
  image_url TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_pricing CHECK (unit_price >= 0 AND base_cost >= 0 AND markup_percentage >= 0)
);

-- 3. Profile-Accessory compatibility matrix
CREATE TABLE IF NOT EXISTS public.profile_accessory_compatibility (
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE,
  accessory_id UUID REFERENCES public.fabricator_accessories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, accessory_id)
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_id ON public.fabricator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_material ON public.fabricator_profiles(material);
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_system_brand ON public.fabricator_profiles(system_brand);
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_stock ON public.fabricator_profiles(stock_quantity, min_stock_level);

CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_id ON public.fabricator_accessories(user_id);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_type ON public.fabricator_accessories(type);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_region ON public.fabricator_accessories USING GIN(region);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_materials ON public.fabricator_accessories USING GIN(compatible_materials);

CREATE INDEX IF NOT EXISTS idx_compatibility_profile ON public.profile_accessory_compatibility(profile_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_accessory ON public.profile_accessory_compatibility(accessory_id);

-- 5. Update trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers for updated_at
DROP TRIGGER IF EXISTS update_fabricator_profiles_updated_at ON public.fabricator_profiles;
CREATE TRIGGER update_fabricator_profiles_updated_at
  BEFORE UPDATE ON public.fabricator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fabricator_accessories_updated_at ON public.fabricator_accessories;
CREATE TRIGGER update_fabricator_accessories_updated_at
  BEFORE UPDATE ON public.fabricator_accessories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.fabricator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_accessory_compatibility ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.fabricator_profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.fabricator_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.fabricator_profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.fabricator_profiles;

DROP POLICY IF EXISTS "Users can view their own accessories" ON public.fabricator_accessories;
DROP POLICY IF EXISTS "Users can insert their own accessories" ON public.fabricator_accessories;
DROP POLICY IF EXISTS "Users can update their own accessories" ON public.fabricator_accessories;
DROP POLICY IF EXISTS "Users can delete their own accessories" ON public.fabricator_accessories;

DROP POLICY IF EXISTS "Users can view their own compatibilities" ON public.profile_accessory_compatibility;
DROP POLICY IF EXISTS "Users can manage their own compatibilities" ON public.profile_accessory_compatibility;

-- Profiles policies
CREATE POLICY "Users can view their own profiles" ON public.fabricator_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profiles" ON public.fabricator_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.fabricator_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" ON public.fabricator_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Accessories policies
CREATE POLICY "Users can view their own accessories" ON public.fabricator_accessories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accessories" ON public.fabricator_accessories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accessories" ON public.fabricator_accessories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accessories" ON public.fabricator_accessories
  FOR DELETE USING (auth.uid() = user_id);

-- Compatibility policies
CREATE POLICY "Users can view their own compatibilities" ON public.profile_accessory_compatibility
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_profiles 
      WHERE id = profile_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own compatibilities" ON public.profile_accessory_compatibility
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fabricator_profiles 
      WHERE id = profile_id AND user_id = auth.uid()
    )
  );

-- 8. Helper function to get low stock profiles
CREATE OR REPLACE FUNCTION get_low_stock_profiles(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  material TEXT,
  stock_quantity DECIMAL,
  min_stock_level DECIMAL,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.name,
    fp.material,
    fp.stock_quantity,
    fp.min_stock_level,
    CASE
      WHEN fp.stock_quantity <= 0 THEN 'out'
      WHEN fp.stock_quantity < fp.min_stock_level THEN 'low'
      WHEN fp.stock_quantity < fp.min_stock_level * 1.5 THEN 'medium'
      ELSE 'high'
    END as status
  FROM public.fabricator_profiles fp
  WHERE fp.user_id = p_user_id
    AND (fp.stock_quantity <= 0 OR fp.stock_quantity < fp.min_stock_level * 1.5)
  ORDER BY fp.stock_quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comments for documentation
COMMENT ON TABLE public.fabricator_profiles IS 'User-defined window profiles with material specifications and stock tracking';
COMMENT ON TABLE public.fabricator_accessories IS 'User-defined hardware and accessories catalog';
COMMENT ON TABLE public.profile_accessory_compatibility IS 'Compatibility matrix linking profiles to compatible accessories';
COMMENT ON FUNCTION get_low_stock_profiles(UUID) IS 'Returns profiles with low or out of stock status for a given user';

