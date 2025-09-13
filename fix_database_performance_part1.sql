-- Database Performance and Security Fixes for Supabase Linting Issues
-- This script addresses critical performance and security issues identified by Supabase database linter
-- Execute this script in your Supabase SQL Editor

-- =============================================================================
-- PART 1: FIX AUTH RLS INITIALIZATION PERFORMANCE ISSUES
-- =============================================================================
-- Issue: auth.uid() and other auth functions are re-evaluated for each row
-- Solution: Wrap auth functions in SELECT to evaluate once per query
-- Documentation: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Fix 1: Machines table policies
DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
CREATE POLICY "Users can view own machines" ON public.machines 
    FOR SELECT USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own machines" ON public.machines;
CREATE POLICY "Users can insert own machines" ON public.machines 
    FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
CREATE POLICY "Users can update own machines" ON public.machines 
    FOR UPDATE USING (owner_id = (SELECT auth.uid()));

-- Fix 2: Parts table policies
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
CREATE POLICY "Authenticated users can insert parts" ON public.parts 
    FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update parts" ON public.parts;
CREATE POLICY "Authenticated users can update parts" ON public.parts 
    FOR UPDATE USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can delete parts" ON public.parts;
CREATE POLICY "Only admins can delete parts" ON public.parts 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 3: Service Tickets table policies
DROP POLICY IF EXISTS "Users view own tickets" ON public.service_tickets;
CREATE POLICY "Users view own tickets" ON public.service_tickets 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users create own tickets" ON public.service_tickets;
CREATE POLICY "Users create own tickets" ON public.service_tickets 
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own open tickets" ON public.service_tickets;
CREATE POLICY "Users update own open tickets" ON public.service_tickets 
    FOR UPDATE USING (
        user_id = (SELECT auth.uid()) AND 
        status IN ('open', 'awaiting_customer')
    );

