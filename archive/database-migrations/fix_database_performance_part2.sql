-- Database Performance Fixes Part 2: Indexes and Policy Consolidation
-- This script addresses foreign key indexes and consolidates duplicate permissive policies
-- Execute this script AFTER running fix_database_performance_part1.sql

-- =============================================================================
-- PART 1: CREATE MISSING INDEXES FOR FOREIGN KEY CONSTRAINTS
-- =============================================================================
-- Issue: Foreign key constraints without covering indexes impact performance
-- Solution: Create appropriate indexes for better query performance

-- Note: Indexes are created without CONCURRENTLY to allow execution in transaction block
-- For production environments with large tables, consider running these individually with CONCURRENTLY

-- 1. Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
    ON public.audit_logs(user_id);

-- 2. Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id 
    ON public.categories(parent_id);

-- 3. Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
    ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id 
    ON public.order_items(variant_id);

-- 4. Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_quote_id 
    ON public.orders(quote_id);

-- 5. Pricing tiers indexes
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_id 
    ON public.pricing_tiers(product_id);

-- 6. Product reviews indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id 
    ON public.product_reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id 
    ON public.product_reviews(user_id);

-- 7. Product variants indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id 
    ON public.product_variants(product_id);

-- 8. Quote items indexes
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id 
    ON public.quote_items(product_id);

CREATE INDEX IF NOT EXISTS idx_quote_items_variant_id 
    ON public.quote_items(variant_id);

-- 9. Recently viewed indexes
CREATE INDEX IF NOT EXISTS idx_recently_viewed_product_id 
    ON public.recently_viewed(product_id);

-- 10. Service tickets indexes
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_by 
    ON public.service_tickets(assigned_by);

CREATE INDEX IF NOT EXISTS idx_service_tickets_related_order_id 
    ON public.service_tickets(related_order_id);

CREATE INDEX IF NOT EXISTS idx_service_tickets_related_product_id 
    ON public.service_tickets(related_product_id);

CREATE INDEX IF NOT EXISTS idx_service_tickets_related_quote_id 
    ON public.service_tickets(related_quote_id);

-- 11. Ticket assignments history indexes
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_assigned_by 
    ON public.ticket_assignments_history(assigned_by);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_assigned_from 
    ON public.ticket_assignments_history(assigned_from);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_assigned_to 
    ON public.ticket_assignments_history(assigned_to);

-- 12. Ticket escalations indexes
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_escalated_by 
    ON public.ticket_escalations(escalated_by);

CREATE INDEX IF NOT EXISTS idx_ticket_escalations_escalated_to 
    ON public.ticket_escalations(escalated_to);

-- 13. Tickets (legacy) indexes
CREATE INDEX IF NOT EXISTS idx_tickets_machine_id 
    ON public.tickets(machine_id);

-- 14. Wishlists indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id 
    ON public.wishlists(product_id);

-- =============================================================================
-- PART 2: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- =============================================================================
-- Issue: Multiple permissive policies for same role/action reduce performance
-- Solution: Merge similar policies into single comprehensive policies

-- Notifications table - consolidate duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Order items table - consolidate admin and user SELECT policies
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users and admins can view order items" ON public.order_items 
    FOR SELECT USING (
        -- Users can view their own order items
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = (SELECT auth.uid())
        ) OR
        -- Admins can view all order items
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Orders table - consolidate policies per action
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users and admins can view orders" ON public.orders 
    FOR SELECT USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users and admins can create orders" ON public.orders 
    FOR INSERT WITH CHECK (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update and delete orders" ON public.orders 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete orders" ON public.orders 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Parts table - consolidate overlapping policies
DROP POLICY IF EXISTS "Admins can manage parts" ON public.parts;
DROP POLICY IF EXISTS "Anyone can view parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can update parts" ON public.parts;
DROP POLICY IF EXISTS "Only admins can delete parts" ON public.parts;

-- Recreate consolidated parts policies
CREATE POLICY "Anyone can view parts" ON public.parts 
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert and update parts" ON public.parts 
    FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update parts" ON public.parts 
    FOR UPDATE USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only admins can delete parts" ON public.parts 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Products table - consolidate admin and public view policies
DROP POLICY IF EXISTS "Admins can manage all data" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anyone can view active products" ON public.products 
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all products" ON public.products 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Profiles table - consolidate admin and user policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users and admins can view profiles" ON public.profiles 
    FOR SELECT USING (
        (SELECT auth.uid()) = id OR
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
        )
    );

-- Quote items table - consolidate policies
DROP POLICY IF EXISTS "Admins can view all quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can view their own quote items" ON public.quote_items;

