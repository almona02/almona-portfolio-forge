-- Consolidation of multiple permissive RLS policies

    -- 1. Table: public.products
    -- Consolidate "Admins can manage products" and "Anyone can view active products" for SELECT.
    -- The original policies created a performance issue by having two separate permissive policies for the `authenticated` role.
    DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
    DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
    DROP POLICY IF EXISTS "Consolidated product view policy" ON public.products;

    -- Consolidated SELECT policy for products
    CREATE POLICY "Consolidated product view policy" ON public.products
        FOR SELECT USING (
            is_active = true OR
            (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
        );

    -- Re-create the admin policy for products, but only for modification.
    DROP POLICY IF EXISTS "Admin management policy for products" ON public.products;
    DROP POLICY IF EXISTS "Admin INSERT policy for products" ON public.products;
    CREATE POLICY "Admin INSERT policy for products" ON public.products
        FOR INSERT WITH CHECK (
            auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
    DROP POLICY IF EXISTS "Admin UPDATE policy for products" ON public.products;
    CREATE POLICY "Admin UPDATE policy for products" ON public.products
        FOR UPDATE USING (
            auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
    DROP POLICY IF EXISTS "Admin DELETE policy for products" ON public.products;
    CREATE POLICY "Admin DELETE policy for products" ON public.products
        FOR DELETE USING (
            auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );


    -- 2. Table: public.quotes
    -- Consolidate "Users and admins can view quotes" and "Users can view their own quotes" for SELECT.
    DROP POLICY IF EXISTS "Users and admins can view quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Consolidated quote view policy" ON public.quotes;

    -- Consolidated SELECT policy for quotes
    CREATE POLICY "Consolidated quote view policy" ON public.quotes
        FOR SELECT USING (
            auth.role() = 'authenticated' AND (
                user_id = auth.uid() OR
                (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sales_rep')
            )
        );

    -- Consolidate "Users and admins can update quotes" and "Users can update their own draft quotes" for UPDATE.
    DROP POLICY IF EXISTS "Users and admins can update quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Consolidated quote update policy" ON public.quotes;

    -- Consolidated UPDATE policy for quotes
    CREATE POLICY "Consolidated quote update policy" ON public.quotes
        FOR UPDATE USING (
            auth.role() = 'authenticated' AND (
                (user_id = auth.uid() AND status = 'draft') OR
                (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sales_rep')
            )
        );


    -- 3. Table: public.sla_configurations
    -- Consolidate "SLA configurations access policy" and "SLA configurations admin policy" for SELECT.
    -- Assuming "SLA configurations access policy" was intended to allow all authenticated users to view.
    DROP POLICY IF EXISTS "SLA configurations access policy" ON public.sla_configurations;
    DROP POLICY IF EXISTS "SLA configurations admin policy" ON public.sla_configurations;
    DROP POLICY IF EXISTS "Anyone can view SLA configurations" ON public.sla_configurations; -- from secure schema
    DROP POLICY IF EXISTS "Only admins can manage SLA configurations" ON public.sla_configurations; -- from secure schema
    DROP POLICY IF EXISTS "Consolidated SLA configurations view policy" ON public.sla_configurations;


    -- Consolidated SELECT policy for sla_configurations
    -- Allow any authenticated user to view the configurations.
    CREATE POLICY "Consolidated SLA configurations view policy" ON public.sla_configurations
        FOR SELECT USING (auth.role() = 'authenticated');

    -- Admin management policy for sla_configurations
    DROP POLICY IF EXISTS "Admin management for SLA configurations" ON public.sla_configurations;
    DROP POLICY IF EXISTS "Admin INSERT for SLA configurations" ON public.sla_configurations;
    CREATE POLICY "Admin INSERT for SLA configurations" ON public.sla_configurations
        FOR INSERT WITH CHECK (
            auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
    DROP POLICY IF EXISTS "Admin UPDATE for SLA configurations" ON public.sla_configurations;
    CREATE POLICY "Admin UPDATE for SLA configurations" ON public.sla_configurations
        FOR UPDATE USING (
            auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
    DROP POLICY IF EXISTS "Admin DELETE for SLA configurations" ON public.sla_configurations;
    CREATE POLICY "Admin DELETE for SLA configurations" ON public.sla_configurations
        FOR DELETE USING (
            auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