DROP POLICY IF EXISTS "Staff view tickets" ON public.service_tickets;
CREATE POLICY "Staff view tickets" ON public.service_tickets 
    FOR SELECT USING (
        assigned_to = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

DROP POLICY IF EXISTS "Staff manage tickets" ON public.service_tickets;
CREATE POLICY "Staff manage tickets" ON public.service_tickets 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Fix 4: Ticket Messages table policies
DROP POLICY IF EXISTS "Users view ticket messages" ON public.ticket_messages;
CREATE POLICY "Users view ticket messages" ON public.ticket_messages 
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

DROP POLICY IF EXISTS "Users create ticket messages" ON public.ticket_messages;
CREATE POLICY "Users create ticket messages" ON public.ticket_messages 
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

DROP POLICY IF EXISTS "Staff manage messages" ON public.ticket_messages;
CREATE POLICY "Staff manage messages" ON public.ticket_messages 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Fix 5: Quotes table policies
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Users can view their own quotes" ON public.quotes 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
CREATE POLICY "Users can create their own quotes" ON public.quotes 
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
CREATE POLICY "Users can update their own draft quotes" ON public.quotes 
    FOR UPDATE USING (
        user_id = (SELECT auth.uid()) AND status = 'draft'
    );

DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes" ON public.quotes 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 6: Orders table policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders 
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 7: Wishlists table policies
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists 
    FOR ALL USING (user_id = (SELECT auth.uid()));

-- Fix 8: Recently Viewed table policies
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed 
    FOR ALL USING (user_id = (SELECT auth.uid()));

-- Fix 9: Notifications table policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
-- This appears to be a duplicate, dropping it

DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications;
CREATE POLICY "Users modify own notifications" ON public.notifications 
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Fix 10: Products table admin policy
DROP POLICY IF EXISTS "Admins can manage all data" ON public.products;
CREATE POLICY "Admins can manage all data" ON public.products 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 11: Order Items table policies
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items 
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items" ON public.order_items 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 12: Quote Items table policies
DROP POLICY IF EXISTS "Users can view their own quote items" ON public.quote_items;
CREATE POLICY "Users can view their own quote items" ON public.quote_items 
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM public.quotes WHERE user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins can view all quote items" ON public.quote_items;
CREATE POLICY "Admins can view all quote items" ON public.quote_items 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 13: Audit Logs table policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 14: Tickets table policies (legacy table)
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets" ON public.tickets 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Users can insert own tickets" ON public.tickets 
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Users can update own tickets" ON public.tickets 
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Fix 15: Parts admin policy
DROP POLICY IF EXISTS "Admins can manage parts" ON public.parts;
CREATE POLICY "Admins can manage parts" ON public.parts 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 16: Advanced Service Tickets policies (additional ones from the secure version)
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.service_tickets;
CREATE POLICY "Users can view their own tickets" ON public.service_tickets 
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own tickets" ON public.service_tickets;
CREATE POLICY "Users can create their own tickets" ON public.service_tickets 
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own open tickets" ON public.service_tickets;
CREATE POLICY "Users can update their own open tickets" ON public.service_tickets 
    FOR UPDATE USING (
        user_id = (SELECT auth.uid()) AND 
        status IN ('open', 'awaiting_customer')
    );

DROP POLICY IF EXISTS "Staff can view assigned tickets" ON public.service_tickets;
CREATE POLICY "Staff can view assigned tickets" ON public.service_tickets 
    FOR SELECT USING (
        assigned_to = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

DROP POLICY IF EXISTS "Staff can manage all tickets" ON public.service_tickets;
CREATE POLICY "Staff can manage all tickets" ON public.service_tickets 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Fix 17: Advanced Ticket Messages policies
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages 
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
CREATE POLICY "Users can create messages for their tickets" ON public.ticket_messages 
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

DROP POLICY IF EXISTS "Staff can manage all messages" ON public.ticket_messages;
CREATE POLICY "Staff can manage all messages" ON public.ticket_messages 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Fix 18: SLA Configurations policies
DROP POLICY IF EXISTS "Only admins can manage SLA configurations" ON public.sla_configurations;
CREATE POLICY "Only admins can manage SLA configurations" ON public.sla_configurations 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix 19: Ticket Assignments History policies
DROP POLICY IF EXISTS "Users can view assignment history for their tickets" ON public.ticket_assignments_history;
CREATE POLICY "Users can view assignment history for their tickets" ON public.ticket_assignments_history 
    FOR SELECT USING (
        (SELECT auth.uid()) IN (
            SELECT st.user_id FROM public.service_tickets st WHERE st.id = ticket_id
        )
    );

DROP POLICY IF EXISTS "Staff can manage assignment history" ON public.ticket_assignments_history;
CREATE POLICY "Staff can manage assignment history" ON public.ticket_assignments_history 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Fix 20: Ticket Escalations policies
DROP POLICY IF EXISTS "Users can view escalations for their tickets" ON public.ticket_escalations;
CREATE POLICY "Users can view escalations for their tickets" ON public.ticket_escalations 
    FOR SELECT USING (
        (SELECT auth.uid()) IN (
            SELECT st.user_id FROM public.service_tickets st WHERE st.id = ticket_id
        )
    );

DROP POLICY IF EXISTS "Staff can manage escalations" ON public.ticket_escalations;
CREATE POLICY "Staff can manage escalations" ON public.ticket_escalations 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Fix 21: Profiles policies (update existing ones)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles 
    FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles 
    FOR UPDATE USING ((SELECT auth.uid()) = id);

-- =============================================================================
-- PART 2: ENABLE ROW LEVEL SECURITY ON MISSING TABLES
-- =============================================================================
-- Issue: Table public.ticket_sla_daily_metrics has RLS disabled
-- Solution: Enable RLS and create appropriate policies

-- Enable RLS on ticket_sla_daily_metrics table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_sla_daily_metrics' AND table_schema = 'public') THEN
        ALTER TABLE public.ticket_sla_daily_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for admins to view SLA metrics
        DROP POLICY IF EXISTS "Admins can view SLA metrics" ON public.ticket_sla_daily_metrics;
        CREATE POLICY "Admins can view SLA metrics" ON public.ticket_sla_daily_metrics 
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = (SELECT auth.uid()) AND role = 'admin'
                )
            );
        
        -- Create policy for staff to view SLA metrics
        DROP POLICY IF EXISTS "Staff can view SLA metrics" ON public.ticket_sla_daily_metrics;
        CREATE POLICY "Staff can view SLA metrics" ON public.ticket_sla_daily_metrics 
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
                )
            );
    END IF;
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Database performance and security fixes applied successfully!';
    RAISE NOTICE 'Auth RLS initialization performance issues have been resolved.';
    RAISE NOTICE 'Row Level Security has been enabled on all required tables.';
    RAISE NOTICE 'Next steps: Run part 2 script to address foreign key indexes and duplicate policies.';
END $$;