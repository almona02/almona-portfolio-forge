-- Migration: Fix Supabase Security Linter Issues
-- Date: 2025-12-03
-- Description: Addresses critical security issues identified by Supabase database linter

-- ============================================================================
-- PART 1: Fix Security Definer Views (ERRORS)
-- ============================================================================

-- Drop and recreate ml_training_data_view without SECURITY DEFINER
-- This view aggregates remnant data for ML training purposes
DROP VIEW IF EXISTS public.ml_training_data_view;
CREATE VIEW public.ml_training_data_view AS
SELECT 
  mr.id as remnant_id,
  mr.user_id,
  mr.profile_id,
  mr.length as remnant_length,
  EXTRACT(EPOCH FROM (NOW() - mr.created_at)) / 86400 as age_days,
  mr.quality,
  il.name as location_name,
  mr.usage_count,
  mr.estimated_value,
  CASE 
    WHEN mr.status = 'used' THEN 1
    WHEN mr.status = 'available' AND mr.created_at < NOW() - INTERVAL '90 days' THEN 0
    ELSE NULL
  END as label, -- 1 = reused, 0 = not reused
  mr.created_at,
  mr.used_at
FROM public.material_remnants mr
LEFT JOIN public.inventory_locations il ON mr.location_id = il.id
WHERE mr.status IN ('used', 'available')
  AND (mr.status = 'used' OR mr.created_at < NOW() - INTERVAL '90 days')
  AND mr.user_id = (SELECT auth.uid());
-- Note: View now uses invoker's permissions (SECURITY INVOKER is default) and filters by user

-- Drop and recreate calibration_patterns without SECURITY DEFINER
-- This view aggregates calibration analytics for ML pattern recognition
DROP VIEW IF EXISTS public.calibration_patterns;
CREATE VIEW public.calibration_patterns AS
SELECT 
  profile_id,
  joint_type,
  profile_width_mm,
  profile_height_mm,
  material_thickness_mm,
  cut_angle,
  AVG(k_factor) as avg_k_factor,
  STDDEV(k_factor) as k_factor_stddev,
  AVG(accuracy_mm) as avg_accuracy,
  COUNT(*) as sample_count,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as success_rate
FROM public.calibration_analytics
WHERE event_type IN ('test_result', 'job_result')
  AND profile_width_mm IS NOT NULL
  AND material_thickness_mm IS NOT NULL
  AND user_id = (SELECT auth.uid())
GROUP BY 
  profile_id,
  joint_type,
  profile_width_mm,
  profile_height_mm,
  material_thickness_mm,
  cut_angle
HAVING COUNT(*) >= 3; -- Minimum 3 samples for pattern recognition
-- Note: View now uses invoker's permissions (SECURITY INVOKER is default) and filters by user

-- ============================================================================
-- PART 2: Enable RLS on Tables Without It (ERRORS)
-- ============================================================================

-- Enable RLS on ml_training_snapshots
ALTER TABLE public.ml_training_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ml_training_snapshots
DROP POLICY IF EXISTS "Users can view own training snapshots" ON public.ml_training_snapshots;
CREATE POLICY "Users can view own training snapshots" ON public.ml_training_snapshots
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own training snapshots" ON public.ml_training_snapshots;
CREATE POLICY "Users can insert own training snapshots" ON public.ml_training_snapshots
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own training snapshots" ON public.ml_training_snapshots;
CREATE POLICY "Users can update own training snapshots" ON public.ml_training_snapshots
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own training snapshots" ON public.ml_training_snapshots;
CREATE POLICY "Users can delete own training snapshots" ON public.ml_training_snapshots
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Enable RLS on ml_prediction_logs
ALTER TABLE public.ml_prediction_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ml_prediction_logs
DROP POLICY IF EXISTS "Users can view own prediction logs" ON public.ml_prediction_logs;
CREATE POLICY "Users can view own prediction logs" ON public.ml_prediction_logs
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own prediction logs" ON public.ml_prediction_logs;
CREATE POLICY "Users can insert own prediction logs" ON public.ml_prediction_logs
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Enable RLS on algorithm_performance_logs
ALTER TABLE public.algorithm_performance_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for algorithm_performance_logs
DROP POLICY IF EXISTS "Users can view own algorithm logs" ON public.algorithm_performance_logs;
CREATE POLICY "Users can view own algorithm logs" ON public.algorithm_performance_logs
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own algorithm logs" ON public.algorithm_performance_logs;
CREATE POLICY "Users can insert own algorithm logs" ON public.algorithm_performance_logs
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 3: Fix Function Search Path (WARNINGS)
-- ============================================================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix expire_old_listings function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expire_old_listings' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.expire_old_listings()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public, pg_temp
      AS $body$
      BEGIN
        UPDATE public.remnant_marketplace_listings
        SET status = 'expired'
        WHERE expires_at < NOW() AND status = 'active';
      END;
      $body$;
    $func$;
  END IF;
END;
$$;

