-- Migration 027: Comprehensive Fix for Anonymous Access Policies
-- Addresses all auth_allow_anonymous_sign_ins warnings by requiring authentication
-- ============================================================================
-- This migration updates all RLS policies to explicitly require authentication
-- by using "TO authenticated" or checking auth.role() = 'authenticated'
-- ============================================================================
-- ============================================================================
-- PART 1: USER-SPECIFIC TABLES - Require Authentication
-- ============================================================================
-- These tables contain user-specific data and should NOT allow anonymous access
-- 1.1: algorithm_performance_logs
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own algorithm logs" ON public.algorithm_performance_logs;
CREATE POLICY "Users can view own algorithm logs" ON public.algorithm_performance_logs FOR
SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own algorithm logs" ON public.algorithm_performance_logs;
CREATE POLICY "Users can insert own algorithm logs" ON public.algorithm_performance_logs FOR
INSERT TO authenticated WITH CHECK (user_id = auth.uid());
END $$;
-- 1.2: audit_signatures
DO $$ BEGIN DROP POLICY IF EXISTS "Admins can view audit signatures" ON public.audit_signatures;
CREATE POLICY "Admins can view audit signatures" ON public.audit_signatures FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END $$;
-- 1.3: bending_calculations
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN -- Check if user_id column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'bending_calculations'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'bending_calculations'
) THEN DROP POLICY IF EXISTS "Users can view own bending calculations" ON public.bending_calculations;
DROP POLICY IF EXISTS "Authenticated users can view bending calculations" ON public.bending_calculations;
IF has_user_id THEN CREATE POLICY "Authenticated users can view bending calculations" ON public.bending_calculations FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role IN ('admin', 'technical_officer')
        )
    );
ELSE CREATE POLICY "Authenticated users can view bending calculations" ON public.bending_calculations FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.4: bulk_price_imports
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_bulk_imports" ON public.bulk_price_imports;
DROP POLICY IF EXISTS "auth_view_bulk_imports" ON public.bulk_price_imports;
CREATE POLICY "auth_view_bulk_imports" ON public.bulk_price_imports FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_manage_bulk_imports" ON public.bulk_price_imports FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.5: calibration_analytics
DO $$ BEGIN DROP POLICY IF EXISTS "Users view own analytics" ON public.calibration_analytics;
CREATE POLICY "Users view own analytics" ON public.calibration_analytics FOR
SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own analytics" ON public.calibration_analytics;
CREATE POLICY "Users insert own analytics" ON public.calibration_analytics FOR
INSERT TO authenticated WITH CHECK (user_id = auth.uid());
END $$;
-- 1.6: collaboration_annotations
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_session_annotations" ON public.collaboration_annotations;
DROP POLICY IF EXISTS "auth_update_own_annotations" ON public.collaboration_annotations;
DROP POLICY IF EXISTS "auth_delete_own_annotations" ON public.collaboration_annotations;
CREATE POLICY "auth_view_session_annotations" ON public.collaboration_annotations FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.collaboration_sessions cs
            WHERE cs.id = collaboration_annotations.session_id
                AND (
                    cs.created_by = auth.uid()
                    OR auth.uid() = ANY(cs.participants)
                )
        )
    );
CREATE POLICY "auth_update_own_annotations" ON public.collaboration_annotations FOR
UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "auth_delete_own_annotations" ON public.collaboration_annotations FOR DELETE TO authenticated USING (author_id = auth.uid());
END $$;
-- 1.7: collaboration_sessions
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_sessions" ON public.collaboration_sessions;
DROP POLICY IF EXISTS "auth_update_own_sessions" ON public.collaboration_sessions;
DROP POLICY IF EXISTS "auth_delete_own_sessions" ON public.collaboration_sessions;
CREATE POLICY "auth_view_sessions" ON public.collaboration_sessions FOR
SELECT TO authenticated USING (
        created_by = auth.uid()
        OR auth.uid() = ANY(participants)
    );
CREATE POLICY "auth_update_own_sessions" ON public.collaboration_sessions FOR
UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "auth_delete_own_sessions" ON public.collaboration_sessions FOR DELETE TO authenticated USING (created_by = auth.uid());
END $$;
-- 1.8: design_comments
DO $$ BEGIN DROP POLICY IF EXISTS "Users view own project comments" ON public.design_comments;
CREATE POLICY "Users view own project comments" ON public.design_comments FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.fabricator_projects fp
            WHERE fp.id = design_comments.project_id
                AND fp.owner_user_id = auth.uid()
        )
    );
END $$;
-- 1.9: erp_transaction_log
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_quote_id BOOLEAN;
BEGIN -- Check if columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'erp_transaction_log'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'erp_transaction_log'
            AND column_name = 'quote_id'
    ) INTO has_quote_id;
-- Only create policy if table exists
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'erp_transaction_log'
) THEN -- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own transaction logs" ON public.erp_transaction_log;
DROP POLICY IF EXISTS "Admins can view transaction logs" ON public.erp_transaction_log;
-- Create appropriate policy based on available columns
IF has_user_id THEN CREATE POLICY "Users can view own transaction logs" ON public.erp_transaction_log FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
ELSIF has_quote_id THEN -- Link through quotes table to get user_id
CREATE POLICY "Users can view own transaction logs" ON public.erp_transaction_log FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.quotes q
            WHERE q.id = erp_transaction_log.quote_id
                AND q.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
