-- =====================================================
-- RLS OPTIMIZATION MIGRATION
-- Converts expensive table queries to JWT claims
-- Expected Performance Gain: 10-50x faster on admin checks
-- =====================================================

-- CRITICAL: Before running this migration:
-- 1. Ensure users have role set in JWT claims (app_metadata)
-- 2. Test on staging environment first
-- 3. Run during low-traffic period

BEGIN;

-- =====================================================
-- PHASE 1: DROP EXPENSIVE POLICIES (Profiles Table Queries)
-- =====================================================

-- E-commerce System
DROP POLICY IF EXISTS "Admins can manage all data" ON products;
DROP POLICY IF EXISTS "Admins can manage all quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;

-- Inventory System
DROP POLICY IF EXISTS "auth_admins_view_logs" ON inventory_logs;
DROP POLICY IF EXISTS "auth_admins_manage_reservations" ON inventory_reservations;

-- After Sales System
DROP POLICY IF EXISTS "Admins can view all security events" ON security_events;
DROP POLICY IF EXISTS "Admins can view all safety logs" ON cnc_safety_logs;
DROP POLICY IF EXISTS "Authenticated users can view maintenance logs" ON predictive_maintenance_logs;

-- Fabricator System
DROP POLICY IF EXISTS "auth_view_price_history" ON price_history;

-- Marketplace
DROP POLICY IF EXISTS "Admins can view optimizer leads" ON optimizer_leads;
DROP POLICY IF EXISTS "Admins can manage spare parts" ON spare_parts;
DROP POLICY IF EXISTS "Admins manage all used_machines" ON used_machines;

-- User Management
DROP POLICY IF EXISTS "auth_manage_addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can view workshops they belong to" ON workshops;

-- Audit
DROP POLICY IF EXISTS "Admins can view audit signatures" ON audit_signatures;

-- ERP
DROP POLICY IF EXISTS "Users can view own transaction logs" ON erp_transaction_log;

-- =====================================================
-- PHASE 2: CREATE OPTIMIZED POLICIES (JWT Claims)
-- =====================================================

-- E-commerce System
CREATE POLICY "admins_manage_products_jwt" ON products
FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin' 
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

CREATE POLICY "admins_manage_quotes_jwt" ON quotes
FOR ALL USING (
    (auth.jwt() ->> 'role') IN ('admin', 'sales_rep')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'sales_rep')
);

CREATE POLICY "admins_manage_orders_jwt" ON orders
FOR ALL USING (
    (auth.jwt() ->> 'role') IN ('admin', 'sales_rep')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'sales_rep')
);

-- Inventory System
CREATE POLICY "admins_view_inventory_logs_jwt" ON inventory_logs
FOR SELECT USING (
    (auth.jwt() ->> 'role') IN ('admin', 'sales_rep')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'sales_rep')
);

CREATE POLICY "admins_manage_reservations_jwt" ON inventory_reservations
FOR ALL USING (
    (auth.jwt() ->> 'role') IN ('admin', 'sales_rep')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'sales_rep')
);

-- After Sales System
CREATE POLICY "admins_view_security_events_jwt" ON security_events
FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

CREATE POLICY "admins_view_safety_logs_jwt" ON cnc_safety_logs
FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

CREATE POLICY "staff_view_maintenance_logs_jwt" ON predictive_maintenance_logs
FOR SELECT USING (
    (auth.jwt() ->> 'role') IN ('admin', 'technician')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'technician')
);

-- Fabricator System
CREATE POLICY "users_view_price_history_jwt" ON price_history
FOR SELECT USING (
    changed_by = auth.uid() 
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

-- Marketplace
CREATE POLICY "admins_view_optimizer_leads_jwt" ON optimizer_leads
FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

CREATE POLICY "admins_manage_spare_parts_jwt" ON spare_parts
FOR ALL USING (
    (auth.jwt() ->> 'role') IN ('admin', 'sales_rep')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'sales_rep')
);

CREATE POLICY "admins_manage_used_machines_jwt" ON used_machines
FOR ALL USING (
    (auth.jwt() ->> 'role') IN ('admin', 'sales_rep')
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'sales_rep')
);

