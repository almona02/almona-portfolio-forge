/**
 * Performance Indexes Migration - FOR SUPABASE SQL EDITOR
 * ---------------------------------------------------------------------------
 * 
 * ✅ USE THIS FILE IN SUPABASE SQL EDITOR
 * 
 * Supabase SQL Editor automatically wraps all SQL in transactions,
 * which prevents CREATE INDEX CONCURRENTLY from working.
 * 
 * This version removes CONCURRENTLY so it works in Supabase SQL Editor.
 * 
 * INSTRUCTIONS:
 * 1. Open Supabase SQL Editor
 * 2. Copy this ENTIRE file
 * 3. Paste and execute
 * 4. Wait for completion (5-10 minutes depending on table sizes)
 * 
 * WARNING: This will briefly lock tables during index creation.
 * For small-medium tables, this is usually fine (< 1 minute per index).
 * For very large tables, consider running during off-peak hours.
 * 
 * Estimated time: 5-10 minutes total
 */

-- ============================================================================
-- Material Remnants Performance (Remnant-Aware Optimization)
-- ============================================================================

-- Index for remnant queries by profile and status
CREATE INDEX IF NOT EXISTS idx_material_remnants_profile_status 
ON material_remnants(profile_id, status, length, created_at DESC) 
WHERE status = 'available';

COMMENT ON INDEX idx_material_remnants_profile_status IS 
'Optimizes remnant queries: profile + available status + length + date sorting';

-- Index for remnant queries by user
CREATE INDEX IF NOT EXISTS idx_material_remnants_user_created 
ON material_remnants(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_material_remnants_user_created IS 
'Optimizes user remnant queries: user + latest remnants first';

-- Index for remnant length filtering (for optimization matching)
CREATE INDEX IF NOT EXISTS idx_material_remnants_length_status 
ON material_remnants(length, status, profile_id) 
WHERE status = 'available' AND length > 0;

COMMENT ON INDEX idx_material_remnants_length_status IS 
'Optimizes remnant matching by length for cutting optimization';

-- ============================================================================
-- Real-Time Dashboard Performance - Orders
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC) 
WHERE status NOT IN ('cancelled');

COMMENT ON INDEX idx_orders_created_at IS 
'Optimizes dashboard order queries: latest first, excludes cancelled orders';

CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_orders_user_created IS 
'Optimizes customer portal order history queries';

-- ============================================================================
-- Service Tickets Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_tickets_user_created 
ON service_tickets(user_id, created_at DESC, status);

COMMENT ON INDEX idx_service_tickets_user_created IS 
'Optimizes customer portal ticket queries: user + date + status filtering';

CREATE INDEX IF NOT EXISTS idx_service_tickets_status_created 
ON service_tickets(status, created_at DESC) 
WHERE status IN ('open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_customer', 'pending_approval');

COMMENT ON INDEX idx_service_tickets_status_created IS 
'Optimizes admin dashboard ticket queries: active tickets by status';

-- ============================================================================
-- Quote Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_digital_twin 
ON quotes(digital_twin_code, created_at DESC) 
WHERE digital_twin_code IS NOT NULL;

COMMENT ON INDEX idx_quotes_digital_twin IS 
'Optimizes quote twin code lookups for customer portal search';

CREATE INDEX IF NOT EXISTS idx_quotes_user_created 
ON quotes(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_quotes_user_created IS 
'Optimizes customer portal quote history queries';

-- ============================================================================
-- Fabricator-Specific Indexes - Profiles
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_brand 
ON fabricator_profiles(user_id, system_brand, updated_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_fabricator_profiles_user_brand IS 
'Optimizes profile queries: user + system brand filtering + latest updates';

CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_stock_alerts 
ON fabricator_profiles(user_id, stock_quantity, min_stock_level) 
WHERE stock_quantity <= min_stock_level AND min_stock_level > 0;

COMMENT ON INDEX idx_fabricator_profiles_stock_alerts IS 
'Optimizes low stock alert queries: finds profiles below minimum stock level';

-- ============================================================================
-- Fabricator-Specific Indexes - Accessories
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_type 
ON fabricator_accessories(user_id, type, updated_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_fabricator_accessories_user_type IS 
'Optimizes accessory queries: user + type filtering + latest updates';

-- ============================================================================
-- Workspace Snapshots Performance
-- ============================================================================

-- Note: workspace_snapshots uses user_id as PRIMARY KEY, so this index may be redundant
-- but it's kept for consistency and potential future schema changes
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_last_modified 
ON workspace_snapshots(last_modified DESC);

COMMENT ON INDEX idx_workspace_snapshots_last_modified IS 
'Optimizes workspace snapshot queries: latest modified first';

-- ============================================================================
-- Stock Movements Performance
-- ============================================================================

-- Index for stock movement queries by user and date
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created 
ON stock_movements(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_stock_movements_user_created IS 
'Optimizes stock movement history queries: user + latest first';

-- Index for stock movements by profile
CREATE INDEX IF NOT EXISTS idx_stock_movements_profile_created 
ON stock_movements(profile_id, created_at DESC) 
WHERE profile_id IS NOT NULL;

COMMENT ON INDEX idx_stock_movements_profile_created IS 
'Optimizes stock movement queries by profile';

-- ============================================================================
-- Verification (Run this after indexes are created)
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