ELSE -- No user association, allow admins only
CREATE POLICY "Admins can view transaction logs" ON public.erp_transaction_log FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END IF;
END IF;
END $$;
-- 1.10: exchange_rate_cache
-- Note: This table should allow public read access for exchange rates
-- But we'll restrict the service role policy
DO $$ BEGIN -- Keep public read policy but ensure service role policy is restricted
IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'exchange_rate_cache'
        AND policyname = 'Service role can manage exchange rates'
) THEN DROP POLICY IF EXISTS "Service role can manage exchange rates" ON public.exchange_rate_cache;
CREATE POLICY "Service role can manage exchange rates" ON public.exchange_rate_cache FOR ALL TO service_role USING (true);
END IF;
END $$;
-- 1.11: fabricator_accessories
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_accessories" ON public.fabricator_accessories;
DROP POLICY IF EXISTS "auth_update_accessories" ON public.fabricator_accessories;
DROP POLICY IF EXISTS "auth_delete_accessories" ON public.fabricator_accessories;
CREATE POLICY "auth_view_accessories" ON public.fabricator_accessories FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_update_accessories" ON public.fabricator_accessories FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_delete_accessories" ON public.fabricator_accessories FOR DELETE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.12: fabricator_audit_logs
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_own_audit_logs" ON public.fabricator_audit_logs;
CREATE POLICY "auth_view_own_audit_logs" ON public.fabricator_audit_logs FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.13: fabricator_backup_operations
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_backup_ops" ON public.fabricator_backup_operations;
CREATE POLICY "auth_view_backup_ops" ON public.fabricator_backup_operations FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.14: fabricator_backup_snapshots
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_backups" ON public.fabricator_backup_snapshots;
DROP POLICY IF EXISTS "auth_manage_backups" ON public.fabricator_backup_snapshots;
CREATE POLICY "auth_view_backups" ON public.fabricator_backup_snapshots FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_manage_backups" ON public.fabricator_backup_snapshots FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.15: fabricator_customers
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_customers" ON public.fabricator_customers;
CREATE POLICY "auth_manage_customers" ON public.fabricator_customers FOR ALL TO authenticated USING (owner_user_id = auth.uid());
END $$;
-- 1.16: fabricator_positions
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_positions" ON public.fabricator_positions;
CREATE POLICY "auth_manage_positions" ON public.fabricator_positions FOR ALL TO authenticated USING (owner_user_id = auth.uid());
END $$;
-- 1.17: fabricator_profiles
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_profiles" ON public.fabricator_profiles;
DROP POLICY IF EXISTS "auth_update_profiles" ON public.fabricator_profiles;
DROP POLICY IF EXISTS "auth_delete_profiles" ON public.fabricator_profiles;
CREATE POLICY "auth_view_profiles" ON public.fabricator_profiles FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_update_profiles" ON public.fabricator_profiles FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_delete_profiles" ON public.fabricator_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.18: fabricator_project_members
DO $$ BEGIN DROP POLICY IF EXISTS "Project members visibility" ON public.fabricator_project_members;
DROP POLICY IF EXISTS "Project owner manages members" ON public.fabricator_project_members;
DROP POLICY IF EXISTS "auth_view_project_members" ON public.fabricator_project_members;
DROP POLICY IF EXISTS "auth_manage_project_members" ON public.fabricator_project_members;
CREATE POLICY "auth_view_project_members" ON public.fabricator_project_members FOR
SELECT TO authenticated USING (
        -- User is the project owner
        EXISTS (
            SELECT 1
            FROM public.fabricator_projects fp
            WHERE fp.id = fabricator_project_members.project_id
                AND fp.owner_user_id = auth.uid()
        )
        OR -- User is a member of the project
        member_profile_id = auth.uid()
    );
CREATE POLICY "auth_manage_project_members" ON public.fabricator_project_members FOR ALL TO authenticated USING (
    -- Only project owner can manage members
    EXISTS (
        SELECT 1
        FROM public.fabricator_projects fp
        WHERE fp.id = fabricator_project_members.project_id
            AND fp.owner_user_id = auth.uid()
    )
);
END $$;
-- 1.19: fabricator_projects
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_projects" ON public.fabricator_projects;
CREATE POLICY "auth_manage_projects" ON public.fabricator_projects FOR ALL TO authenticated USING (owner_user_id = auth.uid());
END $$;
-- 1.20: fabricator_query_metrics
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_own_metrics" ON public.fabricator_query_metrics;
CREATE POLICY "auth_view_own_metrics" ON public.fabricator_query_metrics FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.21: fabricator_system_packs
-- Note: "Global system packs readable" should allow anonymous access (intentional)
-- We only restrict the owner-managed policy
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_system_packs" ON public.fabricator_system_packs;
CREATE POLICY "auth_manage_system_packs" ON public.fabricator_system_packs FOR ALL TO authenticated USING (
    owner_user_id = auth.uid()
    OR owner_user_id IS NULL
);
END $$;
-- 1.22: fabricator_team_members
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_team" ON public.fabricator_team_members;
CREATE POLICY "auth_manage_team" ON public.fabricator_team_members FOR ALL TO authenticated USING (owner_user_id = auth.uid());
END $$;
-- 1.23: generated_gcode
DO $$
DECLARE has_generated_by BOOLEAN;
DECLARE has_user_id BOOLEAN;
BEGIN -- Check which column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'generated_gcode'
            AND column_name = 'generated_by'
    ) INTO has_generated_by;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'generated_gcode'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'generated_gcode'
) THEN DROP POLICY IF EXISTS "Users can view own gcode" ON public.generated_gcode;
DROP POLICY IF EXISTS "Users can insert own gcode" ON public.generated_gcode;
DROP POLICY IF EXISTS "Users can delete own gcode" ON public.generated_gcode;
IF has_generated_by THEN CREATE POLICY "Users can view own gcode" ON public.generated_gcode FOR
SELECT TO authenticated USING (generated_by = auth.uid());
CREATE POLICY "Users can insert own gcode" ON public.generated_gcode FOR
INSERT TO authenticated WITH CHECK (
        generated_by = auth.uid()
        OR auth.uid() IS NOT NULL
    );
