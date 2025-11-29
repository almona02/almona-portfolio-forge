/**
 * Performance Indexes Migration
 * ---------------------------------------------------------------------------
 * Creates optimized indexes for common Fabricator and portal queries
 * 
 * These indexes target:
 * - Profile queries (project associations)
 * - Inventory remnant queries (optimization performance)
 * - Optimization result retrieval
 * - Real-time dashboard queries (orders, tickets, quotes)
 * 
 * IMPORTANT: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
 * 
 * RUNNING INSTRUCTIONS:
 * 
 * Option 1: Run each index separately (Recommended for Supabase SQL Editor)
 *   - Copy and paste each CREATE INDEX statement one at a time
 *   - Execute each one individually
 *   - This allows CONCURRENTLY to work properly
 * 
 * Option 2: Use psql command line (if you have access)
 *   - Run the entire file: psql -f 009_performance_indexes.sql
 *   - Or use: \i 009_performance_indexes.sql
 * 
 * Option 3: Remove CONCURRENTLY (Development/Testing only)
 *   - Use the alternative file: 009_performance_indexes_no_concurrent.sql
 *   - WARNING: This will lock tables during index creation
 *   - Only use in development or during maintenance windows
 * 
 * All indexes use CONCURRENTLY to avoid locking tables during creation
 */

-- ============================================================================
-- Profile Queries Optimization
-- ============================================================================
-- 
-- ⚠️ IMPORTANT: Run each CREATE INDEX statement SEPARATELY in Supabase SQL Editor
-- CONCURRENTLY cannot run inside a transaction block
-- 
-- Alternative: Use 009_performance_indexes_no_concurrent.sql for development
-- or 009_performance_indexes_individual.sql for step-by-step execution
-- ============================================================================

-- Index for profiles associated with projects
-- Used in: Project detail views, profile selection dropdowns
-- Run this statement individually:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_project_id 
ON profiles(project_id) 
WHERE project_id IS NOT NULL;

COMMENT ON INDEX idx_profiles_project_id IS 
'Optimizes queries filtering profiles by project_id (non-null only)';

-- ============================================================================
-- Inventory Performance for Remnant-Aware Optimization
-- ============================================================================

-- Composite index for remnant queries
-- Used in: RemnantManager.optimizeWithRemnants(), InventoryDashboard remnant analytics
-- Covers: profile_id lookup, remnant length filtering, date sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_remnants 
ON inventory(profile_id, remnant_length, width, created_at) 
WHERE remnant_length > 0;

COMMENT ON INDEX idx_inventory_remnants IS 
'Optimizes remnant queries: profile_id + length filtering + date sorting (remnants only)';

-- Alternative: If inventory table structure differs, adjust column names
-- Example for fabricator_profiles with remnant tracking:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fabricator_profiles_remnants
-- ON fabricator_profiles(profile_id, stock_quantity, updated_at)
-- WHERE stock_quantity > 0 AND specifications->>'remnant' = 'true';

-- ============================================================================
-- Optimization Results Performance
-- ============================================================================

-- Index for optimization result retrieval
-- Used in: CuttingOptimizationEngine result caching, MassProductionOptimizer baseline lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_optimization_results 
ON optimization_results(project_id, algorithm_type, created_at DESC);

COMMENT ON INDEX idx_optimization_results IS 
'Optimizes optimization result queries: project + algorithm type + latest first';

-- If optimization_results table doesn't exist, this will fail gracefully
-- Adjust table name if using different schema (e.g., fabricator_optimizations)

-- ============================================================================
-- Real-Time Dashboard Performance
-- ============================================================================

-- Index for orders dashboard queries
-- Used in: AdminDashboard recent orders, CustomerPortal order history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC) 
WHERE status NOT IN ('cancelled');

COMMENT ON INDEX idx_orders_created_at IS 
'Optimizes dashboard order queries: latest first, excludes cancelled orders';

