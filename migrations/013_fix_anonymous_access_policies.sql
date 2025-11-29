-- Migration 013: Fix Anonymous Access Policies (with short policy names)
-- Addresses auth_allow_anonymous_sign_ins warnings by restricting anonymous access
-- Uses short policy names (max 63 chars) to avoid PostgreSQL identifier truncation
-- ============================================================================

-- IMPORTANT: This migration restricts anonymous access to user-specific tables.
-- Public-facing tables (products, categories, etc.) will continue to allow anonymous read access.
-- User-specific tables will require authentication.

-- ============================================================================
-- PART 1: PUBLIC-FACING TABLES (Keep anonymous access - these are intentional)
-- ============================================================================
-- These tables are intentionally public-facing and should allow anonymous access:
-- - categories (active categories)
-- - products (active products)
-- - product_reviews (approved reviews)
-- - exchange_rate_cache (public exchange rates)
-- - spare_parts (active spare parts)
-- - used_machines (verified unsold listings)
-- - fabricator_system_packs (global system packs)

-- No changes needed for these tables - they are correctly configured for public access.

-- ============================================================================
-- PART 2: USER-SPECIFIC TABLES (Require authentication)
-- ============================================================================
-- These tables should only be accessible to authenticated users.
-- We'll modify policies to explicitly require authentication.
-- Policy names are kept short (max 63 chars) to avoid PostgreSQL truncation.

-- 2.1: bulk_price_imports
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own bulk imports" ON public.bulk_price_imports;
    DROP POLICY IF EXISTS "Users can view their own bulk imports" ON public.bulk_price_imports;
    DROP POLICY IF EXISTS "auth_view_bulk_imports" ON public.bulk_price_imports;
    DROP POLICY IF EXISTS "auth_manage_bulk_imports" ON public.bulk_price_imports;
    
    CREATE POLICY "auth_view_bulk_imports" ON public.bulk_price_imports
        FOR SELECT TO authenticated USING (user_id = auth.uid());
    
    CREATE POLICY "auth_manage_bulk_imports" ON public.bulk_price_imports
        FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;

-- 2.2: collaboration_annotations
DO $$
BEGIN
    -- Drop all possible policy names (old and new)
    DROP POLICY IF EXISTS "Users can delete their own annotations" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "Users can update their own annotations" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "Users can view annotations in sessions they participate in" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "Authenticated users can view annotations in sessions they parti" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "Authenticated users can update their own annotations" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "Authenticated users can delete their own annotations" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "auth_view_session_annotations" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "auth_update_own_annotations" ON public.collaboration_annotations;
    DROP POLICY IF EXISTS "auth_delete_own_annotations" ON public.collaboration_annotations;
    
    CREATE POLICY "auth_view_session_annotations" ON public.collaboration_annotations
        FOR SELECT USING (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.collaboration_sessions cs
                WHERE cs.id = collaboration_annotations.session_id
                AND (cs.created_by = auth.uid() OR auth.uid() = ANY(cs.participants))
            )
        );
    
    CREATE POLICY "auth_update_own_annotations" ON public.collaboration_annotations
        FOR UPDATE USING (auth.uid() IS NOT NULL AND author_id = auth.uid());
    
    CREATE POLICY "auth_delete_own_annotations" ON public.collaboration_annotations
        FOR DELETE USING (auth.uid() IS NOT NULL AND author_id = auth.uid());
END $$;

-- 2.3: collaboration_sessions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Session creators can delete their sessions" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "Session creators can update their sessions" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "Users can view sessions they participate in" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "Authenticated session creators can delete their sessions" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "Authenticated session creators can update their sessions" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "auth_view_sessions" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "auth_update_own_sessions" ON public.collaboration_sessions;
    DROP POLICY IF EXISTS "auth_delete_own_sessions" ON public.collaboration_sessions;
    
    CREATE POLICY "auth_view_sessions" ON public.collaboration_sessions
        FOR SELECT USING (
            auth.uid() IS NOT NULL 
            AND (created_by = auth.uid() OR auth.uid() = ANY(participants))
        );
    
    CREATE POLICY "auth_update_own_sessions" ON public.collaboration_sessions
        FOR UPDATE USING (auth.uid() IS NOT NULL AND created_by = auth.uid());
    
    CREATE POLICY "auth_delete_own_sessions" ON public.collaboration_sessions
        FOR DELETE USING (auth.uid() IS NOT NULL AND created_by = auth.uid());