CREATE POLICY "Users can delete own gcode" ON public.generated_gcode FOR DELETE TO authenticated USING (generated_by = auth.uid());
ELSIF has_user_id THEN CREATE POLICY "Users can view own gcode" ON public.generated_gcode FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own gcode" ON public.generated_gcode FOR DELETE TO authenticated USING (user_id = auth.uid());
ELSE -- No user column, allow all authenticated users
CREATE POLICY "Users can view own gcode" ON public.generated_gcode FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.24: grid_pricing
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users can view grid pricing" ON public.grid_pricing;
CREATE POLICY "Authenticated users can view grid pricing" ON public.grid_pricing FOR
SELECT TO authenticated USING (true);
END $$;
-- 1.25: inventory_locations
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "auth_update_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "auth_delete_locations" ON public.inventory_locations;
CREATE POLICY "auth_view_locations" ON public.inventory_locations FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_update_locations" ON public.inventory_locations FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_delete_locations" ON public.inventory_locations FOR DELETE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.26: inventory_logs
DO $$ BEGIN DROP POLICY IF EXISTS "auth_admins_view_logs" ON public.inventory_logs;
CREATE POLICY "auth_admins_view_logs" ON public.inventory_logs FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END $$;
-- 1.27: inventory_reservations
DO $$ BEGIN DROP POLICY IF EXISTS "auth_admins_manage_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "auth_view_reservations" ON public.inventory_reservations;
CREATE POLICY "auth_admins_manage_reservations" ON public.inventory_reservations FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role IN ('admin', 'sales_rep')
    )
);
CREATE POLICY "auth_view_reservations" ON public.inventory_reservations FOR
SELECT TO authenticated USING (
        reference_id IN (
            SELECT id
            FROM public.quotes
            WHERE user_id = auth.uid()
            UNION
            SELECT id
            FROM public.orders
            WHERE user_id = auth.uid()
        )
    );
END $$;
-- 1.28: invoice_imports
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own invoice imports" ON public.invoice_imports;
CREATE POLICY "Users can view own invoice imports" ON public.invoice_imports FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.29: job_risk_scores
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_position_id BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'job_risk_scores'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'job_risk_scores'
            AND column_name = 'position_id'
    ) INTO has_position_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'job_risk_scores'
) THEN DROP POLICY IF EXISTS "Users can view own risk scores" ON public.job_risk_scores;
IF has_user_id THEN CREATE POLICY "Users can view own risk scores" ON public.job_risk_scores FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSIF has_position_id THEN -- Link through fabricator_positions to get owner_user_id
CREATE POLICY "Users can view own risk scores" ON public.job_risk_scores FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_positions fp
            WHERE fp.id = job_risk_scores.position_id
                AND fp.owner_user_id = auth.uid()
        )
    );
ELSE -- No user association, allow all authenticated users
CREATE POLICY "Users can view own risk scores" ON public.job_risk_scores FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.30: labor_cost_configurations
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_labor_costs" ON public.labor_cost_configurations;
DROP POLICY IF EXISTS "auth_manage_labor_costs" ON public.labor_cost_configurations;
CREATE POLICY "auth_view_labor_costs" ON public.labor_cost_configurations FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_manage_labor_costs" ON public.labor_cost_configurations FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.31: machine_job_queue
DO $$
DECLARE has_queued_by BOOLEAN;
DECLARE has_user_id BOOLEAN;
BEGIN -- Check which column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machine_job_queue'
            AND column_name = 'queued_by'
    ) INTO has_queued_by;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machine_job_queue'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'machine_job_queue'
) THEN DROP POLICY IF EXISTS "Users can view own machine jobs" ON public.machine_job_queue;
DROP POLICY IF EXISTS "Users can update own machine jobs" ON public.machine_job_queue;
IF has_queued_by THEN CREATE POLICY "Users can view own machine jobs" ON public.machine_job_queue FOR
SELECT TO authenticated USING (queued_by = auth.uid());
CREATE POLICY "Users can update own machine jobs" ON public.machine_job_queue FOR
UPDATE TO authenticated USING (queued_by = auth.uid());
ELSIF has_user_id THEN CREATE POLICY "Users can view own machine jobs" ON public.machine_job_queue FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own machine jobs" ON public.machine_job_queue FOR
UPDATE TO authenticated USING (user_id = auth.uid());
ELSE -- No user column, allow all authenticated users
CREATE POLICY "Users can view own machine jobs" ON public.machine_job_queue FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.32: machine_profiles
DO $$
DECLARE has_owner_id BOOLEAN;
DECLARE has_user_id BOOLEAN;
DECLARE has_is_template BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machine_profiles'
            AND column_name = 'owner_id'
    ) INTO has_owner_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machine_profiles'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machine_profiles'
            AND column_name = 'is_template'
    ) INTO has_is_template;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'machine_profiles'
) THEN DROP POLICY IF EXISTS "Users can view own machines or templates" ON public.machine_profiles;
DROP POLICY IF EXISTS "Users can insert own machines" ON public.machine_profiles;
DROP POLICY IF EXISTS "Users can update own machines" ON public.machine_profiles;
DROP POLICY IF EXISTS "Users can delete own machines" ON public.machine_profiles;
IF has_owner_id THEN CREATE POLICY "Users can view own machines or templates" ON public.machine_profiles FOR
SELECT TO authenticated USING (
        owner_id = auth.uid()
        OR owner_id IS NULL
    );
