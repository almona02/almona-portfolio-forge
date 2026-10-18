-- Fix admin RLS: the "JWT-optimized" policies checked auth.jwt()->>'role', which is
-- always 'authenticated' (never 'admin'). Replace them with DB-role checks via
-- admin_private helpers (SECURITY DEFINER, so no profiles RLS recursion).
-- Idempotent: safe to re-run.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Helper: current user's profile has any of the given roles.
CREATE OR REPLACE FUNCTION admin_private.has_any_role(VARIADIC roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = ANY(roles));
$$;
REVOKE ALL ON FUNCTION admin_private.has_any_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_private.has_any_role(text[]) TO authenticated;

-- Drop broken JWT policies.
DROP POLICY IF EXISTS "admins_manage_products_jwt" ON public.products;
DROP POLICY IF EXISTS "admins_manage_quotes_jwt" ON public.quotes;
DROP POLICY IF EXISTS "admins_manage_orders_jwt" ON public.orders;
DROP POLICY IF EXISTS "admins_view_inventory_logs_jwt" ON public.inventory_logs;
DROP POLICY IF EXISTS "admins_manage_reservations_jwt" ON public.inventory_reservations;
DROP POLICY IF EXISTS "admins_view_security_events_jwt" ON public.security_events;
DROP POLICY IF EXISTS "admins_view_safety_logs_jwt" ON public.cnc_safety_logs;
DROP POLICY IF EXISTS "staff_view_maintenance_logs_jwt" ON public.predictive_maintenance_logs;
DROP POLICY IF EXISTS "users_view_price_history_jwt" ON public.price_history;
DROP POLICY IF EXISTS "admins_view_optimizer_leads_jwt" ON public.optimizer_leads;
DROP POLICY IF EXISTS "admins_manage_spare_parts_jwt" ON public.spare_parts;
DROP POLICY IF EXISTS "admins_manage_used_machines_jwt" ON public.used_machines;
DROP POLICY IF EXISTS "users_manage_addresses_jwt" ON public.user_addresses;
DROP POLICY IF EXISTS "users_view_workshops_jwt" ON public.workshops;
DROP POLICY IF EXISTS "admins_view_audit_signatures_jwt" ON public.audit_signatures;
DROP POLICY IF EXISTS "users_view_transaction_logs_jwt" ON public.erp_transaction_log;

-- Drop the corrected policies too (so a partial/repeated run never collides).
DROP POLICY IF EXISTS "admins_manage_products" ON public.products;
DROP POLICY IF EXISTS "admins_manage_quotes" ON public.quotes;
DROP POLICY IF EXISTS "admins_manage_orders" ON public.orders;
DROP POLICY IF EXISTS "admins_view_inventory_logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "admins_manage_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "admins_view_security_events" ON public.security_events;
DROP POLICY IF EXISTS "admins_view_safety_logs" ON public.cnc_safety_logs;
DROP POLICY IF EXISTS "staff_view_maintenance_logs" ON public.predictive_maintenance_logs;
DROP POLICY IF EXISTS "users_view_price_history" ON public.price_history;
DROP POLICY IF EXISTS "admins_view_optimizer_leads" ON public.optimizer_leads;
DROP POLICY IF EXISTS "admins_manage_spare_parts" ON public.spare_parts;
DROP POLICY IF EXISTS "admins_manage_used_machines" ON public.used_machines;
DROP POLICY IF EXISTS "users_manage_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "users_view_workshops" ON public.workshops;
DROP POLICY IF EXISTS "admins_view_audit_signatures" ON public.audit_signatures;
DROP POLICY IF EXISTS "users_view_transaction_logs" ON public.erp_transaction_log;

-- Recreate correct DB-role-based policies.
CREATE POLICY "admins_manage_products" ON public.products FOR ALL TO authenticated
  USING (admin_private.is_admin()) WITH CHECK (admin_private.is_admin());
CREATE POLICY "admins_manage_quotes" ON public.quotes FOR ALL TO authenticated
  USING (admin_private.has_any_role('admin','sales_rep')) WITH CHECK (admin_private.has_any_role('admin','sales_rep'));
CREATE POLICY "admins_manage_orders" ON public.orders FOR ALL TO authenticated
  USING (admin_private.has_any_role('admin','sales_rep')) WITH CHECK (admin_private.has_any_role('admin','sales_rep'));
CREATE POLICY "admins_view_inventory_logs" ON public.inventory_logs FOR SELECT TO authenticated
  USING (admin_private.has_any_role('admin','sales_rep'));
CREATE POLICY "admins_manage_reservations" ON public.inventory_reservations FOR ALL TO authenticated
  USING (admin_private.has_any_role('admin','sales_rep')) WITH CHECK (admin_private.has_any_role('admin','sales_rep'));
CREATE POLICY "admins_view_security_events" ON public.security_events FOR SELECT TO authenticated
  USING (admin_private.is_admin());
CREATE POLICY "admins_view_safety_logs" ON public.cnc_safety_logs FOR SELECT TO authenticated
  USING (admin_private.is_admin());
CREATE POLICY "staff_view_maintenance_logs" ON public.predictive_maintenance_logs FOR SELECT TO authenticated
  USING (admin_private.has_any_role('admin','technician'));
CREATE POLICY "users_view_price_history" ON public.price_history FOR SELECT TO authenticated
  USING (changed_by = auth.uid() OR admin_private.is_admin());
CREATE POLICY "admins_view_optimizer_leads" ON public.optimizer_leads FOR SELECT TO authenticated
  USING (admin_private.is_admin());
CREATE POLICY "admins_manage_spare_parts" ON public.spare_parts FOR ALL TO authenticated
  USING (admin_private.has_any_role('admin','sales_rep')) WITH CHECK (admin_private.has_any_role('admin','sales_rep'));
CREATE POLICY "admins_manage_used_machines" ON public.used_machines FOR ALL TO authenticated
  USING (admin_private.has_any_role('admin','sales_rep')) WITH CHECK (admin_private.has_any_role('admin','sales_rep'));
CREATE POLICY "users_manage_addresses" ON public.user_addresses FOR ALL TO authenticated
  USING (user_id = auth.uid() OR admin_private.is_admin()) WITH CHECK (user_id = auth.uid() OR admin_private.is_admin());
CREATE POLICY "users_view_workshops" ON public.workshops FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR admin_private.is_admin());
CREATE POLICY "admins_view_audit_signatures" ON public.audit_signatures FOR SELECT TO authenticated
  USING (admin_private.is_admin());
CREATE POLICY "users_view_transaction_logs" ON public.erp_transaction_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = erp_transaction_log.quote_id AND q.user_id = auth.uid()) OR admin_private.is_admin());

COMMIT;
