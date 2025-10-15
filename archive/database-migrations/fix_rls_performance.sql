-- Fix for RLS Performance Issues (auth_rls_initplan)
-- This script wraps auth function calls in (SELECT ...) to ensure they are
-- evaluated only once per query, improving performance.

-- 1. Table: public.products
DROP POLICY IF EXISTS "Consolidated product view policy" ON public.products;
CREATE POLICY "Consolidated product view policy" ON public.products
    FOR SELECT USING (
        is_active = true OR
        ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
    );

DROP POLICY IF EXISTS "Admin management policy for products" ON public.products;
CREATE POLICY "Admin management policy for products" ON public.products
    FOR ALL USING (
        (SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    ) WITH CHECK (
        (SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 2. Table: public.quotes
DROP POLICY IF EXISTS "Consolidated quote view policy" ON public.quotes;
CREATE POLICY "Consolidated quote view policy" ON public.quotes
    FOR SELECT USING (
        (SELECT auth.role()) = 'authenticated' AND (
            user_id = (SELECT auth.uid()) OR
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'sales_rep')
        )
    );

DROP POLICY IF EXISTS "Consolidated quote update policy" ON public.quotes;
CREATE POLICY "Consolidated quote update policy" ON public.quotes
    FOR UPDATE USING (
        (SELECT auth.role()) = 'authenticated' AND (
            (user_id = (SELECT auth.uid()) AND status = 'draft') OR
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'sales_rep')
        )
    );

-- 3. Table: public.orders
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Users and admins can view orders" ON public.orders
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND (
        user_id = (SELECT auth.uid()) OR
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    ));

-- 4. Table: public.order_items
DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items;
CREATE POLICY "Users and admins can view order items" ON public.order_items
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND (
        (SELECT user_id FROM public.orders WHERE id = order_id) = (SELECT auth.uid()) OR
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    ));

-- 5. Table: public.wishlists
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
    FOR ALL USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));

-- 6. Table: public.recently_viewed
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed
    FOR ALL USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));

-- 7. Table: public.notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications;
CREATE POLICY "Users modify own notifications" ON public.notifications
    FOR UPDATE USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));

-- 8. Table: public.audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 9. Table: public.sla_configurations
DROP POLICY IF EXISTS "Consolidated SLA configurations view policy" ON public.sla_configurations;
CREATE POLICY "Consolidated SLA configurations view policy" ON public.sla_configurations
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admin management for SLA configurations" ON public.sla_configurations;
CREATE POLICY "Admin management for SLA configurations" ON public.sla_configurations
    FOR ALL USING (
        (SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    ) WITH CHECK (
        (SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 10. Table: public.service_tickets
DROP POLICY IF EXISTS "Service tickets view policy" ON public.service_tickets;
CREATE POLICY "Service tickets view policy" ON public.service_tickets
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND (
        user_id = (SELECT auth.uid()) OR
        assigned_to = (SELECT auth.uid()) OR
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'technician', 'sales_rep')
    ));

DROP POLICY IF EXISTS "Service tickets update policy" ON public.service_tickets;
CREATE POLICY "Service tickets update policy" ON public.service_tickets
    FOR UPDATE USING ((SELECT auth.role()) = 'authenticated' AND (
        (user_id = (SELECT auth.uid()) AND status IN ('open', 'awaiting_customer')) OR
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'technician', 'sales_rep')
    ));

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.service_tickets;
CREATE POLICY "Admins can delete tickets" ON public.service_tickets
    FOR DELETE USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 11. Table: public.machines
DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
CREATE POLICY "Users can update own machines" ON public.machines
    FOR UPDATE USING ((SELECT auth.role()) = 'authenticated' AND owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
CREATE POLICY "Users can view own machines" ON public.machines
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND owner_id = (SELECT auth.uid()));

-- 12. Table: public.tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Users can update own tickets" ON public.tickets
    FOR UPDATE USING ((SELECT auth.role()) = 'authenticated' AND user_id = (SELECT auth.uid()));