-- User Management
CREATE POLICY "users_manage_addresses_jwt" ON user_addresses
FOR ALL USING (
    user_id = auth.uid() 
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

CREATE POLICY "users_view_workshops_jwt" ON workshops
FOR SELECT USING (
    owner_id = auth.uid()
    OR (auth.jwt() ->> 'workshop_id')::uuid = id
);

-- Audit
CREATE POLICY "admins_view_audit_signatures_jwt" ON audit_signatures
FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

-- ERP (Combined policy)
CREATE POLICY "users_view_transaction_logs_jwt" ON erp_transaction_log
FOR SELECT USING (
    -- User owns the quote
    EXISTS (SELECT 1 FROM quotes q WHERE q.id = erp_transaction_log.quote_id AND q.user_id = auth.uid())
    -- OR user is admin (using JWT)
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin'
);

-- =====================================================
-- PHASE 3: VERIFY OPTIMIZATION
-- =====================================================

-- Check that all new policies are created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname LIKE '%_jwt';
    
    RAISE NOTICE 'Created % JWT-optimized policies', policy_count;
    
    IF policy_count < 14 THEN
        RAISE EXCEPTION 'Expected at least 14 JWT policies, found %', policy_count;
    END IF;
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =====================================================

-- 1. Check optimization status
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.jwt()%' THEN '✅ Optimized'
        WHEN qual LIKE '%EXISTS%SELECT%profiles%' THEN '⚠️ Still needs optimization'
        ELSE '❓ Review'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'products', 'quotes', 'orders', 'inventory_logs', 'inventory_reservations',
    'security_events', 'cnc_safety_logs', 'predictive_maintenance_logs',
    'price_history', 'optimizer_leads', 'spare_parts', 'used_machines',
    'user_addresses', 'workshops', 'audit_signatures', 'erp_transaction_log'
)
ORDER BY tablename, policyname;

-- 2. Count optimized vs unoptimized
SELECT 
    CASE 
        WHEN qual LIKE '%auth.jwt()%' THEN 'Optimized (JWT)'
        WHEN qual LIKE '%EXISTS%SELECT%profiles%' THEN 'Needs Optimization (profiles query)'
        WHEN qual LIKE '%EXISTS%SELECT%' THEN 'Needs Optimization (other subquery)'
        ELSE 'Review Needed'
    END as optimization_status,
    count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY optimization_status
ORDER BY policy_count DESC;

-- =====================================================
-- ROLLBACK SCRIPT (Save this separately!)
-- =====================================================

/*
-- To rollback this migration, run:

BEGIN;

-- Drop JWT policies
DROP POLICY IF EXISTS "admins_manage_products_jwt" ON products;
DROP POLICY IF EXISTS "admins_manage_quotes_jwt" ON quotes;
DROP POLICY IF EXISTS "admins_manage_orders_jwt" ON orders;
DROP POLICY IF EXISTS "admins_view_inventory_logs_jwt" ON inventory_logs;
DROP POLICY IF EXISTS "admins_manage_reservations_jwt" ON inventory_reservations;
DROP POLICY IF EXISTS "admins_view_security_events_jwt" ON security_events;
DROP POLICY IF EXISTS "admins_view_safety_logs_jwt" ON cnc_safety_logs;
DROP POLICY IF EXISTS "staff_view_maintenance_logs_jwt" ON predictive_maintenance_logs;
DROP POLICY IF EXISTS "users_view_price_history_jwt" ON price_history;
DROP POLICY IF EXISTS "admins_view_optimizer_leads_jwt" ON optimizer_leads;
DROP POLICY IF EXISTS "admins_manage_spare_parts_jwt" ON spare_parts;
DROP POLICY IF EXISTS "admins_manage_used_machines_jwt" ON used_machines;
DROP POLICY IF EXISTS "users_manage_addresses_jwt" ON user_addresses;
DROP POLICY IF EXISTS "users_view_workshops_jwt" ON workshops;
DROP POLICY IF EXISTS "admins_view_audit_signatures_jwt" ON audit_signatures;
DROP POLICY IF EXISTS "users_view_transaction_logs_jwt" ON erp_transaction_log;

-- Recreate original policies (copy from your backup)
-- ... (original CREATE POLICY statements)

COMMIT;
*/
