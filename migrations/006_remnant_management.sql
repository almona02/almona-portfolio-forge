-- Migration 006: Remnant Management & Enhanced Inventory System
-- Creates comprehensive remnant tracking, stock movements, multi-location inventory,
-- and advanced inventory analytics with barcode support
--
-- DEPENDENCIES: This migration REQUIRES migration 004 (fabricator_profiles_accessories.sql)
-- to be applied first, as it references the fabricator_profiles table.
--
-- Apply migrations in this order: 004 → 005 → 006 → 007

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pre-flight check: Verify that migration 004 has been applied
-- This will fail with a clear error if the required table doesn't exist
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_column_exists BOOLEAN;
  v_test_result UUID;
  v_columns TEXT;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Migration 004 must be applied first. The fabricator_profiles table does not exist. Please run migrations/004_fabricator_profiles_accessories.sql first.';
  END IF;
  
  -- Check if user_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles' 
    AND column_name = 'user_id'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    -- Get all column names to help debug
    SELECT string_agg(column_name, ', ') INTO v_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_profiles';
    RAISE EXCEPTION 'The fabricator_profiles table exists but is missing the user_id column. Existing columns: %. Please ensure migration 004 completed successfully. You may need to re-run migration 004.', v_columns;
  END IF;
  
  -- Test that we can actually query the column (this will fail if there's a permission or schema issue)
  -- Use a direct SELECT (not EXECUTE) to verify the column exists and is accessible
  BEGIN
    -- Try to select the column - if table is empty, that's OK, we just need to verify column exists
    SELECT public.fabricator_profiles.user_id INTO v_test_result FROM public.fabricator_profiles LIMIT 1;
  EXCEPTION
    WHEN undefined_column THEN
      -- Get all column names to help debug
      SELECT string_agg(column_name, ', ') INTO v_columns
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_profiles';
      RAISE EXCEPTION 'The user_id column does not exist in fabricator_profiles table. Existing columns: %. Error code: %. Please ensure migration 004 completed successfully. You may need to re-run migration 004.', v_columns, SQLSTATE;
    WHEN undefined_table THEN
      RAISE EXCEPTION 'The fabricator_profiles table does not exist. Please run migration 004 first.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Cannot access user_id column in fabricator_profiles table. Error: % (Code: %). Please verify migration 004 completed successfully.', SQLERRM, SQLSTATE;
  END;
END $$;

-- 1. Inventory Locations Table (Multi-location support)
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- Location code (e.g., 'WH-001', 'SHOP-A')
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique location codes per user
  CONSTRAINT unique_user_location_code UNIQUE (user_id, code)
);

-- 2. Material Remnants Table
CREATE TABLE IF NOT EXISTS public.material_remnants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  
  -- Dimensions
  length DECIMAL(10,2) NOT NULL CHECK (length > 0),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  thickness DECIMAL(10,2),
  
  -- Source tracking
  source_project_id UUID, -- Project that created this remnant
  source_cut_id UUID, -- Specific cut operation that created this remnant
  source_stock_length DECIMAL(10,2), -- Original stock length
  
  -- Usage tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_in_project_id UUID, -- Project that used this remnant
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status and quality
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'used', 'expired', 'scrapped')),
  quality TEXT DEFAULT 'good' CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
  
  -- Expiration and value
  expiration_date TIMESTAMPTZ,
  estimated_value DECIMAL(10,2) DEFAULT 0, -- Calculated value based on profile cost
  usage_count INTEGER DEFAULT 0,
  
  -- Identification
  barcode TEXT UNIQUE, -- Generated barcode/QR code identifier
  qr_code_url TEXT, -- URL to QR code image
  
  -- Metadata
  notes TEXT,
  tags TEXT[], -- Array of tags for filtering/searching
  
  -- Constraints
  CONSTRAINT valid_dimensions CHECK (length > 0 AND (width IS NULL OR width > 0)),
  CONSTRAINT valid_value CHECK (estimated_value >= 0)
);