-- Fix create_free_subscription_for_new_user function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_free_subscription_for_new_user' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.create_free_subscription_for_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
      BEGIN
        INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
        VALUES (NEW.id, 'free', 'active', NOW(), NOW() + INTERVAL '100 years')
        ON CONFLICT (user_id) DO NOTHING;
        RETURN NEW;
      END;
      $body$;
    $func$;
  END IF;
END;
$$;

-- Fix extract_calibration_analytics_fields function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'extract_calibration_analytics_fields' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.extract_calibration_analytics_fields()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public, pg_temp
      AS $body$
      BEGIN
        -- Extract and store analytics fields from event_data
        IF NEW.event_data IS NOT NULL THEN
          NEW.joint_type := COALESCE(NEW.event_data->>'joint_type', NEW.joint_type);
          NEW.confidence_score := COALESCE((NEW.event_data->>'confidence_score')::DECIMAL, NEW.confidence_score);
        END IF;
        RETURN NEW;
      END;
      $body$;
    $func$;
  END IF;
END;
$$;

-- Fix log_fabricator_changes function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_fabricator_changes' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.log_fabricator_changes()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
      BEGIN
        INSERT INTO public.fabricator_audit_logs (
          user_id,
          table_name,
          record_id,
          action,
          old_values,
          new_values,
          created_at
        ) VALUES (
          COALESCE((SELECT auth.uid()), '00000000-0000-0000-0000-000000000000'::UUID),
          TG_TABLE_NAME,
          COALESCE(NEW.id, OLD.id),
          TG_OP,
          CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
          CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
          NOW()
        );
        RETURN COALESCE(NEW, OLD);
      END;
      $body$;
    $func$;
  END IF;
END;
$$;

-- ============================================================================
-- PART 4: Add RLS Policies to Tables with RLS Enabled but No Policies (INFO)
-- ============================================================================

-- order_items policies
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_items.order_id 
      AND o.user_id = (SELECT auth.uid())
    )
  );

-- orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- quote_items policies
DROP POLICY IF EXISTS "Users can view own quote items" ON public.quote_items;
CREATE POLICY "Users can view own quote items" ON public.quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_items.quote_id 
      AND q.user_id = (SELECT auth.uid())
    )
  );

-- quotes policies
DROP POLICY IF EXISTS "Users can view own quotes" ON public.quotes;
CREATE POLICY "Users can view own quotes" ON public.quotes
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own quotes" ON public.quotes;
CREATE POLICY "Users can insert own quotes" ON public.quotes
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
CREATE POLICY "Users can update own quotes" ON public.quotes
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ticket_assignments_history policies
DROP POLICY IF EXISTS "Users can view ticket assignment history" ON public.ticket_assignments_history;
CREATE POLICY "Users can view ticket assignment history" ON public.ticket_assignments_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_assignments_history.ticket_id 
      AND t.user_id = (SELECT auth.uid())
    )
  );

-- ticket_escalations policies
DROP POLICY IF EXISTS "Users can view ticket escalations" ON public.ticket_escalations;
CREATE POLICY "Users can view ticket escalations" ON public.ticket_escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_escalations.ticket_id 
      AND t.user_id = (SELECT auth.uid())
    )
  );

-- ticket_messages policies
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_messages.ticket_id 
      AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert ticket messages" ON public.ticket_messages;
CREATE POLICY "Users can insert ticket messages" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_messages.ticket_id 
      AND t.user_id = (SELECT auth.uid())
    )
  );

-- warranty_registrations policies (uses customer_id, not user_id)
DROP POLICY IF EXISTS "Users can view own warranty registrations" ON public.warranty_registrations;
CREATE POLICY "Users can view own warranty registrations" ON public.warranty_registrations
  FOR SELECT USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own warranty registrations" ON public.warranty_registrations;
CREATE POLICY "Users can insert own warranty registrations" ON public.warranty_registrations
  FOR INSERT WITH CHECK (customer_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 5: Drop Duplicate Indexes (WARNINGS)
-- ============================================================================

-- Drop duplicate index on service_tickets (keep idx_service_tickets_customer)
DROP INDEX IF EXISTS public.idx_service_tickets_user_created;

-- Drop duplicate index on stock_movements (keep idx_stock_movements_user_created)
DROP INDEX IF EXISTS public.idx_stock_movements_user_created_desc;

-- ============================================================================
-- PART 6: Add Missing Foreign Key Index (INFO)
-- ============================================================================

-- Add index for remnant_marketplace_listings.remnant_id foreign key
CREATE INDEX IF NOT EXISTS idx_remnant_marketplace_listings_remnant_id 
ON public.remnant_marketplace_listings(remnant_id);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Fixed:
-- - 2 SECURITY DEFINER views converted to SECURITY INVOKER
-- - 3 tables now have RLS enabled with proper policies
-- - 5 functions now have search_path set
-- - 8 tables with RLS but no policies now have policies
-- - 2 duplicate indexes removed
-- - 1 missing foreign key index added
--
-- Note: Anonymous access policies (auth_allow_anonymous_sign_ins) were NOT changed
-- as some are intentional for public-facing data (products, categories, etc.)
--
-- Note: RLS initplan warnings require manual review of each policy to change
-- auth.uid() to (SELECT auth.uid()) for better performance at scale.

