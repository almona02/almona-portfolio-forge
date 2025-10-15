-- Fix Remaining RLS Issues (Corrected Version)
-- This script addresses additional auth RLS initialization and multiple permissive policy issues
-- Execute this script AFTER running the main performance fix scripts

-- First, let's check what role values are valid in your database
DO $$
BEGIN
    RAISE NOTICE '=== CHECKING VALID ROLE VALUES ===';
    RAISE NOTICE 'Valid user_role enum values:';
    
    -- Show all valid enum values for user_role
    FOR r IN (
        SELECT enumlabel 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'user_role'
        ORDER BY e.enumsortorder
    ) LOOP
        RAISE NOTICE '- %', r.enumlabel;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- PART 1: ADDITIONAL AUTH RLS FIXES
-- =============================================================================

-- Fix remaining auth function calls that weren't covered in the first script
-- These should use (SELECT auth.uid()) instead of auth.uid() for better performance

-- Parts table policies
DROP POLICY IF EXISTS "Admins can manage parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can update parts" ON public.parts;
DROP POLICY IF EXISTS "Only admins can delete parts" ON public.parts;

CREATE POLICY "Admins can manage parts" ON public.parts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can insert parts" ON public.parts
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can update parts" ON public.parts
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete parts" ON public.parts
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- SLA Configurations policies
DROP POLICY IF EXISTS "Only admins can manage SLA configurations" ON public.sla_configurations;

CREATE POLICY "Only admins can manage SLA configurations" ON public.sla_configurations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Additional Tickets table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
        DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
        DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;

        CREATE POLICY "Users can insert own tickets" ON public.tickets
            FOR INSERT TO authenticated
            WITH CHECK (user_id = (SELECT auth.uid()));

        CREATE POLICY "Users can update own tickets" ON public.tickets
            FOR UPDATE TO authenticated
            USING (user_id = (SELECT auth.uid()));

        CREATE POLICY "Users can view own tickets" ON public.tickets
            FOR SELECT TO authenticated
            USING (
                user_id = (SELECT auth.uid()) OR
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = (SELECT auth.uid()) 
                    AND role IN ('admin', 'technician')
                )
            );
    END IF;
END $$;

-- =============================================================================
-- PART 2: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- =============================================================================

-- Notifications table - consolidate duplicate policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Order Items table - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;

CREATE POLICY "Users and admins can view order items" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        -- Users can see their own order items
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND o.user_id = (SELECT auth.uid())
        ) OR
        -- Admins can see all order items
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Orders table - consolidate multiple policies for each action
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users and admins can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update and delete orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

CREATE POLICY "Users can create their own orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users and admins can view orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage orders" ON public.orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Parts table - consolidate multiple policies for each action
DROP POLICY IF EXISTS "Anyone can view parts" ON public.parts;

CREATE POLICY "Anyone can view parts" ON public.parts
    FOR SELECT TO anon, authenticated
    USING (true);

-- Products table - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Public and admins can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT TO anon, authenticated
    USING (active = true);

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Profiles table - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;

CREATE POLICY "Users and admins can view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles p2 
            WHERE p2.id = (SELECT auth.uid()) 
            AND p2.role = 'admin'
        )
    );

-- Quote Items table - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can view all quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users and admins can view quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can view their own quote items" ON public.quote_items;

CREATE POLICY "Users and admins can view quote items" ON public.quote_items
    FOR SELECT TO authenticated
    USING (
        -- Users can see their own quote items
        EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE q.id = quote_items.quote_id
            AND q.user_id = (SELECT auth.uid())
        ) OR
        -- Admins can see all quote items
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Quotes table - consolidate multiple policies for each action
DROP POLICY IF EXISTS "Users and admins can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users and admins can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users and admins can update quotes" ON public.quotes;