-- 3. Stock Movements Table (Complete audit trail)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  
  -- Movement details
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'in', 'out', 'adjustment', 'remnant_created', 'remnant_used', 
    'transfer', 'return', 'damage', 'loss', 'production'
  )),
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'meters' CHECK (unit IN ('meters', 'pieces', 'kg')),
  
  -- Reference tracking
  project_id UUID, -- Related project if applicable
  remnant_id UUID REFERENCES public.material_remnants(id) ON DELETE SET NULL,
  reference_number TEXT, -- PO number, invoice, etc.
  related_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  
  -- Stock levels before and after
  stock_before DECIMAL(10,2) NOT NULL,
  stock_after DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  notes TEXT,
  reason TEXT, -- Reason for adjustment/movement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 4. Stock Alerts Table (Enhanced)
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'expiring_remnant', 'unused_remnant')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Thresholds and current values
  threshold_value DECIMAL(10,2),
  current_value DECIMAL(10,2) NOT NULL,
  
  -- Status
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Recommendations
  reorder_quantity DECIMAL(10,2), -- Suggested reorder quantity
  reorder_priority TEXT CHECK (reorder_priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Metadata
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 5. Remnant Utilization Analytics Table
CREATE TABLE IF NOT EXISTS public.remnant_utilization_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  
  -- Metrics
  total_remnants_created INTEGER DEFAULT 0,
  total_remnants_used INTEGER DEFAULT 0,
  total_remnant_length DECIMAL(10,2) DEFAULT 0,
  total_remnant_value DECIMAL(10,2) DEFAULT 0,
  utilization_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of remnants used
  waste_reduction DECIMAL(10,2) DEFAULT 0, -- Amount of waste reduced by using remnants
  cost_savings DECIMAL(10,2) DEFAULT 0, -- Cost savings from remnant usage
  
  -- Breakdown by material
  by_material JSONB DEFAULT '{}'::jsonb, -- {aluminum: {count, length, value}, ...}
  
  -- Breakdown by profile
  by_profile JSONB DEFAULT '{}'::jsonb, -- {profile_id: {count, length, value}, ...}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_metrics CHECK (
    utilization_rate >= 0 AND utilization_rate <= 100 AND
    waste_reduction >= 0 AND cost_savings >= 0
  )
);