CREATE POLICY "Users can insert own machines" ON public.machine_profiles FOR
INSERT TO authenticated WITH CHECK (
        owner_id = auth.uid()
        OR (
            owner_id IS NULL
            AND auth.uid() IS NOT NULL
        )
    );
CREATE POLICY "Users can update own machines" ON public.machine_profiles FOR
UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own machines" ON public.machine_profiles FOR DELETE TO authenticated USING (owner_id = auth.uid());
ELSIF has_user_id THEN CREATE POLICY "Users can view own machines or templates" ON public.machine_profiles FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR (
            has_is_template
            AND is_template = true
        )
    );
CREATE POLICY "Users can update own machines" ON public.machine_profiles FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own machines" ON public.machine_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
ELSE -- No user column, allow all authenticated users
CREATE POLICY "Users can view own machines or templates" ON public.machine_profiles FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.33: machining_templates
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_is_public BOOLEAN;
BEGIN -- Check if columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machining_templates'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'machining_templates'
            AND column_name = 'is_public'
    ) INTO has_is_public;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'machining_templates'
) THEN DROP POLICY IF EXISTS "Users can view own machining templates" ON public.machining_templates;
DROP POLICY IF EXISTS "Authenticated users can view machining templates" ON public.machining_templates;
IF has_user_id
AND has_is_public THEN CREATE POLICY "Authenticated users can view machining templates" ON public.machining_templates FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR is_public = true
    );
ELSIF has_user_id THEN CREATE POLICY "Authenticated users can view machining templates" ON public.machining_templates FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSE CREATE POLICY "Authenticated users can view machining templates" ON public.machining_templates FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.34: mass_production_runs
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN -- Check if user_id column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'mass_production_runs'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'mass_production_runs'
) THEN DROP POLICY IF EXISTS "Users can view own production runs" ON public.mass_production_runs;
DROP POLICY IF EXISTS "Authenticated users can view production runs" ON public.mass_production_runs;
IF has_user_id THEN CREATE POLICY "Authenticated users can view production runs" ON public.mass_production_runs FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSE CREATE POLICY "Authenticated users can view production runs" ON public.mass_production_runs FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.35: material_pricing_rules
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_pricing_rules" ON public.material_pricing_rules;
DROP POLICY IF EXISTS "auth_manage_pricing_rules" ON public.material_pricing_rules;
CREATE POLICY "auth_view_pricing_rules" ON public.material_pricing_rules FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_manage_pricing_rules" ON public.material_pricing_rules FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.36: material_remnants
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_remnants" ON public.material_remnants;
DROP POLICY IF EXISTS "auth_update_remnants" ON public.material_remnants;
DROP POLICY IF EXISTS "auth_delete_remnants" ON public.material_remnants;
CREATE POLICY "auth_view_remnants" ON public.material_remnants FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_update_remnants" ON public.material_remnants FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_delete_remnants" ON public.material_remnants FOR DELETE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.37: ml_prediction_logs
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own prediction logs" ON public.ml_prediction_logs;
CREATE POLICY "Users can view own prediction logs" ON public.ml_prediction_logs FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.38: ml_training_snapshots
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own training snapshots" ON public.ml_training_snapshots;
DROP POLICY IF EXISTS "Users can update own training snapshots" ON public.ml_training_snapshots;
DROP POLICY IF EXISTS "Users can delete own training snapshots" ON public.ml_training_snapshots;
CREATE POLICY "Users can view own training snapshots" ON public.ml_training_snapshots FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own training snapshots" ON public.ml_training_snapshots FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own training snapshots" ON public.ml_training_snapshots FOR DELETE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.39: model_variants
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users can view model variants" ON public.model_variants;
CREATE POLICY "Authenticated users can view model variants" ON public.model_variants FOR
SELECT TO authenticated USING (true);
END $$;
-- 1.40: national_metrics
DO $$ BEGIN DROP POLICY IF EXISTS "Authenticated users can view national metrics" ON public.national_metrics;
CREATE POLICY "Authenticated users can view national metrics" ON public.national_metrics FOR
SELECT TO authenticated USING (true);
END $$;
-- 1.41: notifications
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "auth_view_notifications" ON public.notifications;
CREATE POLICY "auth_view_notifications" ON public.notifications FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.42: onboarding_progress
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_progress FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.43: operator_metrics
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_operator_id BOOLEAN;
DECLARE has_workshop_id BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'operator_metrics'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'operator_metrics'
            AND column_name = 'operator_id'
    ) INTO has_operator_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'operator_metrics'
            AND column_name = 'workshop_id'
    ) INTO has_workshop_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'operator_metrics'
) THEN DROP POLICY IF EXISTS "Users can view their operator metrics" ON public.operator_metrics;
DROP POLICY IF EXISTS "Users can insert their operator metrics" ON public.operator_metrics;
IF has_user_id THEN CREATE POLICY "Users can view their operator metrics" ON public.operator_metrics FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSIF has_operator_id
AND has_workshop_id THEN -- User can view if they are the operator or the workshop owner
CREATE POLICY "Users can view their operator metrics" ON public.operator_metrics FOR
SELECT TO authenticated USING (
        operator_id = auth.uid()
        OR workshop_id = auth.uid()
    );
