-- This script addresses the remaining RLS security and performance issues.
-- It supersedes previous scripts by applying stricter access controls and optimizing auth function calls.

-- 1. Fix Function Search Path for is_admin (idempotent recreation with fixed search_path)
-- NOTE: Do not DROP the function first, because existing policies depend on it.
-- Using CREATE OR REPLACE avoids dependency errors while updating SECURITY DEFINER and search_path.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$;

-- 2. Secure & Performance-Optimized Policies
-- Strategy:
--   a. Remove legacy permissive policies (including old INSERT-only ones) that cause multiple_permissive warnings.
--   b. Ensure every policy explicitly restricts to authenticated users.
--   c. Replace auth.uid()/auth.role() with (SELECT auth.uid()) / (SELECT auth.role()) to avoid per‑row re-evaluation (auth_rls_initplan warning fix).
--   d. Consolidate overlapping service_tickets policies into single action-specific policies.

-- Helper macro-style comment: Everywhere: (SELECT auth.uid()) and (SELECT auth.role())

-- Table: public.products
DROP POLICY IF EXISTS "Consolidated product view policy" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.products;
CREATE POLICY "Authenticated users can view active products" ON public.products
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND is_active = true);

-- Admin modification policies (from earlier script) performance update
DROP POLICY IF EXISTS "Admin INSERT policy for products" ON public.products;
CREATE POLICY "Admin INSERT policy for products" ON public.products
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
DROP POLICY IF EXISTS "Admin UPDATE policy for products" ON public.products;
CREATE POLICY "Admin UPDATE policy for products" ON public.products
    FOR UPDATE TO authenticated USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
DROP POLICY IF EXISTS "Admin DELETE policy for products" ON public.products;
CREATE POLICY "Admin DELETE policy for products" ON public.products
    FOR DELETE TO authenticated USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: public.categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.categories;
CREATE POLICY "Authenticated users can view active categories" ON public.categories
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND is_active = true);

-- Table: public.pricing_tiers
DROP POLICY IF EXISTS "Anyone can view pricing tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Authenticated users can view pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Authenticated users can view pricing tiers" ON public.pricing_tiers
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

-- Table: public.product_reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Authenticated users can view approved reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can view approved reviews" ON public.product_reviews
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND is_approved = true);

-- Table: public.product_variants
DROP POLICY IF EXISTS "Anyone can view variants for active products" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated users can view variants for active products" ON public.product_variants;
CREATE POLICY "Authenticated users can view variants for active products" ON public.product_variants
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variants.product_id
          AND products.is_active = true
    ));

-- Table: public.profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = id);

-- Table: public.machines
DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
DROP POLICY IF EXISTS "Users can insert own machines" ON public.machines; -- legacy insert-only
DROP POLICY IF EXISTS "Users can manage their own machines" ON public.machines;
CREATE POLICY "Users can manage their own machines" ON public.machines
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = owner_id)
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = owner_id);

-- Table: public.tickets
DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets; -- legacy insert-only
DROP POLICY IF EXISTS "Users can manage their own tickets" ON public.tickets;
CREATE POLICY "Users can manage their own tickets" ON public.tickets
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id);

-- Table: public.wishlists
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id);

-- Table: public.recently_viewed
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id);

-- Table: public.notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id);

-- Table: public.audit_logs (admin-only access)
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND public.is_admin((SELECT auth.uid())));

-- Table: public.order_items
DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items;
CREATE POLICY "Users and admins can view order items" ON public.order_items
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (
        public.is_admin((SELECT auth.uid())) OR EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
              AND orders.user_id = (SELECT auth.uid())
        )
    ));

-- Table: public.orders
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Users and admins can view orders" ON public.orders
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (
        public.is_admin((SELECT auth.uid())) OR user_id = (SELECT auth.uid())
    ));