END $$;

-- 2.4: fabricator_accessories
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can delete their own accessories" ON public.fabricator_accessories;
    DROP POLICY IF EXISTS "Users can update their own accessories" ON public.fabricator_accessories;
    DROP POLICY IF EXISTS "Users can view their own accessories" ON public.fabricator_accessories;
    DROP POLICY IF EXISTS "auth_view_accessories" ON public.fabricator_accessories;
    DROP POLICY IF EXISTS "auth_update_accessories" ON public.fabricator_accessories;
    DROP POLICY IF EXISTS "auth_delete_accessories" ON public.fabricator_accessories;
    
    CREATE POLICY "auth_view_accessories" ON public.fabricator_accessories
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_update_accessories" ON public.fabricator_accessories
        FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_delete_accessories" ON public.fabricator_accessories
        FOR DELETE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.5: fabricator_audit_logs
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role can view all audit logs" ON public.fabricator_audit_logs;
    DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.fabricator_audit_logs;
    DROP POLICY IF EXISTS "service_role_view_all_audit_logs" ON public.fabricator_audit_logs;
    DROP POLICY IF EXISTS "auth_view_own_audit_logs" ON public.fabricator_audit_logs;
    
    CREATE POLICY "service_role_view_all_audit_logs" ON public.fabricator_audit_logs
        FOR SELECT TO service_role USING (true);
    
    CREATE POLICY "auth_view_own_audit_logs" ON public.fabricator_audit_logs
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.6: fabricator_backup_operations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own backup operations" ON public.fabricator_backup_operations;
    DROP POLICY IF EXISTS "auth_view_backup_ops" ON public.fabricator_backup_operations;
    
    CREATE POLICY "auth_view_backup_ops" ON public.fabricator_backup_operations
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.7: fabricator_backup_snapshots
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own backups" ON public.fabricator_backup_snapshots;
    DROP POLICY IF EXISTS "Users can view their own backups" ON public.fabricator_backup_snapshots;
    DROP POLICY IF EXISTS "auth_view_backups" ON public.fabricator_backup_snapshots;
    DROP POLICY IF EXISTS "auth_manage_backups" ON public.fabricator_backup_snapshots;
    
    CREATE POLICY "auth_view_backups" ON public.fabricator_backup_snapshots
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_manage_backups" ON public.fabricator_backup_snapshots
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.8: fabricator_customers
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owner manages own fabricator customers" ON public.fabricator_customers;
    DROP POLICY IF EXISTS "Authenticated owners manage own fabricator customers" ON public.fabricator_customers;
    DROP POLICY IF EXISTS "auth_manage_customers" ON public.fabricator_customers;
    
    CREATE POLICY "auth_manage_customers" ON public.fabricator_customers
        FOR ALL USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());
END $$;

-- 2.9: fabricator_positions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owner manages own positions" ON public.fabricator_positions;
    DROP POLICY IF EXISTS "Authenticated owners manage own positions" ON public.fabricator_positions;
    DROP POLICY IF EXISTS "auth_manage_positions" ON public.fabricator_positions;
    
    CREATE POLICY "auth_manage_positions" ON public.fabricator_positions
        FOR ALL USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());
END $$;

-- 2.10: fabricator_profiles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.fabricator_profiles;
    DROP POLICY IF EXISTS "Users can update their own profiles" ON public.fabricator_profiles;
    DROP POLICY IF EXISTS "Users can view their own profiles" ON public.fabricator_profiles;
    DROP POLICY IF EXISTS "auth_view_profiles" ON public.fabricator_profiles;
    DROP POLICY IF EXISTS "auth_update_profiles" ON public.fabricator_profiles;
    DROP POLICY IF EXISTS "auth_delete_profiles" ON public.fabricator_profiles;
    
    CREATE POLICY "auth_view_profiles" ON public.fabricator_profiles
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_update_profiles" ON public.fabricator_profiles
        FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_delete_profiles" ON public.fabricator_profiles
        FOR DELETE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.11: fabricator_project_members