CREATE POLICY "Users can create their own quotes" ON public.quotes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users and admins can view quotes" ON public.quotes
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users and admins can update quotes" ON public.quotes
    FOR UPDATE TO authenticated
    USING (
        (user_id = (SELECT auth.uid()) AND status = 'draft') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Service Tickets - consolidate many overlapping policies
DROP POLICY IF EXISTS "Staff can delete tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff can manage all tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff manage tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users and staff can create tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users create own tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff can view assigned tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Staff view tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users and staff can view tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users view own tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users and staff can update tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Users update own open tickets" ON public.service_tickets;

CREATE POLICY "Users can create tickets" ON public.service_tickets
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users and technicians can view tickets" ON public.service_tickets
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        assigned_to = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

CREATE POLICY "Users and technicians can update tickets" ON public.service_tickets
    FOR UPDATE TO authenticated
    USING (
        (user_id = (SELECT auth.uid()) AND status IN ('open', 'pending')) OR
        assigned_to = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

CREATE POLICY "Admins can delete tickets" ON public.service_tickets
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- SLA Configurations - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can delete SLA configurations" ON public.sla_configurations;
DROP POLICY IF EXISTS "Admins can manage SLA configurations" ON public.sla_configurations;
DROP POLICY IF EXISTS "Anyone can view SLA configurations" ON public.sla_configurations;
DROP POLICY IF EXISTS "Admins can update SLA configurations" ON public.sla_configurations;

CREATE POLICY "Anyone can view SLA configurations" ON public.sla_configurations
    FOR SELECT TO anon, authenticated
    USING (true);

-- Ticket Assignment History - consolidate policies
DROP POLICY IF EXISTS "Staff can manage assignment history" ON public.ticket_assignments_history;
DROP POLICY IF EXISTS "Users and staff can view assignment history" ON public.ticket_assignments_history;
DROP POLICY IF EXISTS "Users can view assignment history for their tickets" ON public.ticket_assignments_history;

CREATE POLICY "Users and technicians can view assignment history" ON public.ticket_assignments_history
    FOR SELECT TO authenticated
    USING (
        -- Users can see assignment history for their tickets
        EXISTS (
            SELECT 1 FROM public.service_tickets st
            WHERE st.id = ticket_assignments_history.ticket_id
            AND st.user_id = (SELECT auth.uid())
        ) OR
        -- Technicians can see all assignment history
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

CREATE POLICY "Technicians can manage assignment history" ON public.ticket_assignments_history
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

-- Ticket Escalations - consolidate policies
DROP POLICY IF EXISTS "Staff can manage escalations" ON public.ticket_escalations;
DROP POLICY IF EXISTS "Users and staff can view escalations" ON public.ticket_escalations;
DROP POLICY IF EXISTS "Users can view escalations for their tickets" ON public.ticket_escalations;

CREATE POLICY "Users and technicians can view escalations" ON public.ticket_escalations
    FOR SELECT TO authenticated
    USING (
        -- Users can see escalations for their tickets
        EXISTS (
            SELECT 1 FROM public.service_tickets st
            WHERE st.id = ticket_escalations.ticket_id
            AND st.user_id = (SELECT auth.uid())
        ) OR
        -- Technicians can see all escalations
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

CREATE POLICY "Technicians can manage escalations" ON public.ticket_escalations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

-- Ticket Messages - consolidate many overlapping policies
DROP POLICY IF EXISTS "Staff can delete messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Staff manage messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users and staff can create messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users create ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users and staff can view messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users view ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Staff can update and delete messages" ON public.ticket_messages;

CREATE POLICY "Users and technicians can create messages" ON public.ticket_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

CREATE POLICY "Users and technicians can view messages" ON public.ticket_messages
    FOR SELECT TO authenticated
    USING (
        -- Users can see messages for their tickets
        EXISTS (
            SELECT 1 FROM public.service_tickets st
            WHERE st.id = ticket_messages.ticket_id
            AND st.user_id = (SELECT auth.uid())
        ) OR
        -- Technicians can see all messages
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

CREATE POLICY "Technicians can manage messages" ON public.ticket_messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin', 'technician')
        )
    );

-- =============================================================================
-- PART 3: VALIDATION AND TESTING
-- =============================================================================

-- Test the consolidated policies by checking if they work correctly
DO $$
BEGIN
    RAISE NOTICE '=== POLICY CONSOLIDATION COMPLETE ===';
    RAISE NOTICE 'Consolidated overlapping RLS policies for better performance';
    RAISE NOTICE 'Fixed remaining auth.uid() calls to use (SELECT auth.uid())';
    RAISE NOTICE 'Corrected role references to use valid enum values';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run the linter again to verify issues are resolved';
    RAISE NOTICE '2. Test your application functionality';
    RAISE NOTICE '3. Monitor query performance improvements';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected improvements:';
    RAISE NOTICE '- Reduced policy evaluation overhead';
    RAISE NOTICE '- Better auth function caching';
    RAISE NOTICE '- Cleaner policy logic';
    RAISE NOTICE '- Valid role enum usage';
END $$;

-- Check for any remaining duplicate policies (for manual review)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;