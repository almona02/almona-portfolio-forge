-- Cleanup script for partial migration 006
-- Run this if migration 006 failed partway through
-- This will drop all objects created by migration 006 so you can start fresh

-- Drop functions first (they may depend on tables)
DROP FUNCTION IF EXISTS public.create_remnant_from_cut(UUID, UUID, DECIMAL, UUID, UUID, DECIMAL, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.use_remnant(UUID, DECIMAL, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_stock_levels(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_remnant_consolidation_suggestions(UUID, UUID) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_inventory_locations_updated_at ON public.inventory_locations;
DROP TRIGGER IF EXISTS update_material_remnants_updated_at ON public.material_remnants;
DROP TRIGGER IF EXISTS update_stock_movements_updated_at ON public.stock_movements;
DROP TRIGGER IF EXISTS update_stock_alerts_updated_at ON public.stock_alerts;
DROP TRIGGER IF EXISTS update_remnant_analytics_updated_at ON public.remnant_utilization_analytics;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Users can insert their own locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Users can update their own locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Users can delete their own locations" ON public.inventory_locations;

DROP POLICY IF EXISTS "Users can view their own remnants" ON public.material_remnants;
DROP POLICY IF EXISTS "Users can insert their own remnants" ON public.material_remnants;
DROP POLICY IF EXISTS "Users can update their own remnants" ON public.material_remnants;
DROP POLICY IF EXISTS "Users can delete their own remnants" ON public.material_remnants;

DROP POLICY IF EXISTS "Users can view their own stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can insert their own stock movements" ON public.stock_movements;

DROP POLICY IF EXISTS "Users can view their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Users can update their own stock alerts" ON public.stock_alerts;

DROP POLICY IF EXISTS "Users can view their own analytics" ON public.remnant_utilization_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.remnant_utilization_analytics;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.remnant_utilization_analytics CASCADE;
DROP TABLE IF EXISTS public.stock_alerts CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.material_remnants CASCADE;
DROP TABLE IF EXISTS public.inventory_locations CASCADE;

-- Note: This will also drop all indexes automatically
-- The migration will recreate everything from scratch

SELECT 'Cleanup complete. You can now run migration 006 again.' as status;