CREATE POLICY "Users can insert their operator metrics" ON public.operator_metrics FOR
INSERT TO authenticated WITH CHECK (
        operator_id = auth.uid()
        OR workshop_id = auth.uid()
    );
ELSIF has_operator_id THEN CREATE POLICY "Users can view their operator metrics" ON public.operator_metrics FOR
SELECT TO authenticated USING (operator_id = auth.uid());
ELSE -- No user column, allow all authenticated users
CREATE POLICY "Users can view their operator metrics" ON public.operator_metrics FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.44: optimization_comparisons
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_position_id BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'optimization_comparisons'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'optimization_comparisons'
            AND column_name = 'position_id'
    ) INTO has_position_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'optimization_comparisons'
) THEN DROP POLICY IF EXISTS "Users can view own comparisons" ON public.optimization_comparisons;
IF has_user_id THEN CREATE POLICY "Users can view own comparisons" ON public.optimization_comparisons FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSIF has_position_id THEN -- Link through fabricator_positions to get owner_user_id
CREATE POLICY "Users can view own comparisons" ON public.optimization_comparisons FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_positions fp
            WHERE fp.id = optimization_comparisons.position_id
                AND fp.owner_user_id = auth.uid()
        )
    );
ELSE -- No user association, allow all authenticated users
CREATE POLICY "Users can view own comparisons" ON public.optimization_comparisons FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.45: optimization_equalizer_preferences
DO $$ BEGIN DROP POLICY IF EXISTS "Users manage own preferences" ON public.optimization_equalizer_preferences;
CREATE POLICY "Users manage own preferences" ON public.optimization_equalizer_preferences FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.46: optimization_training_data
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view their training data" ON public.optimization_training_data;
CREATE POLICY "Users can view their training data" ON public.optimization_training_data FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.47: optimizer_leads
DO $$ BEGIN DROP POLICY IF EXISTS "Admins can view optimizer leads" ON public.optimizer_leads;
CREATE POLICY "Admins can view optimizer leads" ON public.optimizer_leads FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END $$;
-- 1.48: order_items
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = order_items.order_id
                AND o.user_id = auth.uid()
        )
    );
END $$;
-- 1.49: orders
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own orders" ON public.orders FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role = 'admin'
    )
);
END $$;
-- 1.50: parametric_models
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_is_public BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'parametric_models'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'parametric_models'
            AND column_name = 'is_public'
    ) INTO has_is_public;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'parametric_models'
) THEN DROP POLICY IF EXISTS "Public read access for models" ON public.parametric_models;
IF has_user_id
AND has_is_public THEN -- Allow public models or user's own models
CREATE POLICY "Public read access for models" ON public.parametric_models FOR
SELECT USING (
        is_public = true
        OR user_id = auth.uid()
    );
ELSIF has_user_id THEN -- Only user's own models
CREATE POLICY "Public read access for models" ON public.parametric_models FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSIF has_is_public THEN -- Only public models
CREATE POLICY "Public read access for models" ON public.parametric_models FOR
SELECT USING (is_public = true);
ELSE -- No user/public columns, allow all authenticated users
CREATE POLICY "Public read access for models" ON public.parametric_models FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.51: predictive_maintenance_logs
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN -- Check if user_id column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'predictive_maintenance_logs'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'predictive_maintenance_logs'
) THEN DROP POLICY IF EXISTS "Users can view own maintenance logs" ON public.predictive_maintenance_logs;
DROP POLICY IF EXISTS "Authenticated users can view maintenance logs" ON public.predictive_maintenance_logs;
IF has_user_id THEN CREATE POLICY "Authenticated users can view maintenance logs" ON public.predictive_maintenance_logs FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role IN ('admin', 'technician')
        )
    );
ELSE CREATE POLICY "Authenticated users can view maintenance logs" ON public.predictive_maintenance_logs FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role IN ('admin', 'technician')
        )
    );