DO $$
BEGIN
    DROP POLICY IF EXISTS "Project members visibility" ON public.fabricator_project_members;
    DROP POLICY IF EXISTS "Project owner manages members" ON public.fabricator_project_members;
    DROP POLICY IF EXISTS "Authenticated project members visibility" ON public.fabricator_project_members;
    DROP POLICY IF EXISTS "Authenticated project owner manages members" ON public.fabricator_project_members;
    DROP POLICY IF EXISTS "auth_view_project_members" ON public.fabricator_project_members;
    DROP POLICY IF EXISTS "auth_manage_project_members" ON public.fabricator_project_members;
    
    CREATE POLICY "auth_view_project_members" ON public.fabricator_project_members
        FOR SELECT USING (
            auth.uid() IS NOT NULL 
            AND (
                member_profile_id IN (SELECT id FROM public.fabricator_profiles WHERE user_id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.fabricator_projects fp
                    WHERE fp.id = fabricator_project_members.project_id
                    AND fp.owner_user_id = auth.uid()
                )
            )
        );
    
    CREATE POLICY "auth_manage_project_members" ON public.fabricator_project_members
        FOR ALL USING (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.fabricator_projects fp
                WHERE fp.id = fabricator_project_members.project_id
                AND fp.owner_user_id = auth.uid()
            )
        );
END $$;

-- 2.12: fabricator_projects
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owner manages own projects" ON public.fabricator_projects;
    DROP POLICY IF EXISTS "Authenticated owners manage own projects" ON public.fabricator_projects;
    DROP POLICY IF EXISTS "auth_manage_projects" ON public.fabricator_projects;
    
    CREATE POLICY "auth_manage_projects" ON public.fabricator_projects
        FOR ALL USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());
END $$;

-- 2.13: fabricator_query_metrics
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role can view all query metrics" ON public.fabricator_query_metrics;
    DROP POLICY IF EXISTS "Users can view their own query metrics" ON public.fabricator_query_metrics;
    DROP POLICY IF EXISTS "service_role_view_all_metrics" ON public.fabricator_query_metrics;
    DROP POLICY IF EXISTS "auth_view_own_metrics" ON public.fabricator_query_metrics;
    
    CREATE POLICY "service_role_view_all_metrics" ON public.fabricator_query_metrics
        FOR SELECT TO service_role USING (true);
    
    CREATE POLICY "auth_view_own_metrics" ON public.fabricator_query_metrics
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.14: fabricator_system_packs
-- Note: This table has "Global system packs readable" which should allow anonymous access
-- We'll keep that policy but restrict the owner-managed policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owner manages tenant system packs" ON public.fabricator_system_packs;
    DROP POLICY IF EXISTS "Authenticated owners manage tenant system packs" ON public.fabricator_system_packs;
    DROP POLICY IF EXISTS "auth_manage_system_packs" ON public.fabricator_system_packs;
    
    -- Keep "Global system packs readable" for anonymous access (intentional)
    -- Only restrict the owner-managed policy
    CREATE POLICY "auth_manage_system_packs" ON public.fabricator_system_packs
        FOR ALL USING (
            auth.uid() IS NOT NULL 
            AND (owner_user_id = auth.uid() OR owner_user_id IS NULL)
        );
END $$;

-- 2.15: fabricator_team_members
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owner manages own fabricator team" ON public.fabricator_team_members;
    DROP POLICY IF EXISTS "Owner manages own team" ON public.fabricator_team_members;
    DROP POLICY IF EXISTS "Authenticated owners manage own team" ON public.fabricator_team_members;
    DROP POLICY IF EXISTS "auth_manage_team" ON public.fabricator_team_members;
    
    CREATE POLICY "auth_manage_team" ON public.fabricator_team_members
        FOR ALL USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());
END $$;

