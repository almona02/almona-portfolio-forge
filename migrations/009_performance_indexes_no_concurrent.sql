/**
 * Performance Indexes Migration (Without CONCURRENTLY)
 * ---------------------------------------------------------------------------
 * 
 * ✅ USE THIS FILE FOR SUPABASE SQL EDITOR
 * 
 * Supabase SQL Editor automatically wraps all SQL in transactions,
 * which prevents CREATE INDEX CONCURRENTLY from working.
 * 
 * This version removes CONCURRENTLY so it works in Supabase SQL Editor.
 * 
 * WARNING: This will lock tables during index creation.
 * 
 * When to use:
 * - ✅ Supabase SQL Editor (recommended)
 * - ✅ Development/testing environments
 * - ✅ Maintenance windows in production
 * - ✅ Small tables (< 100k rows) - locks are brief
 * 
 * When NOT to use:
 * - ❌ Large production tables during peak hours
 * - ❌ If you need zero-downtime (use psql with CONCURRENTLY instead)
 * 
 * Estimated time: 5-10 minutes total (depending on table sizes)
 * Table locks: Brief (seconds to minutes per index)
 */

-- ============================================================================
-- Profile Queries Optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_project_id 
ON profiles(project_id) 
WHERE project_id IS NOT NULL;

COMMENT ON INDEX idx_profiles_project_id IS 
'Optimizes queries filtering profiles by project_id (non-null only)';

-- ============================================================================
-- Inventory Performance for Remnant-Aware Optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inventory_remnants 
ON inventory(profile_id, remnant_length, width, created_at) 
WHERE remnant_length > 0;

COMMENT ON INDEX idx_inventory_remnants IS 
'Optimizes remnant queries: profile_id + length filtering + date sorting (remnants only)';

-- ============================================================================
-- Optimization Results Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_optimization_results 
ON optimization_results(project_id, algorithm_type, created_at DESC);

COMMENT ON INDEX idx_optimization_results IS 
'Optimizes optimization result queries: project + algorithm type + latest first';

-- ============================================================================
-- Real-Time Dashboard Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC) 
WHERE status NOT IN ('cancelled');

COMMENT ON INDEX idx_orders_created_at IS 
'Optimizes dashboard order queries: latest first, excludes cancelled orders';

CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON orders(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

COMMENT ON INDEX idx_orders_customer_created IS 
'Optimizes customer portal order history queries';

-- ============================================================================
-- Service Tickets Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_tickets_customer 
ON service_tickets(customer_id, created_at DESC, status);

COMMENT ON INDEX idx_service_tickets_customer IS 
'Optimizes customer portal ticket queries: customer + date + status filtering';

CREATE INDEX IF NOT EXISTS idx_service_tickets_status_created 
ON service_tickets(status, created_at DESC) 
WHERE status IN ('open', 'in_progress', 'pending');

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

CREATE INDEX IF NOT EXISTS idx_quotes_customer_created 
ON quotes(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

COMMENT ON INDEX idx_quotes_customer_created IS 
'Optimizes customer portal quote history queries';

-- ============================================================================
-- Fabricator-Specific Indexes
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

CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_type 
ON fabricator_accessories(user_id, type, updated_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_fabricator_accessories_user_type IS 
'Optimizes accessory queries: user + type filtering + latest updates';

-- ============================================================================
-- Workspace Snapshots Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_user_created 
ON workspace_snapshots(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_workspace_snapshots_user_created IS 
'Optimizes workspace snapshot queries: user + latest snapshot first';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