END IF;
END IF;
END $$;
-- 1.52: price_history
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_price_history" ON public.price_history;
CREATE POLICY "auth_view_price_history" ON public.price_history FOR
SELECT TO authenticated USING (
        changed_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END $$;
-- 1.53: price_validation_alerts
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_alerts" ON public.price_validation_alerts;
DROP POLICY IF EXISTS "auth_manage_alerts" ON public.price_validation_alerts;
CREATE POLICY "auth_view_alerts" ON public.price_validation_alerts FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_manage_alerts" ON public.price_validation_alerts FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.54: pricing_configurations
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_pricing_configs" ON public.pricing_configurations;
DROP POLICY IF EXISTS "auth_manage_pricing_configs" ON public.pricing_configurations;
CREATE POLICY "auth_view_pricing_configs" ON public.pricing_configurations FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_manage_pricing_configs" ON public.pricing_configurations FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.55: profile_accessory_compatibility
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_compatibilities" ON public.profile_accessory_compatibility;
DROP POLICY IF EXISTS "auth_manage_compatibilities" ON public.profile_accessory_compatibility;
CREATE POLICY "auth_view_compatibilities" ON public.profile_accessory_compatibility FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_profiles fp
            WHERE fp.id = profile_accessory_compatibility.profile_id
                AND fp.user_id = auth.uid()
        )
    );
CREATE POLICY "auth_manage_compatibilities" ON public.profile_accessory_compatibility FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.fabricator_profiles fp
        WHERE fp.id = profile_accessory_compatibility.profile_id
            AND fp.user_id = auth.uid()
    )
);
END $$;
-- 1.56: profile_calibrations
DO $$ BEGIN DROP POLICY IF EXISTS "Users manage own calibrations" ON public.profile_calibrations;
CREATE POLICY "Users manage own calibrations" ON public.profile_calibrations FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.57: profile_machining_zones
DO $$ BEGIN DROP POLICY IF EXISTS "Users manage own machining zones" ON public.profile_machining_zones;
CREATE POLICY "Users manage own machining zones" ON public.profile_machining_zones FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.58: profiles
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE TO authenticated USING (id = auth.uid());
-- Keep admin policy but restrict to authenticated
IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Admins can view all profiles'
) THEN DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
                AND p.role = 'admin'
        )
    );
END IF;
END $$;
-- 1.59: project_machines
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_project_id BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'project_machines'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'project_machines'
            AND column_name = 'project_id'
    ) INTO has_project_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'project_machines'
) THEN DROP POLICY IF EXISTS "Users can view own project machines" ON public.project_machines;
DROP POLICY IF EXISTS "Users can insert own project machines" ON public.project_machines;
DROP POLICY IF EXISTS "Users can update own project machines" ON public.project_machines;
DROP POLICY IF EXISTS "Users can delete own project machines" ON public.project_machines;
IF has_user_id THEN CREATE POLICY "Users can view own project machines" ON public.project_machines FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own project machines" ON public.project_machines FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own project machines" ON public.project_machines FOR DELETE TO authenticated USING (user_id = auth.uid());
ELSIF has_project_id THEN -- Link through fabricator_projects to get owner_user_id
CREATE POLICY "Users can view own project machines" ON public.project_machines FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_projects p
            WHERE p.id = project_machines.project_id
                AND p.owner_user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert own project machines" ON public.project_machines FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.fabricator_projects p
            WHERE p.id = project_machines.project_id
                AND p.owner_user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update own project machines" ON public.project_machines FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_projects p
            WHERE p.id = project_machines.project_id
                AND p.owner_user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete own project machines" ON public.project_machines FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.fabricator_projects p
        WHERE p.id = project_machines.project_id
            AND p.owner_user_id = auth.uid()
    )
);
ELSE -- No user association, allow all authenticated users
CREATE POLICY "Users can view own project machines" ON public.project_machines FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.60: project_versions
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_project_id BOOLEAN;
DECLARE has_position_id BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'project_versions'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'project_versions'
            AND column_name = 'project_id'
    ) INTO has_project_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'project_versions'
            AND column_name = 'position_id'
    ) INTO has_position_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'project_versions'
) THEN DROP POLICY IF EXISTS "Users view own project versions" ON public.project_versions;
IF has_user_id THEN CREATE POLICY "Users view own project versions" ON public.project_versions FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSIF has_project_id THEN -- Link through fabricator_projects to get owner_user_id
CREATE POLICY "Users view own project versions" ON public.project_versions FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_projects p
            WHERE p.id = project_versions.project_id
                AND p.owner_user_id = auth.uid()
        )
    );
ELSIF has_position_id THEN -- Link through fabricator_positions to get owner_user_id
CREATE POLICY "Users view own project versions" ON public.project_versions FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.fabricator_positions fp
            WHERE fp.id = project_versions.position_id
                AND fp.owner_user_id = auth.uid()
        )
    );
ELSE -- No user association, allow all authenticated users
CREATE POLICY "Users view own project versions" ON public.project_versions FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.61: quote_items
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own quote items" ON public.quote_items;
CREATE POLICY "Users can view own quote items" ON public.quote_items FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.quotes q
            WHERE q.id = quote_items.quote_id
                AND q.user_id = auth.uid()
        )
    );
END $$;
-- 1.62: quotes
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Users can view own quotes" ON public.quotes FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own quotes" ON public.quotes FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update their own draft quotes" ON public.quotes FOR
UPDATE TO authenticated USING (
        user_id = auth.uid()
        AND status = 'draft'
    );