-- 2.16: inventory_locations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can delete their own locations" ON public.inventory_locations;
    DROP POLICY IF EXISTS "Users can update their own locations" ON public.inventory_locations;
    DROP POLICY IF EXISTS "Users can view their own locations" ON public.inventory_locations;
    DROP POLICY IF EXISTS "auth_view_locations" ON public.inventory_locations;
    DROP POLICY IF EXISTS "auth_update_locations" ON public.inventory_locations;
    DROP POLICY IF EXISTS "auth_delete_locations" ON public.inventory_locations;
    
    CREATE POLICY "auth_view_locations" ON public.inventory_locations
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_update_locations" ON public.inventory_locations
        FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_delete_locations" ON public.inventory_locations
        FOR DELETE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.17: inventory_logs
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view inventory logs" ON public.inventory_logs;
    DROP POLICY IF EXISTS "Authenticated admins can view inventory logs" ON public.inventory_logs;
    DROP POLICY IF EXISTS "auth_admins_view_logs" ON public.inventory_logs;
    
    CREATE POLICY "auth_admins_view_logs" ON public.inventory_logs
        FOR SELECT USING (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        );
END $$;

-- 2.18: inventory_reservations
-- Note: This table doesn't have user_id - it uses reference_id to link to quotes/orders
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.inventory_reservations;
    DROP POLICY IF EXISTS "Users can view their own reservations" ON public.inventory_reservations;
    DROP POLICY IF EXISTS "Authenticated admins can manage all reservations" ON public.inventory_reservations;
    DROP POLICY IF EXISTS "auth_admins_manage_reservations" ON public.inventory_reservations;
    DROP POLICY IF EXISTS "auth_view_reservations" ON public.inventory_reservations;
    
    CREATE POLICY "auth_admins_manage_reservations" ON public.inventory_reservations
        FOR ALL USING (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'sales_rep')
            )
        );
    
    CREATE POLICY "auth_view_reservations" ON public.inventory_reservations
        FOR SELECT USING (
            auth.uid() IS NOT NULL 
            AND reference_id IN (
                SELECT id FROM public.quotes WHERE user_id = auth.uid()
                UNION
                SELECT id FROM public.orders WHERE user_id = auth.uid()
            )
        );
END $$;

-- 2.19: labor_cost_configurations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own labor costs" ON public.labor_cost_configurations;
    DROP POLICY IF EXISTS "Users can view their own labor costs" ON public.labor_cost_configurations;
    DROP POLICY IF EXISTS "auth_view_labor_costs" ON public.labor_cost_configurations;
    DROP POLICY IF EXISTS "auth_manage_labor_costs" ON public.labor_cost_configurations;
    
    CREATE POLICY "auth_view_labor_costs" ON public.labor_cost_configurations
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_manage_labor_costs" ON public.labor_cost_configurations
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.20: material_pricing_rules
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own material pricing" ON public.material_pricing_rules;
    DROP POLICY IF EXISTS "Users can view their own material pricing" ON public.material_pricing_rules;
    DROP POLICY IF EXISTS "auth_view_pricing_rules" ON public.material_pricing_rules;
    DROP POLICY IF EXISTS "auth_manage_pricing_rules" ON public.material_pricing_rules;
    
    CREATE POLICY "auth_view_pricing_rules" ON public.material_pricing_rules
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_manage_pricing_rules" ON public.material_pricing_rules
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.21: material_remnants
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can delete their own remnants" ON public.material_remnants;
    DROP POLICY IF EXISTS "Users can update their own remnants" ON public.material_remnants;
    DROP POLICY IF EXISTS "Users can view their own remnants" ON public.material_remnants;
    DROP POLICY IF EXISTS "auth_view_remnants" ON public.material_remnants;
    DROP POLICY IF EXISTS "auth_update_remnants" ON public.material_remnants;
    DROP POLICY IF EXISTS "auth_delete_remnants" ON public.material_remnants;
    
    CREATE POLICY "auth_view_remnants" ON public.material_remnants
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_update_remnants" ON public.material_remnants
        FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_delete_remnants" ON public.material_remnants
        FOR DELETE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.22: notifications
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "auth_view_notifications" ON public.notifications;
    
    CREATE POLICY "auth_view_notifications" ON public.notifications
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.23: orders
-- Note: This table has some policies that allow authenticated access
-- We'll update them to be explicit about authentication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND policyname = 'Users can view their own orders'
    ) THEN
        DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
        CREATE POLICY "auth_view_orders" ON public.orders
            FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
