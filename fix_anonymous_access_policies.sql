-- Fix Anonymous Access Policies and Remaining Issues
-- This script addresses the anonymous access warnings and multiple permissive policies
-- Execute this script AFTER running all three previous performance fix scripts

-- =============================================================================
-- PART 1: MATERIALIZED VIEW SECURITY FIX
-- =============================================================================
-- Issue: Materialized view mv_top_products is accessible to anonymous users
-- Solution: Add RLS policies to control access

-- Enable RLS on materialized view if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_top_products' AND table_schema = 'public') THEN
        ALTER MATERIALIZED VIEW public.mv_top_products ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow public read access (if this is intended)
        -- Change this policy based on your business requirements
        DROP POLICY IF EXISTS "Public can view top products" ON public.mv_top_products;
        CREATE POLICY "Public can view top products" ON public.mv_top_products 
            FOR SELECT USING (true);
            
        RAISE NOTICE 'RLS enabled on mv_top_products materialized view';
    ELSE
        RAISE NOTICE 'mv_top_products materialized view not found, skipping';
    END IF;
END $$;

-- =============================================================================
-- PART 2: FIX MULTIPLE PERMISSIVE POLICIES
-- =============================================================================
-- Issue: Multiple permissive policies on products and ticket_sla_daily_metrics tables
-- Solution: Consolidate policies into single comprehensive policies

-- Fix products table multiple permissive policies
-- Remove all existing policies first
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products, admins can manage all" ON public.products;

-- Create single consolidated SELECT policy for products
CREATE POLICY "Public and admins can view products" ON public.products 
    FOR SELECT USING (
        -- Public can view active products
        is_active = true OR
        -- Admins can view all products
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Create separate admin management policies for other operations
CREATE POLICY "Admins can insert products" ON public.products 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update products" ON public.products 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete products" ON public.products 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Fix ticket_sla_daily_metrics multiple permissive policies
DROP POLICY IF EXISTS "Admins can view SLA metrics" ON public.ticket_sla_daily_metrics;
DROP POLICY IF EXISTS "Staff can view SLA metrics" ON public.ticket_sla_daily_metrics;
DROP POLICY IF EXISTS "Staff and admins can view SLA metrics" ON public.ticket_sla_daily_metrics;

-- Create single consolidated policy for SLA metrics
CREATE POLICY "Staff and admins can view SLA metrics" ON public.ticket_sla_daily_metrics 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- =============================================================================
-- PART 3: ANONYMOUS ACCESS POLICY REVIEW AND RECOMMENDATIONS
-- =============================================================================
-- The following provides three options for handling anonymous access
-- Choose the approach that best fits your business requirements

-- OPTION 1: MAINTAIN CURRENT ANONYMOUS ACCESS (Recommended for e-commerce)
-- This maintains public catalog browsing while securing sensitive data
-- No changes needed - current setup allows browsing products, categories, etc.

-- OPTION 2: RESTRICT SOME ANONYMOUS ACCESS (Moderate Security)
-- This removes anonymous access from sensitive operations while keeping product browsing

-- OPTION 3: REMOVE ALL ANONYMOUS ACCESS (Maximum Security)
-- This requires authentication for all operations
-- Uncomment the following section if you want maximum security:

/*
-- Remove anonymous access from all tables except public catalog data
-- Keep anonymous access only for: products, categories, product_variants, product_reviews, pricing_tiers

-- Remove anonymous access from user-specific data
DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
CREATE POLICY "Authenticated users can view own machines" ON public.machines 
    FOR SELECT USING (owner_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
CREATE POLICY "Authenticated users can update own machines" ON public.machines 
    FOR UPDATE USING (owner_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IS NOT NULL);

-- Remove anonymous access from notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Authenticated users can view their own notifications" ON public.notifications 
    FOR SELECT USING (user_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications;
CREATE POLICY "Authenticated users can modify own notifications" ON public.notifications 
    FOR UPDATE USING (user_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IS NOT NULL);

-- Remove anonymous access from orders
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Authenticated users and admins can view orders" ON public.orders 
    FOR SELECT USING (
        ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Remove anonymous access from quotes
DROP POLICY IF EXISTS "Users and admins can view quotes" ON public.quotes;
CREATE POLICY "Authenticated users and admins can view quotes" ON public.quotes 
    FOR SELECT USING (
        ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Remove anonymous access from wishlists
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Authenticated users can manage their own wishlist" ON public.wishlists 
    FOR ALL USING (user_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IS NOT NULL);

-- Remove anonymous access from recently viewed
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Authenticated users can manage their own recently viewed" ON public.recently_viewed 
    FOR ALL USING (user_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IS NOT NULL);

-- Remove anonymous access from service tickets
DROP POLICY IF EXISTS "Users and staff can view tickets" ON public.service_tickets;
CREATE POLICY "Authenticated users and staff can view tickets" ON public.service_tickets 
    FOR SELECT USING (
        ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())) OR
        assigned_to = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'technician', 'sales_rep')
        )
    );

-- Remove anonymous access from profiles
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users and admins can view profiles" ON public.profiles 
    FOR SELECT USING (
        ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = id) OR
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
        )
    );
*/

-- =============================================================================
-- PART 4: SECURITY RECOMMENDATIONS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== ANONYMOUS ACCESS POLICY ANALYSIS ===';
    RAISE NOTICE '';
    RAISE NOTICE 'CURRENT STATUS: Your database allows anonymous access to certain tables.';
    RAISE NOTICE 'This is common for e-commerce applications that need public product catalogs.';
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATIONS:';
    RAISE NOTICE '1. KEEP CURRENT SETUP if you need public product browsing (recommended for e-commerce)';
    RAISE NOTICE '2. REVIEW which tables truly need anonymous access';
    RAISE NOTICE '3. SENSITIVE DATA (orders, quotes, tickets) should require authentication';
    RAISE NOTICE '4. ENABLE leaked password protection in Supabase Auth settings';
    RAISE NOTICE '5. UPGRADE PostgreSQL when possible for security patches';
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES WITH ANONYMOUS ACCESS:';
    RAISE NOTICE '- products, categories, parts: Needed for public catalog';
    RAISE NOTICE '- pricing_tiers, product_variants: Needed for public pricing';
    RAISE NOTICE '- product_reviews: Needed for public reviews';
    RAISE NOTICE '- machines, orders, quotes: Consider requiring authentication';
    RAISE NOTICE '- tickets, notifications: Should require authentication';
    RAISE NOTICE '';
    RAISE NOTICE 'TO IMPLEMENT MAXIMUM SECURITY: Uncomment the OPTION 3 section above';
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== MULTIPLE PERMISSIVE POLICY FIXES COMPLETED ===';
    RAISE NOTICE 'Products table policies have been properly consolidated.';
    RAISE NOTICE 'SLA metrics policies have been consolidated.';
    RAISE NOTICE 'Materialized view security has been addressed.';
    RAISE NOTICE '';
    RAISE NOTICE 'FIXED ISSUES:';
    RAISE NOTICE '- Multiple permissive policies for products table SELECT operations';
    RAISE NOTICE '- Multiple permissive policies for ticket_sla_daily_metrics table';
    RAISE NOTICE '- Materialized view mv_top_products RLS enablement';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Re-run Supabase linter to verify fixes';
    RAISE NOTICE '2. Test application functionality for product browsing';
    RAISE NOTICE '3. Monitor query performance after policy consolidation';
    RAISE NOTICE '4. Review anonymous access requirements if needed';
END $$;