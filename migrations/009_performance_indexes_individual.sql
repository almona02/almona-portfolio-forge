/**
 * Performance Indexes Migration - Individual Statements
 * ---------------------------------------------------------------------------
 * 
 * ⚠️ IMPORTANT: Supabase SQL Editor wraps ALL statements in transactions,
 * so CONCURRENTLY will NOT work even when running statements individually.
 * 
 * This file has been updated to work in Supabase SQL Editor by removing CONCURRENTLY.
 * 
 * RECOMMENDED: Use 009_performance_indexes_SUPABASE.sql instead (it's the same but cleaner)
 * 
 * Run each statement ONE AT A TIME in Supabase SQL Editor.
 */

-- ============================================================================
-- 1. Material Remnants Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_material_remnants_profile_status 
ON material_remnants(profile_id, status, length, created_at DESC) 
WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_material_remnants_user_created 
ON material_remnants(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_remnants_length_status 
ON material_remnants(length, status, profile_id) 
WHERE status = 'available' AND length > 0;

-- ============================================================================
-- 2. Real-Time Dashboard Performance - Orders
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC) 
WHERE status NOT IN ('cancelled');

CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- ============================================================================
-- 3. Service Tickets Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_tickets_user_created 
ON service_tickets(user_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_service_tickets_status_created 
ON service_tickets(status, created_at DESC) 
WHERE status IN ('open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_customer', 'pending_approval');

-- ============================================================================
-- 4. Quote Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_digital_twin 
ON quotes(digital_twin_code, created_at DESC) 
WHERE digital_twin_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_user_created 
ON quotes(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- ============================================================================
-- 5. Fabricator-Specific Indexes - Profiles
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_brand 
ON fabricator_profiles(user_id, system_brand, updated_at DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_stock_alerts 
ON fabricator_profiles(user_id, stock_quantity, min_stock_level) 
WHERE stock_quantity <= min_stock_level AND min_stock_level > 0;

-- ============================================================================
-- 6. Fabricator-Specific Indexes - Accessories
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_type 
ON fabricator_accessories(user_id, type, updated_at DESC) 
WHERE user_id IS NOT NULL;

-- ============================================================================
-- 7. Workspace Snapshots Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_last_modified 
ON workspace_snapshots(last_modified DESC);

-- ============================================================================
-- 8. Stock Movements Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created 
ON stock_movements(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_profile_created 
ON stock_movements(profile_id, created_at DESC) 
WHERE profile_id IS NOT NULL;

-- ============================================================================
-- Verification (Run this after all indexes are created)
-- ============================================================================

SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY relname, indexrelname;