CREATE POLICY "Admins can manage all quotes" ON public.quotes FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role = 'admin'
    )
);
END $$;
-- 1.63: recently_viewed
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
DROP POLICY IF EXISTS "auth_manage_recently_viewed" ON public.recently_viewed;
CREATE POLICY "auth_manage_recently_viewed" ON public.recently_viewed FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.64: remnant_marketplace_listings
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view available listings" ON public.remnant_marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.remnant_marketplace_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.remnant_marketplace_listings;
CREATE POLICY "Users can view available listings" ON public.remnant_marketplace_listings FOR
SELECT TO authenticated USING (
        status = 'available'
        OR seller_id = auth.uid()
    );
CREATE POLICY "Users can update their own listings" ON public.remnant_marketplace_listings FOR
UPDATE TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Users can delete their own listings" ON public.remnant_marketplace_listings FOR DELETE TO authenticated USING (seller_id = auth.uid());
END $$;
-- 1.65: remnant_marketplace_transactions
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view their transactions" ON public.remnant_marketplace_transactions;
CREATE POLICY "Users can view their transactions" ON public.remnant_marketplace_transactions FOR
SELECT TO authenticated USING (
        buyer_id = auth.uid()
        OR seller_id = auth.uid()
    );
END $$;
-- 1.66: remnant_utilization_analytics
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_analytics" ON public.remnant_utilization_analytics;
CREATE POLICY "auth_view_analytics" ON public.remnant_utilization_analytics FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.67: security_events
DO $$ BEGIN DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
CREATE POLICY "Admins can view all security events" ON public.security_events FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
END $$;
-- 1.68: stock_alerts
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_stock_alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "auth_update_stock_alerts" ON public.stock_alerts;
CREATE POLICY "auth_view_stock_alerts" ON public.stock_alerts FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_update_stock_alerts" ON public.stock_alerts FOR
UPDATE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.69: stock_movements
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_stock_movements" ON public.stock_movements;
CREATE POLICY "auth_view_stock_movements" ON public.stock_movements FOR
SELECT TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.70: subscriptions
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR
UPDATE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.71: thermal_analysis
DO $$
DECLARE has_user_id BOOLEAN;
BEGIN -- Check if user_id column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'thermal_analysis'
            AND column_name = 'user_id'
    ) INTO has_user_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'thermal_analysis'
) THEN DROP POLICY IF EXISTS "Users can view own thermal analysis" ON public.thermal_analysis;
DROP POLICY IF EXISTS "Authenticated users can view thermal analysis" ON public.thermal_analysis;
IF has_user_id THEN CREATE POLICY "Authenticated users can view thermal analysis" ON public.thermal_analysis FOR
SELECT TO authenticated USING (user_id = auth.uid());
ELSE CREATE POLICY "Authenticated users can view thermal analysis" ON public.thermal_analysis FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.72: ticket_assignments_history
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view ticket assignment history" ON public.ticket_assignments_history;
CREATE POLICY "Users can view ticket assignment history" ON public.ticket_assignments_history FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.service_tickets st
            WHERE st.id = ticket_assignments_history.ticket_id
                AND (
                    st.user_id = auth.uid()
                    OR st.assigned_to = auth.uid()
                )
        )
    );
END $$;
-- 1.73: ticket_escalations
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view ticket escalations" ON public.ticket_escalations;
CREATE POLICY "Users can view ticket escalations" ON public.ticket_escalations FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.service_tickets st
            WHERE st.id = ticket_escalations.ticket_id
                AND (
                    st.user_id = auth.uid()
                    OR st.assigned_to = auth.uid()
                )
        )
    );
END $$;
-- 1.74: ticket_messages
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.service_tickets st
            WHERE st.id = ticket_messages.ticket_id
                AND (
                    st.user_id = auth.uid()
                    OR st.assigned_to = auth.uid()
                )
        )
    );