END $$;

-- 2.24: price_history
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own price history" ON public.price_history;
    DROP POLICY IF EXISTS "auth_view_price_history" ON public.price_history;
    
    CREATE POLICY "auth_view_price_history" ON public.price_history
        FOR SELECT USING (auth.uid() IS NOT NULL AND changed_by = auth.uid());
END $$;

-- 2.25: price_validation_alerts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.price_validation_alerts;
    DROP POLICY IF EXISTS "Users can view their own alerts" ON public.price_validation_alerts;
    DROP POLICY IF EXISTS "auth_view_alerts" ON public.price_validation_alerts;
    DROP POLICY IF EXISTS "auth_manage_alerts" ON public.price_validation_alerts;
    
    CREATE POLICY "auth_view_alerts" ON public.price_validation_alerts
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_manage_alerts" ON public.price_validation_alerts
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.26: pricing_configurations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own pricing configs" ON public.pricing_configurations;
    DROP POLICY IF EXISTS "Users can view their own pricing configs" ON public.pricing_configurations;
    DROP POLICY IF EXISTS "auth_view_pricing_configs" ON public.pricing_configurations;
    DROP POLICY IF EXISTS "auth_manage_pricing_configs" ON public.pricing_configurations;
    
    CREATE POLICY "auth_view_pricing_configs" ON public.pricing_configurations
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_manage_pricing_configs" ON public.pricing_configurations
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.27: profile_accessory_compatibility
-- Note: This table doesn't have user_id - ownership is determined through fabricator_profiles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own compatibilities" ON public.profile_accessory_compatibility;
    DROP POLICY IF EXISTS "Users can view their own compatibilities" ON public.profile_accessory_compatibility;
    DROP POLICY IF EXISTS "auth_view_compatibilities" ON public.profile_accessory_compatibility;
    DROP POLICY IF EXISTS "auth_manage_compatibilities" ON public.profile_accessory_compatibility;
    
    CREATE POLICY "auth_view_compatibilities" ON public.profile_accessory_compatibility
        FOR SELECT USING (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.fabricator_profiles fp
                WHERE fp.id = profile_accessory_compatibility.profile_id
                AND fp.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "auth_manage_compatibilities" ON public.profile_accessory_compatibility
        FOR ALL USING (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.fabricator_profiles fp
                WHERE fp.id = profile_accessory_compatibility.profile_id
                AND fp.user_id = auth.uid()
            )
        );
END $$;

-- 2.28: profiles
-- Note: This table has "Admins can view all profiles" and "Profiles SELECT policy"
-- We'll keep admin access but make user-specific policies require auth
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
        CREATE POLICY "auth_view_own_profile" ON public.profiles
            FOR SELECT USING (auth.uid() IS NOT NULL AND id = auth.uid());
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
        CREATE POLICY "auth_update_own_profile" ON public.profiles
            FOR UPDATE USING (auth.uid() IS NOT NULL AND id = auth.uid());
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can update their own profile (unified)'
    ) THEN
        DROP POLICY IF EXISTS "Users can update their own profile (unified)" ON public.profiles;
        CREATE POLICY "auth_update_own_profile_unified" ON public.profiles
            FOR UPDATE USING (auth.uid() IS NOT NULL AND id = auth.uid());
    END IF;
    
END $$;

-- 2.29: quotes
-- Note: This table has admin policies and authenticated policies
-- We'll ensure user-specific policies require auth
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quotes' 
        AND policyname = 'Users can view their own quotes'
    ) THEN
        DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
        CREATE POLICY "auth_view_quotes" ON public.quotes
            FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quotes' 
        AND policyname = 'Users can update their own draft quotes'
    ) THEN
        DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
        CREATE POLICY "auth_update_draft_quotes" ON public.quotes
            FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid() AND status = 'draft');
    END IF;
    
END $$;

