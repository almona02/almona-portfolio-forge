-- Fix for Anonymous Access Policies
-- This script modifies RLS policies to prevent unintended access by anonymous users.

-- For policies that should only apply to authenticated (non-anonymous) users,
-- we add a check for `auth.role() = 'authenticated'`.

-- 1. audit_logs: "Admins can view all audit logs"
-- Only admins should see audit logs. The check for `role = 'admin'` is sufficient,
-- but we make it explicit that the user must be authenticated.
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. machines: "Users can update own machines", "Users can view own machines"
-- These policies should only apply to the owner of the machine, who must be an authenticated user.
DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
CREATE POLICY "Users can update own machines" ON public.machines
    FOR UPDATE USING (auth.role() = 'authenticated' AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
CREATE POLICY "Users can view own machines" ON public.machines
    FOR SELECT USING (auth.role() = 'authenticated' AND owner_id = auth.uid());

-- 3. notifications: "Users can view their own notifications", "Users modify own notifications"
-- Notifications are user-specific and require an authenticated session.
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications;
CREATE POLICY "Users modify own notifications" ON public.notifications
    FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- 4. order_items: "Users and admins can view order items"
-- Order items should only be visible to the user who placed the order or an admin.
DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items;
CREATE POLICY "Users and admins can view order items" ON public.order_items
    FOR SELECT USING (auth.role() = 'authenticated' AND (
        (SELECT user_id FROM public.orders WHERE id = order_id) = auth.uid() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    ));

-- 5. orders: "Users and admins can view orders"
-- Orders should only be visible to the user who placed them or an admin.
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Users and admins can view orders" ON public.orders
    FOR SELECT USING (auth.role() = 'authenticated' AND (
        user_id = auth.uid() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    ));

-- 6. products: "Admins can manage products"
-- This policy is for admins, so we ensure the user is authenticated and has the admin role.
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 7. profiles: "Users can update their own profile", "Users can view their own profile"
-- These already correctly check `auth.uid() = id`, which implies an authenticated user.
-- No change needed, but listed for completeness.

-- 8. quotes: "Users and admins can view quotes", "Users can update their own draft quotes"
-- Quotes should be restricted to the owner or admins/sales_reps.
DROP POLICY IF EXISTS "Users and admins can view quotes" ON public.quotes;
CREATE POLICY "Users and admins can view quotes" ON public.quotes
    FOR SELECT USING (auth.role() = 'authenticated' AND (
        user_id = auth.uid() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sales_rep')
    ));

DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
CREATE POLICY "Users can update their own draft quotes" ON public.quotes
    FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid() AND status = 'draft');

-- 9. recently_viewed: "Users can manage their own recently viewed"
-- This is user-specific and requires an authenticated session.
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed
    FOR ALL USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- 10. service_tickets: "Admins can delete tickets", "Service tickets update policy", "Service tickets view policy"
-- These policies should be scoped to authenticated users (customers, staff, admins).
DROP POLICY IF EXISTS "Service tickets view policy" ON public.service_tickets;
CREATE POLICY "Service tickets view policy" ON public.service_tickets
    FOR SELECT USING (auth.role() = 'authenticated' AND (
        user_id = auth.uid() OR
        assigned_to = auth.uid() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'technician', 'sales_rep')
    ));

DROP POLICY IF EXISTS "Service tickets update policy" ON public.service_tickets;
CREATE POLICY "Service tickets update policy" ON public.service_tickets
    FOR UPDATE USING (auth.role() = 'authenticated' AND (
        (user_id = auth.uid() AND status IN ('open', 'awaiting_customer')) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'technician', 'sales_rep')
    ));

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.service_tickets;
CREATE POLICY "Admins can delete tickets" ON public.service_tickets
    FOR DELETE USING (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 11. tickets: "Users can update own tickets", "Users can view own tickets"
-- Assuming 'tickets' is a simplified version of service_tickets, apply similar logic.
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Users can update own tickets" ON public.tickets
    FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- 12. wishlists: "Users can manage their own wishlist"
-- This is user-specific and requires an authenticated session.
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
    FOR ALL USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Policies that intentionally allow anonymous access are left unchanged:
-- - public.categories: "Anyone can view active categories"
-- - public.pricing_tiers: "Anyone can view pricing tiers"
-- - public.product_reviews: "Anyone can view approved reviews"
-- - public.product_variants: "Anyone can view variants for active products"