END $$;
-- 1.75: used_machines
-- Note: "Public can view verified unsold listings" should allow anonymous access (intentional)
-- We only restrict the owner-managed policy
DO $$
DECLARE has_seller_id BOOLEAN;
DECLARE has_owner_id BOOLEAN;
BEGIN -- Check which column exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'used_machines'
            AND column_name = 'seller_id'
    ) INTO has_seller_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'used_machines'
            AND column_name = 'owner_id'
    ) INTO has_owner_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'used_machines'
) THEN DROP POLICY IF EXISTS "Owners manage own listings" ON public.used_machines;
DROP POLICY IF EXISTS "Admins manage all used_machines" ON public.used_machines;
IF has_seller_id THEN CREATE POLICY "Owners manage own listings" ON public.used_machines FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
ELSIF has_owner_id THEN CREATE POLICY "Owners manage own listings" ON public.used_machines FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
END IF;
CREATE POLICY "Admins manage all used_machines" ON public.used_machines FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role IN ('admin', 'sales_rep')
    )
);
END IF;
END $$;
-- 1.76: user_addresses
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_addresses" ON public.user_addresses;
CREATE POLICY "auth_manage_addresses" ON public.user_addresses FOR ALL TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND role = 'admin'
    )
);
END $$;
-- 1.77: user_documents
DO $$ BEGIN DROP POLICY IF EXISTS "auth_view_own_documents" ON public.user_documents;
DROP POLICY IF EXISTS "auth_update_own_documents" ON public.user_documents;
DROP POLICY IF EXISTS "auth_delete_own_documents" ON public.user_documents;
CREATE POLICY "auth_view_own_documents" ON public.user_documents FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_update_own_documents" ON public.user_documents FOR
UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_delete_own_documents" ON public.user_documents FOR DELETE TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.78: warranty_registrations
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own warranty registrations" ON public.warranty_registrations;
CREATE POLICY "Users can view own warranty registrations" ON public.warranty_registrations FOR
SELECT TO authenticated USING (customer_id = auth.uid());
END $$;
-- 1.79: wishlists
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "auth_manage_wishlist" ON public.wishlists;
CREATE POLICY "auth_manage_wishlist" ON public.wishlists FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.80: workshop_metrics
DO $$
DECLARE has_user_id BOOLEAN;
DECLARE has_workshop_id BOOLEAN;
BEGIN -- Check which columns exist
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'workshop_metrics'
            AND column_name = 'user_id'
    ) INTO has_user_id;
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'workshop_metrics'
            AND column_name = 'workshop_id'
    ) INTO has_workshop_id;
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'workshop_metrics'
) THEN DROP POLICY IF EXISTS "Users can view their workshop metrics" ON public.workshop_metrics;
DROP POLICY IF EXISTS "Users can update their workshop metrics" ON public.workshop_metrics;
IF has_user_id THEN CREATE POLICY "Users can view their workshop metrics" ON public.workshop_metrics FOR
SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update their workshop metrics" ON public.workshop_metrics FOR
UPDATE TO authenticated USING (user_id = auth.uid());
ELSIF has_workshop_id THEN -- User can view/update if they own the workshop
CREATE POLICY "Users can view their workshop metrics" ON public.workshop_metrics FOR
SELECT TO authenticated USING (workshop_id = auth.uid());
CREATE POLICY "Users can update their workshop metrics" ON public.workshop_metrics FOR
UPDATE TO authenticated USING (workshop_id = auth.uid());
ELSE -- No user column, allow all authenticated users
CREATE POLICY "Users can view their workshop metrics" ON public.workshop_metrics FOR
SELECT TO authenticated USING (true);
END IF;
END IF;
END $$;
-- 1.81: workspace_snapshots
DO $$ BEGIN DROP POLICY IF EXISTS "auth_manage_workspace_snapshots" ON public.workspace_snapshots;
CREATE POLICY "auth_manage_workspace_snapshots" ON public.workspace_snapshots FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;
-- 1.82: yilmaz_machines
-- Note: "Anyone can view machines" should allow anonymous access (intentional)
-- We only restrict the service role policy
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'yilmaz_machines'
        AND policyname = 'Service role can manage machines'
) THEN DROP POLICY IF EXISTS "Service role can manage machines" ON public.yilmaz_machines;
CREATE POLICY "Service role can manage machines" ON public.yilmaz_machines FOR ALL TO service_role USING (true);
END IF;
END $$;
-- ============================================================================
-- PART 2: STORAGE POLICIES
-- ============================================================================
-- 2.1: storage.objects
DO $$ BEGIN -- Keep public read policies for thumbnails (intentional)
-- But ensure they're properly scoped
IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'layout_thumbnails_public_read'
) THEN -- This policy is intentionally public for thumbnail access
-- No change needed
NULL;
END IF;
IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'profile_thumbnails_public_read'
) THEN -- This policy is intentionally public for thumbnail access
-- No change needed
NULL;
END IF;
END $$;
-- ============================================================================
-- PART 3: PUBLIC-FACING TABLES (Keep anonymous access - these are intentional)
-- ============================================================================
-- These tables are intentionally public-facing and should allow anonymous access:
-- - categories: "Anyone can view active categories"
-- - products: "Anyone can view active products"
-- - product_reviews: "Anyone can view approved reviews"
-- - exchange_rate_cache: "Public can view exchange rates"
-- - spare_parts: "Anyone can view active spare parts"
-- - used_machines: "Public can view verified unsold listings"
-- - fabricator_system_packs: "Global system packs readable"
-- - yilmaz_machines: "Anyone can view machines"
-- - parametric_models: "Public read access for models" (for public models)
-- - storage.objects: Public thumbnail access
-- No changes needed for these tables - they are correctly configured for public access.
-- ============================================================================
-- PART 4: SUMMARY AND NOTES
-- ============================================================================
-- This migration addresses all auth_allow_anonymous_sign_ins warnings by:
-- 1. Adding "TO authenticated" to all user-specific policies
-- 2. Ensuring policies check auth.role() = 'authenticated' implicitly via TO authenticated
-- 3. Keeping public-facing tables (catalog, thumbnails) as-is for legitimate public access
--
-- Remaining warnings that require manual action:
-- 1. auth_leaked_password_protection: Enable in Supabase Dashboard
--    → Authentication → Settings → Password Security → Enable "Leaked Password Protection"
--
-- 2. vulnerable_postgres_version: Upgrade database in Supabase Dashboard
--    → Settings → Infrastructure → Database → Upgrade Database
--
-- ============================================================================
SELECT 'Migration 027 completed: All user-specific tables now require authentication' as message;