-- 2.30: recently_viewed
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
    DROP POLICY IF EXISTS "auth_manage_recently_viewed" ON public.recently_viewed;
    
    CREATE POLICY "auth_manage_recently_viewed" ON public.recently_viewed
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.31: remnant_utilization_analytics
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own analytics" ON public.remnant_utilization_analytics;
    DROP POLICY IF EXISTS "auth_view_analytics" ON public.remnant_utilization_analytics;
    
    CREATE POLICY "auth_view_analytics" ON public.remnant_utilization_analytics
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.32: stock_alerts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update their own stock alerts" ON public.stock_alerts;
    DROP POLICY IF EXISTS "Users can view their own stock alerts" ON public.stock_alerts;
    DROP POLICY IF EXISTS "auth_view_stock_alerts" ON public.stock_alerts;
    DROP POLICY IF EXISTS "auth_update_stock_alerts" ON public.stock_alerts;
    
    CREATE POLICY "auth_view_stock_alerts" ON public.stock_alerts
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "auth_update_stock_alerts" ON public.stock_alerts
        FOR UPDATE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.33: stock_movements
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own stock movements" ON public.stock_movements;
    DROP POLICY IF EXISTS "auth_view_stock_movements" ON public.stock_movements;
    
    CREATE POLICY "auth_view_stock_movements" ON public.stock_movements
        FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.34: user_addresses
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage addresses" ON public.user_addresses;
    DROP POLICY IF EXISTS "Users manage own addresses" ON public.user_addresses;
    DROP POLICY IF EXISTS "Authenticated admins manage addresses" ON public.user_addresses;
    DROP POLICY IF EXISTS "auth_manage_addresses" ON public.user_addresses;
    
    CREATE POLICY "auth_manage_addresses" ON public.user_addresses
        FOR ALL USING (
            auth.uid() IS NOT NULL 
            AND (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
                OR user_id = auth.uid()
            )
        );
END $$;

-- 2.35: warranty_plans and warranty_registrations
-- Note: These have policies like "warranty_plans_select_authenticated" which should already require auth
-- We'll leave them as-is since they're named to indicate authenticated access

-- 2.36: wishlists
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
    DROP POLICY IF EXISTS "auth_manage_wishlist" ON public.wishlists;
    
    CREATE POLICY "auth_manage_wishlist" ON public.wishlists
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- 2.37: workspace_snapshots
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users manage own workspace snapshot" ON public.workspace_snapshots;
    DROP POLICY IF EXISTS "Users manage own workspace snapshots" ON public.workspace_snapshots;
    DROP POLICY IF EXISTS "auth_manage_workspace_snapshots" ON public.workspace_snapshots;
    
    CREATE POLICY "auth_manage_workspace_snapshots" ON public.workspace_snapshots
        FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
END $$;

-- ============================================================================
-- PART 3: NOTES ON REMAINING WARNINGS
-- ============================================================================

-- The following warnings are EXPECTED and INTENTIONAL:
-- - categories: "Anyone can view active categories" - Public catalog access
-- - exchange_rate_cache: "Public can view exchange rates" - Public data
-- - fabricator_system_packs: "Global system packs readable" - Public catalog
-- - product_reviews: "Anyone can view approved reviews" - Public reviews
-- - products: "Anyone can view active products" - Public catalog
-- - spare_parts: "Anyone can view active spare parts" - Public catalog
-- - used_machines: "Public can view verified unsold listings" - Public listings
--
-- These are e-commerce catalog tables that should be publicly readable.
-- The linter warns about them, but this is the intended behavior.

-- auth_leaked_password_protection: This is a Supabase Auth setting, not a database policy.
-- To enable: Go to Supabase Dashboard → Authentication → Settings → Password Security
-- Enable "Leaked Password Protection" to check passwords against HaveIBeenPwned.org

-- vulnerable_postgres_version: This requires a database upgrade.
-- To upgrade: Go to Supabase Dashboard → Settings → Infrastructure → Database
-- Follow the upgrade instructions for your Postgres version.

-- Success message
SELECT 'Anonymous access policies updated: User-specific tables now require authentication' as message;