-- Table: public.quote_items
DROP POLICY IF EXISTS "Users and admins can view quote items" ON public.quote_items;
CREATE POLICY "Users and admins can view quote items" ON public.quote_items
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (
        public.is_admin((SELECT auth.uid())) OR EXISTS (
            SELECT 1 FROM quotes
            WHERE quotes.id = quote_items.quote_id
              AND quotes.user_id = (SELECT auth.uid())
        )
    ));

-- SERVICE TICKETS: remove legacy & consolidate to eliminate multiple_permissive warnings
DROP POLICY IF EXISTS "Service tickets update policy" ON public.service_tickets;
DROP POLICY IF EXISTS "Service tickets view policy" ON public.service_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users can view their own service tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users can update their own service tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Admins can manage all service tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.service_tickets; -- legacy insert-only

-- Ensure idempotency for consolidated service_tickets policies
DROP POLICY IF EXISTS "Service tickets SELECT policy" ON public.service_tickets;
DROP POLICY IF EXISTS "Service tickets INSERT policy" ON public.service_tickets;
DROP POLICY IF EXISTS "Service tickets UPDATE policy" ON public.service_tickets;
DROP POLICY IF EXISTS "Service tickets DELETE policy" ON public.service_tickets;

CREATE POLICY "Service tickets SELECT policy" ON public.service_tickets
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (
        user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
    ));

CREATE POLICY "Service tickets INSERT policy" ON public.service_tickets
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (
        user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
    ));

CREATE POLICY "Service tickets UPDATE policy" ON public.service_tickets
    FOR UPDATE TO authenticated USING ((SELECT auth.role()) = 'authenticated' AND (
        user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
    ))
    WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (
        user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
    ));

CREATE POLICY "Service tickets DELETE policy" ON public.service_tickets
    FOR DELETE TO authenticated USING ((SELECT auth.role()) = 'authenticated' AND public.is_admin((SELECT auth.uid())));

-- Table: public.ticket_assignments_history
DROP POLICY IF EXISTS "Assignment history access policy" ON public.ticket_assignments_history;
DROP POLICY IF EXISTS "Authenticated users can view assignment history" ON public.ticket_assignments_history;
CREATE POLICY "Authenticated users can view assignment history" ON public.ticket_assignments_history
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

-- Table: public.ticket_escalations
DROP POLICY IF EXISTS "Escalations access policy" ON public.ticket_escalations;
DROP POLICY IF EXISTS "Authenticated users can view escalations" ON public.ticket_escalations;
CREATE POLICY "Authenticated users can view escalations" ON public.ticket_escalations
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

-- Table: public.ticket_messages
DROP POLICY IF EXISTS "Ticket messages access policy" ON public.ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can view ticket messages" ON public.ticket_messages;
CREATE POLICY "Authenticated users can view ticket messages" ON public.ticket_messages
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

-- Table: public.ticket_sla_daily_metrics
DROP POLICY IF EXISTS "Staff and admins can view SLA metrics" ON public.ticket_sla_daily_metrics;
CREATE POLICY "Staff and admins can view SLA metrics" ON public.ticket_sla_daily_metrics
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'technician'));

-- SLA Configurations (from earlier consolidation) performance + idempotency updates
DROP POLICY IF EXISTS "Consolidated SLA configurations view policy" ON public.sla_configurations;
CREATE POLICY "Consolidated SLA configurations view policy" ON public.sla_configurations
    FOR SELECT TO authenticated USING ((SELECT auth.role()) = 'authenticated');
DROP POLICY IF EXISTS "Admin INSERT for SLA configurations" ON public.sla_configurations;
CREATE POLICY "Admin INSERT for SLA configurations" ON public.sla_configurations
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
DROP POLICY IF EXISTS "Admin UPDATE for SLA configurations" ON public.sla_configurations;
CREATE POLICY "Admin UPDATE for SLA configurations" ON public.sla_configurations
    FOR UPDATE TO authenticated USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
DROP POLICY IF EXISTS "Admin DELETE for SLA configurations" ON public.sla_configurations;
CREATE POLICY "Admin DELETE for SLA configurations" ON public.sla_configurations
    FOR DELETE TO authenticated USING ((SELECT auth.role()) = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- End of script.