CREATE POLICY "Users and admins can view quote items" ON public.quote_items 
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM public.quotes WHERE user_id = (SELECT auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Quotes table - consolidate policies per action
DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;

CREATE POLICY "Users and admins can view quotes" ON public.quotes 
    FOR SELECT USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
CREATE POLICY "Users and admins can create quotes" ON public.quotes 
    FOR INSERT WITH CHECK (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
CREATE POLICY "Users and admins can update quotes" ON public.quotes 
    FOR UPDATE USING (
        (user_id = (SELECT auth.uid()) AND status = 'draft') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Service tickets table - consolidate overlapping policies
DROP POLICY IF EXISTS "Staff can manage all tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff can view assigned tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff manage tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff view tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users view own tickets" ON public.service_tickets;

-- Recreate consolidated service ticket policies
CREATE POLICY "Users and staff can view tickets" ON public.service_tickets 
    FOR SELECT USING (
        user_id = (SELECT auth.uid()) OR
        assigned_to = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

DROP POLICY IF EXISTS "Users can create their own tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users create own tickets" ON public.service_tickets;
CREATE POLICY "Users and staff can create tickets" ON public.service_tickets 
    FOR INSERT WITH CHECK (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

DROP POLICY IF EXISTS "Users can update their own open tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users update own open tickets" ON public.service_tickets;
CREATE POLICY "Users and staff can update tickets" ON public.service_tickets 
    FOR UPDATE USING (
        (user_id = (SELECT auth.uid()) AND status IN ('open', 'awaiting_customer')) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

CREATE POLICY "Staff can delete tickets" ON public.service_tickets 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- SLA configurations table - consolidate view and manage policies
DROP POLICY IF EXISTS "Anyone can view SLA configurations" ON public.sla_configurations;
DROP POLICY IF EXISTS "Only admins can manage SLA configurations" ON public.sla_configurations;

CREATE POLICY "Anyone can view SLA configurations" ON public.sla_configurations 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage SLA configurations" ON public.sla_configurations 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update SLA configurations" ON public.sla_configurations 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete SLA configurations" ON public.sla_configurations 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Ticket assignments history - consolidate policies
DROP POLICY IF EXISTS "Staff can manage assignment history" ON public.ticket_assignments_history;
DROP POLICY IF EXISTS "Users can view assignment history for their tickets" ON public.ticket_assignments_history;

CREATE POLICY "Users and staff can view assignment history" ON public.ticket_assignments_history 
    FOR SELECT USING (
        (SELECT auth.uid()) IN (
            SELECT st.user_id FROM public.service_tickets st WHERE st.id = ticket_id
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

CREATE POLICY "Staff can manage assignment history" ON public.ticket_assignments_history 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Ticket escalations - consolidate policies
DROP POLICY IF EXISTS "Staff can manage escalations" ON public.ticket_escalations;
DROP POLICY IF EXISTS "Users can view escalations for their tickets" ON public.ticket_escalations;

CREATE POLICY "Users and staff can view escalations" ON public.ticket_escalations 
    FOR SELECT USING (
        (SELECT auth.uid()) IN (
            SELECT st.user_id FROM public.service_tickets st WHERE st.id = ticket_id
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

CREATE POLICY "Staff can manage escalations" ON public.ticket_escalations 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Ticket messages - consolidate overlapping policies
DROP POLICY IF EXISTS "Staff can manage all messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Staff manage messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users view ticket messages" ON public.ticket_messages;

CREATE POLICY "Users and staff can view messages" ON public.ticket_messages 
    FOR SELECT USING (
        author_id = (SELECT auth.uid()) OR
        (SELECT auth.uid()) IN (
            SELECT st.user_id FROM public.service_tickets st WHERE st.id = ticket_id
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users create ticket messages" ON public.ticket_messages;
CREATE POLICY "Users and staff can create messages" ON public.ticket_messages 
    FOR INSERT WITH CHECK (
        author_id = (SELECT auth.uid()) AND (
            (SELECT auth.uid()) IN (
                SELECT st.user_id FROM public.service_tickets st WHERE st.id = ticket_id
            ) OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
            )
        )
    );

CREATE POLICY "Staff can update and delete messages" ON public.ticket_messages 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

CREATE POLICY "Staff can delete messages" ON public.ticket_messages 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Database performance fixes part 2 completed successfully!';
    RAISE NOTICE 'Missing foreign key indexes have been created.';
    RAISE NOTICE 'Multiple permissive policies have been consolidated.';
    RAISE NOTICE 'Next: Run part 3 script to address function security and unused indexes.';
END $$;