-- 6. Indexes for Performance
-- Note: Creating indexes on newly created tables - ensure tables are fully created first
CREATE INDEX IF NOT EXISTS idx_inventory_locations_user_id ON public.inventory_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_code ON public.inventory_locations(code);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_default ON public.inventory_locations(user_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_material_remnants_user_id ON public.material_remnants(user_id);
CREATE INDEX IF NOT EXISTS idx_material_remnants_profile_id ON public.material_remnants(profile_id);
CREATE INDEX IF NOT EXISTS idx_material_remnants_status ON public.material_remnants(status);
CREATE INDEX IF NOT EXISTS idx_material_remnants_location ON public.material_remnants(location_id);
CREATE INDEX IF NOT EXISTS idx_material_remnants_available ON public.material_remnants(user_id, status, profile_id) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_material_remnants_expiration ON public.material_remnants(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_remnants_barcode ON public.material_remnants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_remnants_created ON public.material_remnants(created_at);
CREATE INDEX IF NOT EXISTS idx_material_remnants_project ON public.material_remnants(source_project_id, used_in_project_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON public.stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_profile_id ON public.stock_movements(profile_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_project ON public.stock_movements(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_remnant ON public.stock_movements(remnant_id) WHERE remnant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date_range ON public.stock_movements(created_at, user_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_user_id ON public.stock_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_profile_id ON public.stock_alerts(profile_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_type ON public.stock_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_unresolved ON public.stock_alerts(user_id, is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_severity ON public.stock_alerts(severity, created_at);

CREATE INDEX IF NOT EXISTS idx_remnant_analytics_user_id ON public.remnant_utilization_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_remnant_analytics_period ON public.remnant_utilization_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_remnant_analytics_type ON public.remnant_utilization_analytics(period_type, period_start);

-- 7. Update trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Triggers for updated_at
DROP TRIGGER IF EXISTS update_inventory_locations_updated_at ON public.inventory_locations;
CREATE TRIGGER update_inventory_locations_updated_at
  BEFORE UPDATE ON public.inventory_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Function to automatically create remnants from cutting waste
CREATE OR REPLACE FUNCTION create_remnant_from_cut(
  p_user_id UUID,
  p_profile_id UUID,
  p_length DECIMAL,
  p_source_project_id UUID DEFAULT NULL,
  p_source_cut_id UUID DEFAULT NULL,
  p_source_stock_length DECIMAL DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_min_remnant_length DECIMAL DEFAULT 200
)
RETURNS UUID AS $$
DECLARE
  v_remnant_id UUID;
  v_profile_cost DECIMAL;
  v_estimated_value DECIMAL;
  v_barcode TEXT;
BEGIN
  -- Check if remnant is large enough
  IF p_length < p_min_remnant_length THEN
    RETURN NULL;
  END IF;

  -- Get profile cost for value calculation
  SELECT cost_per_meter INTO v_profile_cost
  FROM public.fabricator_profiles
  WHERE id = p_profile_id;

  -- Calculate estimated value (50% of original cost for remnants)
  v_estimated_value := (p_length / 1000) * COALESCE(v_profile_cost, 0) * 0.5;

  -- Generate barcode
  v_barcode := 'RM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 12));

  -- Create remnant
  INSERT INTO public.material_remnants (
    user_id, profile_id, location_id, length, width, height,
    source_project_id, source_cut_id, source_stock_length,
    estimated_value, barcode, status, quality
  ) VALUES (
    p_user_id, p_profile_id, p_location_id, p_length, NULL, NULL,
    p_source_project_id, p_source_cut_id, p_source_stock_length,
    v_estimated_value, v_barcode, 'available', 'good'
  ) RETURNING id INTO v_remnant_id;

  -- Log stock movement
  INSERT INTO public.stock_movements (
    user_id, profile_id, location_id, movement_type, quantity, unit,
    remnant_id, project_id, stock_before, stock_after, reason
  ) VALUES (
    p_user_id, p_profile_id, p_location_id, 'remnant_created', p_length, 'meters',
    v_remnant_id, p_source_project_id, 0, 0, 'Automatic remnant creation from cutting operation'
  );

  RETURN v_remnant_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to use a remnant and update stock
CREATE OR REPLACE FUNCTION use_remnant(
  p_remnant_id UUID,
  p_used_length DECIMAL,
  p_project_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remnant RECORD;
  v_remaining_length DECIMAL;
  v_min_remnant_length DECIMAL := 200;
BEGIN
  -- Get remnant details
  SELECT * INTO v_remnant
  FROM public.material_remnants
  WHERE id = p_remnant_id AND status = 'available';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate remaining length
  v_remaining_length := v_remnant.length - p_used_length;

  -- If remaining is too small, mark as used completely
  IF v_remaining_length < v_min_remnant_length THEN
    UPDATE public.material_remnants
    SET status = 'used',
        used_at = NOW(),
        used_in_project_id = p_project_id,
        usage_count = usage_count + 1
    WHERE id = p_remnant_id;
  ELSE
    -- Update remnant with remaining length
    UPDATE public.material_remnants
    SET length = v_remaining_length,
        used_at = NOW(),
        used_in_project_id = p_project_id,
        usage_count = usage_count + 1,
        estimated_value = (v_remaining_length / 1000) * 
          (SELECT cost_per_meter FROM public.fabricator_profiles WHERE id = v_remnant.profile_id) * 0.5
    WHERE id = p_remnant_id;
  END IF;

  -- Log stock movement
  INSERT INTO public.stock_movements (
    user_id, profile_id, location_id, movement_type, quantity, unit,
    remnant_id, project_id, stock_before, stock_after, reason
  ) VALUES (
    COALESCE(p_user_id, v_remnant.user_id), v_remnant.profile_id, v_remnant.location_id,
    'remnant_used', p_used_length, 'meters',
    p_remnant_id, p_project_id, v_remnant.length, v_remaining_length,
    'Remnant used in project'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. Function to check and create stock alerts
-- Note: Uses dynamic SQL to avoid validation issues during function creation
CREATE OR REPLACE FUNCTION check_stock_levels(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_profile RECORD;
  v_alert_count INTEGER := 0;
  v_alert_type TEXT;
  v_severity TEXT;
  v_reorder_qty DECIMAL;
  v_query TEXT;
BEGIN
  -- Build dynamic query to avoid validation at function creation time
  -- Use format() to properly quote identifiers
  v_query := format('
    SELECT 
      fp.id,
      fp.stock_quantity,
      fp.min_stock_level,
      COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = %L) as remnant_count,
      COALESCE(SUM(mr.length) FILTER (WHERE mr.status = %L), 0) as remnant_length
    FROM %I.%I fp
    LEFT JOIN %I.%I mr ON mr.profile_id = fp.id AND mr.user_id = fp.user_id
    WHERE fp.user_id = $1
    GROUP BY fp.id, fp.stock_quantity, fp.min_stock_level
  ', 'available', 'available', 'public', 'fabricator_profiles', 'public', 'material_remnants');
  
  -- Check all profiles for this user
  FOR v_profile IN EXECUTE v_query USING p_user_id
  LOOP
    -- Check stock level
    IF v_profile.stock_quantity <= 0 THEN
      v_alert_type := 'out_of_stock';
      v_severity := 'critical';
      v_reorder_qty := GREATEST(v_profile.min_stock_level * 2, 100);
    ELSIF v_profile.stock_quantity <= v_profile.min_stock_level THEN
      v_alert_type := 'low_stock';
      v_severity := CASE 
        WHEN v_profile.stock_quantity <= v_profile.min_stock_level * 0.5 THEN 'high'
        ELSE 'medium'
      END;
      v_reorder_qty := v_profile.min_stock_level * 2 - v_profile.stock_quantity;
    ELSE
      CONTINUE; -- Stock is fine
    END IF;

    -- Check if alert already exists and is unresolved
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_alerts
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE
    ) THEN
      INSERT INTO public.stock_alerts (
        user_id, profile_id, alert_type, severity,
        threshold_value, current_value, reorder_quantity, reorder_priority,
        message
      ) VALUES (
        p_user_id, v_profile.id, v_alert_type, v_severity,
        v_profile.min_stock_level, v_profile.stock_quantity, v_reorder_qty,
        CASE v_severity 
          WHEN 'critical' THEN 'urgent'
          WHEN 'high' THEN 'high'
          ELSE 'medium'
        END,
        CASE v_alert_type
          WHEN 'out_of_stock' THEN 'Profile is out of stock. Immediate reorder required.'
          ELSE 'Stock level is below minimum threshold.'
        END
      );
      v_alert_count := v_alert_count + 1;
    ELSE
      -- Update existing alert
      UPDATE public.stock_alerts
      SET current_value = v_profile.stock_quantity,
          reorder_quantity = v_reorder_qty,
          severity = v_severity
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE;
    END IF;
  END LOOP;

  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Function to get remnant consolidation suggestions
-- Note: Uses dynamic SQL to avoid validation issues during function creation
CREATE OR REPLACE FUNCTION get_remnant_consolidation_suggestions(p_user_id UUID, p_profile_id UUID DEFAULT NULL)
RETURNS TABLE (
  profile_id UUID,
  profile_name TEXT,
  small_remnants_count INTEGER,
  total_length DECIMAL,
  suggested_action TEXT,
  estimated_savings DECIMAL
) AS $$
DECLARE
  v_query TEXT;
BEGIN
  -- Build dynamic query to avoid validation at function creation time
  -- Use format() to properly quote identifiers
  v_query := format('
    SELECT 
      fp.id,
      fp.name,
      COUNT(mr.id)::INTEGER as small_remnants_count,
      COALESCE(SUM(mr.length), 0) as total_length,
      CASE
        WHEN COUNT(mr.id) >= 5 AND COALESCE(SUM(mr.length), 0) >= 1000 THEN
          ''Consider consolidating '' || COUNT(mr.id) || '' small remnants into usable stock''
        WHEN COUNT(mr.id) >= 3 AND COALESCE(SUM(mr.length), 0) >= 500 THEN
          ''Multiple small remnants available - consider combining''
        ELSE
          ''Monitor for consolidation opportunities''
      END as suggested_action,
      (COALESCE(SUM(mr.length), 0) / 1000) * fp.cost_per_meter * 0.3 as estimated_savings
    FROM %I.%I fp
    LEFT JOIN %I.%I mr ON 
      mr.profile_id = fp.id 
      AND mr.user_id = fp.user_id
      AND mr.status = %L
      AND mr.length < 500
    WHERE fp.user_id = $1
      AND ($2 IS NULL OR fp.id = $2)
    GROUP BY fp.id, fp.name, fp.cost_per_meter
    HAVING COUNT(mr.id) >= 2
    ORDER BY small_remnants_count DESC, total_length DESC
  ', 'public', 'fabricator_profiles', 'public', 'material_remnants', 'available');
  
  RETURN QUERY EXECUTE v_query USING p_user_id, p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- 13. Row Level Security Policies
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_remnants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remnant_utilization_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_locations
DROP POLICY IF EXISTS "Users can view their own locations" ON public.inventory_locations;
CREATE POLICY "Users can view their own locations" ON public.inventory_locations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own locations" ON public.inventory_locations;
CREATE POLICY "Users can insert their own locations" ON public.inventory_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own locations" ON public.inventory_locations;
CREATE POLICY "Users can update their own locations" ON public.inventory_locations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own locations" ON public.inventory_locations;
CREATE POLICY "Users can delete their own locations" ON public.inventory_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for material_remnants
DROP POLICY IF EXISTS "Users can view their own remnants" ON public.material_remnants;
CREATE POLICY "Users can view their own remnants" ON public.material_remnants
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own remnants" ON public.material_remnants;
CREATE POLICY "Users can insert their own remnants" ON public.material_remnants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own remnants" ON public.material_remnants;
CREATE POLICY "Users can update their own remnants" ON public.material_remnants
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own remnants" ON public.material_remnants;
CREATE POLICY "Users can delete their own remnants" ON public.material_remnants
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for stock_movements
DROP POLICY IF EXISTS "Users can view their own stock movements" ON public.stock_movements;
CREATE POLICY "Users can view their own stock movements" ON public.stock_movements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stock movements" ON public.stock_movements;
CREATE POLICY "Users can insert their own stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for stock_alerts
DROP POLICY IF EXISTS "Users can view their own stock alerts" ON public.stock_alerts;
CREATE POLICY "Users can view their own stock alerts" ON public.stock_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stock alerts" ON public.stock_alerts;
CREATE POLICY "Users can update their own stock alerts" ON public.stock_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for remnant_utilization_analytics
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.remnant_utilization_analytics;
CREATE POLICY "Users can view their own analytics" ON public.remnant_utilization_analytics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.remnant_utilization_analytics;
CREATE POLICY "Users can insert their own analytics" ON public.remnant_utilization_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 14. Comments for documentation
COMMENT ON TABLE public.inventory_locations IS 'Multi-location inventory support for tracking stock across different warehouses and locations';
COMMENT ON TABLE public.material_remnants IS 'Tracks leftover materials from cutting operations with smart matching and utilization tracking';
COMMENT ON TABLE public.stock_movements IS 'Complete audit trail of all stock movements including in, out, adjustments, and remnant operations';
COMMENT ON TABLE public.stock_alerts IS 'Automated stock alerts with reorder suggestions and priority levels';
COMMENT ON TABLE public.remnant_utilization_analytics IS 'Analytics and reporting for remnant utilization, waste reduction, and cost savings';

COMMENT ON FUNCTION create_remnant_from_cut IS 'Automatically creates a remnant from cutting waste if it meets minimum length requirements';
COMMENT ON FUNCTION use_remnant IS 'Marks a remnant as used and updates its status, creating stock movement log';
COMMENT ON FUNCTION check_stock_levels IS 'Checks all profiles for a user and creates/updates stock alerts as needed';
COMMENT ON FUNCTION get_remnant_consolidation_suggestions IS 'Suggests consolidation opportunities for small remnants that could be combined';
