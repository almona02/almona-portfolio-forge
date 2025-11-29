-- Migration 012: Fix Performance Indexes
-- Addresses unindexed foreign keys and documents unused indexes
-- ============================================================================

-- Fix 1: Add indexes for unindexed foreign keys
-- Foreign keys without indexes can cause performance issues during:
-- - DELETE operations on referenced tables (cascade checks)
-- - JOIN operations
-- - UPDATE operations on foreign key columns

-- fabricator_backup_operations.source_backup_id
CREATE INDEX IF NOT EXISTS idx_fabricator_backup_operations_source_backup_id 
ON public.fabricator_backup_operations(source_backup_id)
WHERE source_backup_id IS NOT NULL;

-- fabricator_customers.owner_user_id
CREATE INDEX IF NOT EXISTS idx_fabricator_customers_owner_user_id 
ON public.fabricator_customers(owner_user_id);

-- fabricator_positions.owner_user_id
CREATE INDEX IF NOT EXISTS idx_fabricator_positions_owner_user_id 
ON public.fabricator_positions(owner_user_id);

-- fabricator_project_members.member_profile_id
CREATE INDEX IF NOT EXISTS idx_fabricator_project_members_member_profile_id 
ON public.fabricator_project_members(member_profile_id);

-- fabricator_system_packs.owner_user_id
CREATE INDEX IF NOT EXISTS idx_fabricator_system_packs_owner_user_id 
ON public.fabricator_system_packs(owner_user_id);

-- fabricator_team_members.member_profile_id
CREATE INDEX IF NOT EXISTS idx_fabricator_team_members_member_profile_id 
ON public.fabricator_team_members(member_profile_id);

-- inventory_logs.user_id
CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id 
ON public.inventory_logs(user_id)
WHERE user_id IS NOT NULL;

-- price_history.changed_by
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by 
ON public.price_history(changed_by)
WHERE changed_by IS NOT NULL;

-- price_validation_alerts.resolved_by
CREATE INDEX IF NOT EXISTS idx_price_validation_alerts_resolved_by 
ON public.price_validation_alerts(resolved_by)
WHERE resolved_by IS NOT NULL;

-- stock_alerts.acknowledged_by
CREATE INDEX IF NOT EXISTS idx_stock_alerts_acknowledged_by 
ON public.stock_alerts(acknowledged_by)
WHERE acknowledged_by IS NOT NULL;

-- stock_alerts.resolved_by
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved_by 
ON public.stock_alerts(resolved_by)
WHERE resolved_by IS NOT NULL;

-- stock_movements.created_by
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by 
ON public.stock_movements(created_by)
WHERE created_by IS NOT NULL;

-- stock_movements.location_id
CREATE INDEX IF NOT EXISTS idx_stock_movements_location_id 
ON public.stock_movements(location_id)
WHERE location_id IS NOT NULL;

-- stock_movements.related_movement_id
CREATE INDEX IF NOT EXISTS idx_stock_movements_related_movement_id 
ON public.stock_movements(related_movement_id)
WHERE related_movement_id IS NOT NULL;

-- Fix 2: Add composite indexes for common query patterns
-- These optimize frequently executed queries from the application

-- Optimize: SELECT * FROM fabricator_profiles WHERE user_id = X ORDER BY created_at DESC
-- This query is called 61,190 times (2.4% of total time)
-- The composite index allows efficient filtering and sorting
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_created_desc 
ON public.fabricator_profiles(user_id, created_at DESC);

-- Optimize: SELECT * FROM stock_movements WHERE user_id = X ORDER BY created_at DESC
-- Used in InventoryDashboard for loading stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created_desc 
ON public.stock_movements(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Optimize: get_remnant_consolidation_suggestions function
-- This function is called 42,213 times (2.0% of total time)
-- It does: LEFT JOIN material_remnants ON profile_id, user_id, status='available', length < 500
-- Composite index for efficient JOIN and filtering
CREATE INDEX IF NOT EXISTS idx_material_remnants_profile_user_status_length 
ON public.material_remnants(profile_id, user_id, status, length)
WHERE status = 'available' AND length < 500;

-- Additional index for material_remnants queries by user_id and status
CREATE INDEX IF NOT EXISTS idx_material_remnants_user_status 
ON public.material_remnants(user_id, status)
WHERE status = 'available';

-- Optimize: getAvailableRemnants query pattern
-- Query: SELECT * FROM material_remnants WHERE user_id = X AND status = 'available' ORDER BY created_at DESC
-- Used in RemnantManager.getAvailableRemnants()
CREATE INDEX IF NOT EXISTS idx_material_remnants_user_status_created_desc 
ON public.material_remnants(user_id, status, created_at DESC)
WHERE status = 'available';

-- Fix 3: Note about unused indexes
-- The linter reports many indexes as "unused", but this doesn't mean they should be removed:
-- 1. Indexes may be used by queries that haven't been executed yet
-- 2. Indexes may be used for future features
-- 3. Indexes may be used by application code that hasn't been analyzed
-- 4. Partial indexes (with WHERE clauses) may be used conditionally
-- 5. GIN/GiST indexes for full-text search may be used by search functions
--
-- Before removing any index, verify:
-- - Check query plans for actual usage
-- - Review application code for queries that might use them
-- - Consider if they're needed for future features
-- - Monitor database performance after removal
--
-- If you want to remove unused indexes, do so carefully and monitor performance.
-- Example removal (commented out for safety):
-- DROP INDEX IF EXISTS public.idx_user_addresses_user_id;
-- DROP INDEX IF EXISTS public.idx_spare_parts_active;
-- etc.

-- Success message
SELECT 'Performance indexes added: Foreign keys now have covering indexes' as message;