-- Index for orders by customer (if not exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_created 
ON orders(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

COMMENT ON INDEX idx_orders_customer_created IS 
'Optimizes customer portal order history queries';

-- ============================================================================
-- Service Tickets Performance
-- ============================================================================

-- Index for service ticket customer queries
-- Used in: CustomerPortal ticket history, ServiceTicketList filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_tickets_customer 
ON service_tickets(customer_id, created_at DESC, status);

COMMENT ON INDEX idx_service_tickets_customer IS 
'Optimizes customer portal ticket queries: customer + date + status filtering';

-- Index for service tickets by status (for admin dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_tickets_status_created 
ON service_tickets(status, created_at DESC) 
WHERE status IN ('open', 'in_progress', 'pending');

COMMENT ON INDEX idx_service_tickets_status_created IS 
'Optimizes admin dashboard ticket queries: active tickets by status';

-- ============================================================================
-- Quote Performance
-- ============================================================================

-- Index for quote digital twin lookups
-- Used in: QuoteTwinSearchPanel, portal_quote_lookup() function
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_digital_twin 
ON quotes(digital_twin_code, created_at DESC) 
WHERE digital_twin_code IS NOT NULL;

COMMENT ON INDEX idx_quotes_digital_twin IS 
'Optimizes quote twin code lookups for customer portal search';

-- Index for quotes by customer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_customer_created 
ON quotes(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

COMMENT ON INDEX idx_quotes_customer_created IS 
'Optimizes customer portal quote history queries';

-- ============================================================================
-- Fabricator-Specific Indexes
-- ============================================================================

-- Index for fabricator_profiles by user and system brand
-- Used in: ProfileManagement filtering, InventoryDashboard system pack filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fabricator_profiles_user_brand 
ON fabricator_profiles(user_id, system_brand, updated_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_fabricator_profiles_user_brand IS 
'Optimizes profile queries: user + system brand filtering + latest updates';

-- Index for fabricator_profiles stock alerts
-- Used in: InventoryDashboard low stock alerts, stock_alerts RPC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fabricator_profiles_stock_alerts 
ON fabricator_profiles(user_id, stock_quantity, min_stock_level) 
WHERE stock_quantity <= min_stock_level AND min_stock_level > 0;

COMMENT ON INDEX idx_fabricator_profiles_stock_alerts IS 
'Optimizes low stock alert queries: finds profiles below minimum stock level';

-- Index for fabricator_accessories by user and type
-- Used in: AccessoryManagement filtering, compatibility matrix queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fabricator_accessories_user_type 
ON fabricator_accessories(user_id, type, updated_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_fabricator_accessories_user_type IS 
'Optimizes accessory queries: user + type filtering + latest updates';

-- ============================================================================
-- Workspace Snapshots Performance
-- ============================================================================

-- Index for workspace snapshot retrieval
-- Used in: WorkspaceSyncService.loadWorkspaceSnapshot()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_snapshots_user_created 
ON workspace_snapshots(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_workspace_snapshots_user_created IS 
'Optimizes workspace snapshot queries: user + latest snapshot first';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Run these to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles' AND indexname LIKE 'idx_%';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'inventory' AND indexname LIKE 'idx_%';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE 'idx_%';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'service_tickets' AND indexname LIKE 'idx_%';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'quotes' AND indexname LIKE 'idx_%';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'fabricator_profiles' AND indexname LIKE 'idx_%';

-- ============================================================================
-- Notes
-- ============================================================================

/**
 * IMPORTANT NOTES:
 * 
 * 1. CONCURRENTLY: All indexes use CONCURRENTLY to avoid table locking.
 *    This is safe for production but may take longer to create.
 * 
 * 2. Partial Indexes: Many indexes use WHERE clauses to create partial indexes.
 *    This reduces index size and improves performance for filtered queries.
 * 
 * 3. Table Names: Adjust table names if your schema differs:
 *    - If using 'fabricator_inventory' instead of 'inventory'
 *    - If optimization results are stored differently
 *    - If workspace snapshots use a different table name
 * 
 * 4. Column Names: Verify column names match your schema:
 *    - Check if 'remnant_length' exists in inventory table
 *    - Verify 'digital_twin_code' column exists in quotes
 *    - Confirm 'system_brand' exists in fabricator_profiles
 * 
 * 5. Index Maintenance: Monitor index usage with:
 *    SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
 *    FROM pg_stat_user_indexes
 *    WHERE indexname LIKE 'idx_%'
 *    ORDER BY idx_scan DESC;
 * 
 * 6. Index Size: Check index sizes with:
 *    SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
 *    FROM pg_stat_user_indexes
 *    WHERE indexname LIKE 'idx_%'
 *    ORDER BY pg_relation_size(indexrelid) DESC;
 * 
 * 7. Rollback: To remove indexes if needed:
 *    DROP INDEX CONCURRENTLY IF EXISTS idx_profiles_project_id;
 *    DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_remnants;
 *    -- (repeat for each index)
 */

