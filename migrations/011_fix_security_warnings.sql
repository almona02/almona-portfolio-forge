-- Migration 011: Fix Security Warnings
-- Fixes function search_path issues and other security warnings from Supabase linter
-- ============================================================================

-- Fix 1: Add SET search_path to all functions that are missing it
-- This prevents search_path injection attacks

-- Update update_updated_at_column functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix get_low_stock_profiles
CREATE OR REPLACE FUNCTION public.get_low_stock_profiles(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  material TEXT,
  stock_quantity DECIMAL,
  min_stock_level DECIMAL,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.name,
    fp.material,
    fp.stock_quantity,
    fp.min_stock_level,
    CASE
      WHEN fp.stock_quantity <= 0 THEN 'out'
      WHEN fp.stock_quantity < fp.min_stock_level THEN 'low'
      WHEN fp.stock_quantity < fp.min_stock_level * 1.5 THEN 'medium'
      ELSE 'high'
    END as status
  FROM public.fabricator_profiles fp
  WHERE fp.user_id = p_user_id
    AND (fp.stock_quantity <= 0 OR fp.stock_quantity < fp.min_stock_level * 1.5)
  ORDER BY fp.stock_quantity ASC;
END;
$$;

-- Fix cleanup_old_audit_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.fabricator_audit_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND status = 'success';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Fix cleanup_old_query_metrics
CREATE OR REPLACE FUNCTION public.cleanup_old_query_metrics(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.fabricator_query_metrics
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Fix create_stock_alert
CREATE OR REPLACE FUNCTION public.create_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.min_stock_level AND NEW.stock_quantity > 0 THEN
    INSERT INTO public.stock_alerts (product_id, alert_type, threshold_value, current_stock)
    VALUES (NEW.id, 'low_stock', NEW.min_stock_level, NEW.stock_quantity)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF NEW.stock_quantity = 0 THEN
    INSERT INTO public.stock_alerts (product_id, alert_type, threshold_value, current_stock)
    VALUES (NEW.id, 'out_of_stock', 0, 0)
    ON CONFLICT DO NOTHING;
  END IF;
  
  INSERT INTO public.inventory_logs (product_id, old_quantity, new_quantity, change_type, reason)
  VALUES (NEW.id, OLD.stock_quantity, NEW.stock_quantity, 'adjustment', 'Stock update');
  
  RETURN NEW;
END;
$$;

-- Fix cleanup_expired_reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.products 
  SET stock_quantity = stock_quantity + (
    SELECT COALESCE(SUM(quantity), 0)
    FROM public.inventory_reservations
    WHERE product_id = products.id 
    AND status = 'reserved' 
    AND expires_at < NOW()
  )
  WHERE id IN (
    SELECT DISTINCT product_id 
    FROM public.inventory_reservations
    WHERE status = 'reserved' 
    AND expires_at < NOW()
  );
  
  UPDATE public.inventory_reservations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'reserved' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  INSERT INTO public.inventory_logs (product_id, old_quantity, new_quantity, change_type, reason)
  SELECT 
    product_id,
    0,
    quantity,
    'release',
    'Expired reservation cleanup'
  FROM public.inventory_reservations
  WHERE status = 'expired' 
  AND updated_at > NOW() - INTERVAL '1 minute';
  
  RETURN cleaned_count;
END;
$$;

-- Fix get_inventory_summary
CREATE OR REPLACE FUNCTION public.get_inventory_summary()
RETURNS TABLE (
  total_products INTEGER,
  active_products INTEGER,
  out_of_stock INTEGER,
  low_stock INTEGER,
  total_value DECIMAL
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_products,
    COUNT(*) FILTER (WHERE is_active = true)::INTEGER as active_products,
    COUNT(*) FILTER (WHERE is_active = true AND stock_quantity = 0)::INTEGER as out_of_stock,
    COUNT(*) FILTER (WHERE is_active = true AND stock_quantity > 0 AND stock_quantity <= min_stock_level)::INTEGER as low_stock,
    COALESCE(SUM(stock_quantity * COALESCE(price, 0)) FILTER (WHERE is_active = true), 0) as total_value
  FROM public.products;
END;
$$;

-- Fix calculate_final_price
CREATE OR REPLACE FUNCTION public.calculate_final_price(
  base_cost DECIMAL,
  markup_percentage DECIMAL,
  discount_percentage DECIMAL DEFAULT 0
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN ROUND(
    base_cost * (1 + markup_percentage / 100) * (1 - discount_percentage / 100),
    2
  );
END;
$$;

-- Fix get_active_pricing_config
CREATE OR REPLACE FUNCTION public.get_active_pricing_config(
  p_user_id UUID,
  p_region TEXT DEFAULT 'global',
  p_currency TEXT DEFAULT 'USD'
)
RETURNS TABLE (
  id UUID,
  region TEXT,
  currency TEXT,
  material_markup_percentage DECIMAL,
  labor_markup_percentage DECIMAL,
  hardware_markup_percentage DECIMAL,
  glazing_markup_percentage DECIMAL,
  installation_markup_percentage DECIMAL,
  default_tax_rate DECIMAL,
  min_profit_margin DECIMAL,
  max_discount_percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.region,
    pc.currency,
    pc.material_markup_percentage,
    pc.labor_markup_percentage,
    pc.hardware_markup_percentage,
    pc.glazing_markup_percentage,
    pc.installation_markup_percentage,
    pc.default_tax_rate,
    pc.min_profit_margin,
    pc.max_discount_percentage
  FROM public.pricing_configurations pc
  WHERE pc.user_id = p_user_id
    AND pc.is_active = TRUE
    AND (pc.region = p_region OR pc.region = 'global')
    AND pc.currency = p_currency
  ORDER BY 
    CASE WHEN pc.region = p_region THEN 0 ELSE 1 END,
    pc.updated_at DESC
  LIMIT 1;
END;
$$;

-- Fix log_price_change
CREATE OR REPLACE FUNCTION public.log_price_change(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_region TEXT,
  p_currency TEXT,
  p_old_price DECIMAL,
  p_new_price DECIMAL,
  p_change_reason TEXT DEFAULT NULL,
  p_changed_by UUID DEFAULT NULL,
  p_change_source TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_price_change_percentage DECIMAL;
  v_version_number INTEGER;
  v_history_id UUID;
BEGIN
  IF p_old_price > 0 THEN
    v_price_change_percentage := ((p_new_price - p_old_price) / p_old_price) * 100;
  ELSE
    v_price_change_percentage := 0;
  END IF;
  
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM public.price_history
  WHERE entity_id = p_entity_id AND entity_type = p_entity_type;
  
  INSERT INTO public.price_history (
    user_id,
    entity_type,
    entity_id,
    entity_name,
    region,
    currency,
    old_price,
    new_price,
    price_change_percentage,
    version_number,
    change_reason,
    changed_by,
    change_source,
    created_at
  )
  VALUES (
    p_user_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_region,
    p_currency,
    p_old_price,
    p_new_price,
    v_price_change_percentage,
    v_version_number,
    p_change_reason,
    COALESCE(p_changed_by, auth.uid()),
    p_change_source,
    NOW()
  )
  RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$;

-- Fix create_remnant_from_cut
-- Note: This function has multiple overloads, we need to fix all of them
-- First, get the actual function signature and fix it
DO $$
DECLARE
  v_func_oid OID;
  v_drop_sql TEXT;
BEGIN
  -- Find and drop all versions of the function
  FOR v_func_oid IN 
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_remnant_from_cut'
      AND n.nspname = 'public'
  LOOP
    SELECT format('DROP FUNCTION public.%s(%s) CASCADE', 
                  'create_remnant_from_cut',
                  pg_get_function_identity_arguments(v_func_oid))
    INTO v_drop_sql;
    
    EXECUTE v_drop_sql;
  END LOOP;
END $$;

-- Recreate with correct signature matching the original (from 006_remnant_management.sql)
CREATE OR REPLACE FUNCTION public.create_remnant_from_cut(
  p_user_id UUID,
  p_profile_id UUID,
  p_length DECIMAL,
  p_source_project_id UUID DEFAULT NULL,
  p_source_cut_id UUID DEFAULT NULL,
  p_source_stock_length DECIMAL DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_min_remnant_length DECIMAL DEFAULT 200
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remnant_id UUID;
  v_profile_cost DECIMAL;
  v_estimated_value DECIMAL;
  v_barcode TEXT;
BEGIN
  IF p_length < p_min_remnant_length THEN
    RETURN NULL;
  END IF;

  EXECUTE format('SELECT cost_per_meter FROM %I.%I WHERE id = $1', 'public', 'fabricator_profiles')
    USING p_profile_id
    INTO v_profile_cost;

  v_estimated_value := (p_length / 1000) * COALESCE(v_profile_cost, 0) * 0.5;
  v_barcode := 'RM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 12));

  INSERT INTO public.material_remnants (
    user_id, profile_id, location_id, length, width, height,
    source_project_id, source_cut_id, source_stock_length,
    estimated_value, barcode, status, quality
  ) VALUES (
    p_user_id, p_profile_id, p_location_id, p_length, NULL, NULL,
    p_source_project_id, p_source_cut_id, p_source_stock_length,
    v_estimated_value, v_barcode, 'available', 'good'
  ) RETURNING id INTO v_remnant_id;

  INSERT INTO public.stock_movements (
    user_id, profile_id, location_id, movement_type, quantity, unit,
    remnant_id, project_id, stock_before, stock_after, reason
  ) VALUES (
    p_user_id, p_profile_id, p_location_id, 'remnant_created', p_length, 'meters',
    v_remnant_id, p_source_project_id, 0, 0, 'Automatic remnant creation from cutting operation'
  );

  RETURN v_remnant_id;
END;
$$;

-- Fix use_remnant
-- Note: This function may have multiple overloads, we need to fix all of them
DO $$
DECLARE
  v_func_oid OID;
  v_drop_sql TEXT;
BEGIN
  -- Find and drop all versions of the function
  FOR v_func_oid IN 
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'use_remnant'
      AND n.nspname = 'public'
  LOOP
    SELECT format('DROP FUNCTION public.%s(%s) CASCADE', 
                  'use_remnant',
                  pg_get_function_identity_arguments(v_func_oid))
    INTO v_drop_sql;
    
    EXECUTE v_drop_sql;
  END LOOP;
END $$;

-- Recreate with correct signature matching the original (from 006_remnant_management.sql)
CREATE OR REPLACE FUNCTION public.use_remnant(
  p_remnant_id UUID,
  p_used_length DECIMAL,
  p_project_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remnant RECORD;
  v_remaining_length DECIMAL;
  v_min_remnant_length DECIMAL := 200;
  v_profile_cost DECIMAL;
BEGIN
  SELECT * INTO v_remnant
  FROM public.material_remnants
  WHERE id = p_remnant_id AND status = 'available';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_remaining_length := v_remnant.length - p_used_length;

  IF v_remaining_length < v_min_remnant_length THEN
    UPDATE public.material_remnants
    SET status = 'used',
        used_at = NOW(),
        used_in_project_id = p_project_id,
        usage_count = usage_count + 1
    WHERE id = p_remnant_id;
  ELSE
    EXECUTE format('SELECT cost_per_meter FROM %I.%I WHERE id = $1', 'public', 'fabricator_profiles')
      USING v_remnant.profile_id
      INTO v_profile_cost;
    
    UPDATE public.material_remnants
    SET length = v_remaining_length,
        used_at = NOW(),
        used_in_project_id = p_project_id,
        usage_count = usage_count + 1,
        estimated_value = (v_remaining_length / 1000) * COALESCE(v_profile_cost, 0) * 0.5
    WHERE id = p_remnant_id;
  END IF;

  INSERT INTO public.stock_movements (
    user_id, profile_id, location_id, movement_type, quantity, unit,
    remnant_id, project_id, stock_before, stock_after, reason
  ) VALUES (
    COALESCE(p_user_id, v_remnant.user_id), v_remnant.profile_id, v_remnant.location_id,
    'remnant_used', p_used_length, 'meters',
    p_remnant_id, p_project_id, v_remnant.length, v_remaining_length,
    'Remnant used in project'
  );

  RETURN TRUE;
END;
$$;

-- Fix check_stock_levels
CREATE OR REPLACE FUNCTION public.check_stock_levels(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_alert_count INTEGER := 0;
  v_alert_type TEXT;
  v_severity TEXT;
  v_reorder_qty DECIMAL;
  v_query TEXT;
BEGIN
  v_query := format('
    SELECT 
      fp.id,
      fp.stock_quantity,
      fp.min_stock_level,
      COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = %L) as remnant_count,
      COALESCE(SUM(mr.length) FILTER (WHERE mr.status = %L), 0) as remnant_length
    FROM %I.%I fp
    LEFT JOIN %I.%I mr ON mr.profile_id = fp.id AND mr.user_id = fp.user_id
    WHERE fp.user_id = $1
    GROUP BY fp.id, fp.stock_quantity, fp.min_stock_level
  ', 'available', 'available', 'public', 'fabricator_profiles', 'public', 'material_remnants');
  
  FOR v_profile IN EXECUTE v_query USING p_user_id
  LOOP
    IF v_profile.stock_quantity <= 0 THEN
      v_alert_type := 'out_of_stock';
      v_severity := 'critical';
      v_reorder_qty := GREATEST(v_profile.min_stock_level * 2, 100);
    ELSIF v_profile.stock_quantity <= v_profile.min_stock_level THEN
      v_alert_type := 'low_stock';
      v_severity := CASE 
        WHEN v_profile.stock_quantity <= v_profile.min_stock_level * 0.5 THEN 'high'
        ELSE 'medium'
      END;
      v_reorder_qty := v_profile.min_stock_level * 2 - v_profile.stock_quantity;
    ELSE
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.stock_alerts
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE
    ) THEN
      INSERT INTO public.stock_alerts (
        user_id, profile_id, alert_type, severity,
        threshold_value, current_value, reorder_quantity, reorder_priority,
        message
      ) VALUES (
        p_user_id, v_profile.id, v_alert_type, v_severity,
        v_profile.min_stock_level, v_profile.stock_quantity, v_reorder_qty,
        CASE v_severity 
          WHEN 'critical' THEN 'urgent'
          WHEN 'high' THEN 'high'
          ELSE 'medium'
        END,
        CASE v_alert_type
          WHEN 'out_of_stock' THEN 'Profile is out of stock. Immediate reorder required.'
          ELSE 'Stock level is below minimum threshold.'
        END
      );
      v_alert_count := v_alert_count + 1;
    ELSE
      UPDATE public.stock_alerts
      SET current_value = v_profile.stock_quantity,
          reorder_quantity = v_reorder_qty,
          severity = v_severity
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE;
    END IF;
  END LOOP;

  RETURN v_alert_count;
END;
$$;

-- Fix test_user_id_access (if exists)
-- Drop first if it exists with different signature, then recreate
DO $$
DECLARE
  v_func_oid OID;
  v_drop_sql TEXT;
  v_create_sql TEXT;
BEGIN
  -- Find the function by name and schema
  SELECT p.oid INTO v_func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'test_user_id_access'
    AND n.nspname = 'public'
  LIMIT 1;
  
  IF v_func_oid IS NOT NULL THEN
    -- Build drop statement with full signature (schema.function_name(args))
    SELECT format('DROP FUNCTION public.%s(%s) CASCADE', 
                  'test_user_id_access',
                  pg_get_function_identity_arguments(v_func_oid))
    INTO v_drop_sql;
    
    EXECUTE v_drop_sql;
  END IF;
  
  -- Recreate with correct signature and search_path (always recreate if dropped, or create if didn't exist)
  v_create_sql := 'CREATE OR REPLACE FUNCTION public.test_user_id_access()
    RETURNS TABLE (user_id UUID, has_access BOOLEAN)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT auth.uid() as user_id, (auth.uid() IS NOT NULL) as has_access;
    END;
    $func$;';
  
  EXECUTE v_create_sql;
END $$;

-- Fix test_dynamic_user_id (if exists)
-- Drop first if it exists with different signature, then recreate
DO $$
DECLARE
  v_func_oid OID;
  v_drop_sql TEXT;
  v_create_sql TEXT;
BEGIN
  -- Find the function by name and schema
  SELECT p.oid INTO v_func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'test_dynamic_user_id'
    AND n.nspname = 'public'
  LIMIT 1;
  
  IF v_func_oid IS NOT NULL THEN
    -- Build drop statement with full signature (schema.function_name(args))
    SELECT format('DROP FUNCTION public.%s(%s) CASCADE', 
                  'test_dynamic_user_id',
                  pg_get_function_identity_arguments(v_func_oid))
    INTO v_drop_sql;
    
    EXECUTE v_drop_sql;
  END IF;
  
  -- Recreate with correct signature and search_path (always recreate if dropped, or create if didn't exist)
  v_create_sql := 'CREATE OR REPLACE FUNCTION public.test_dynamic_user_id()
    RETURNS UUID
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $func$
    BEGIN
      RETURN auth.uid();
    END;
    $func$;';
  
  EXECUTE v_create_sql;
END $$;

-- Fix get_remnant_consolidation_suggestions
CREATE OR REPLACE FUNCTION public.get_remnant_consolidation_suggestions(
  p_user_id UUID,
  p_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  profile_id UUID,
  profile_name TEXT,
  small_remnants_count INTEGER,
  total_length DECIMAL,
  suggested_action TEXT,
  estimated_savings DECIMAL
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query TEXT;
BEGIN
  v_query := format('
    SELECT 
      fp.id as profile_id,
      fp.name as profile_name,
      COUNT(*) FILTER (WHERE mr.length < 500)::INTEGER as small_remnants_count,
      COALESCE(SUM(mr.length) FILTER (WHERE mr.length < 500), 0) as total_length,
      CASE
        WHEN COUNT(*) FILTER (WHERE mr.length < 500) > 5 THEN ''consolidate''
        WHEN COUNT(*) FILTER (WHERE mr.length < 500) > 0 THEN ''review''
        ELSE ''none''
      END as suggested_action,
      COALESCE(SUM(mr.length) FILTER (WHERE mr.length < 100), 0) as estimated_savings
    FROM %I.%I fp
    LEFT JOIN %I.%I mr ON mr.profile_id = fp.id AND mr.user_id = fp.user_id AND mr.status = %L
    WHERE fp.user_id = $1
      AND ($2 IS NULL OR fp.id = $2)
    GROUP BY fp.id, fp.name
    HAVING COUNT(*) FILTER (WHERE mr.length < 500) > 0
    ORDER BY small_remnants_count DESC
  ', 'public', 'fabricator_profiles', 'public', 'material_remnants', 'available');
  
  RETURN QUERY EXECUTE v_query USING p_user_id, p_profile_id;
END;
$$;

-- Fix cleanup_old_collaboration_sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_collaboration_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.collaboration_sessions 
  WHERE is_active = false 
  AND updated_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Fix log_fabricator_changes
CREATE OR REPLACE FUNCTION public.log_fabricator_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.fabricator_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changed_fields,
    records_affected,
    status
  )
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN (
      SELECT array_agg(key)
      FROM jsonb_each(row_to_json(NEW)::jsonb)
      WHERE value IS DISTINCT FROM (row_to_json(OLD)::jsonb -> key)
    ) ELSE NULL END,
    1,
    'success'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix analyze_fabricator_tables
CREATE OR REPLACE FUNCTION public.analyze_fabricator_tables()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT,
  last_vacuum TIMESTAMPTZ,
  last_analyze TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename::regclass)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename::regclass)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename::regclass)) as total_size,
    last_vacuum,
    last_analyze
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'fabricator_profiles',
      'fabricator_accessories',
      'profile_accessory_compatibility',
      'pricing_configurations',
      'material_pricing_rules',
      'fabricator_audit_logs',
      'fabricator_backup_snapshots'
    )
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename::regclass) DESC;
END;
$$;

-- Fix create_fabricator_backup
CREATE OR REPLACE FUNCTION public.create_fabricator_backup(
  p_user_id UUID,
  p_snapshot_name TEXT,
  p_snapshot_type TEXT DEFAULT 'manual',
  p_description TEXT DEFAULT NULL,
  p_tables TEXT[] DEFAULT ARRAY['fabricator_profiles', 'fabricator_accessories', 'profile_accessory_compatibility', 'pricing_configurations', 'material_pricing_rules']
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_snapshot_id UUID;
  v_snapshot_data JSONB := '{}'::jsonb;
  v_table_name TEXT;
  v_table_data JSONB;
  v_record_count INTEGER := 0;
BEGIN
  INSERT INTO public.fabricator_backup_snapshots (
    user_id,
    snapshot_name,
    snapshot_type,
    description,
    tables_included,
    status
  ) VALUES (
    p_user_id,
    p_snapshot_name,
    p_snapshot_type,
    p_description,
    p_tables,
    'in_progress'
  ) RETURNING id INTO v_snapshot_id;
  
  FOREACH v_table_name IN ARRAY p_tables
  LOOP
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE user_id = $1) t', v_table_name)
    USING p_user_id
    INTO v_table_data;
    
    IF v_table_data IS NOT NULL THEN
      v_snapshot_data := v_snapshot_data || jsonb_build_object(v_table_name, v_table_data);
      v_record_count := v_record_count + jsonb_array_length(v_table_data);
    END IF;
  END LOOP;
  
  UPDATE public.fabricator_backup_snapshots
  SET 
    snapshot_data = v_snapshot_data,
    record_count = v_record_count,
    data_size_bytes = pg_column_size(v_snapshot_data),
    status = 'completed',
    completed_at = NOW(),
    expires_at = NOW() + (retention_days || ' days')::INTERVAL
  WHERE id = v_snapshot_id;
  
  INSERT INTO public.fabricator_backup_operations (
    user_id,
    operation_type,
    snapshot_id,
    status,
    records_backed_up,
    progress_percentage,
    completed_at
  ) VALUES (
    p_user_id,
    'backup',
    v_snapshot_id,
    'completed',
    v_record_count,
    100,
    NOW()
  );
  
  RETURN v_snapshot_id;
END;
$$;

-- Fix restore_fabricator_backup
CREATE OR REPLACE FUNCTION public.restore_fabricator_backup(
  p_user_id UUID,
  p_snapshot_id UUID,
  p_restore_mode TEXT DEFAULT 'merge'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_snapshot_data JSONB;
  v_table_name TEXT;
  v_table_data JSONB;
  v_records_restored INTEGER := 0;
  v_operation_id UUID;
BEGIN
  IF p_restore_mode NOT IN ('replace', 'merge', 'append') THEN
    RAISE EXCEPTION 'Invalid restore_mode: %. Must be one of: replace, merge, append', p_restore_mode;
  END IF;
  
  SELECT snapshot_data INTO v_snapshot_data
  FROM public.fabricator_backup_snapshots
  WHERE id = p_snapshot_id AND user_id = p_user_id;
  
  IF v_snapshot_data IS NULL THEN
    RAISE EXCEPTION 'Backup snapshot not found or access denied';
  END IF;
  
  INSERT INTO public.fabricator_backup_operations (
    user_id,
    operation_type,
    snapshot_id,
    status,
    restore_point
  ) VALUES (
    p_user_id,
    'restore',
    p_snapshot_id,
    'in_progress',
    NOW()
  ) RETURNING id INTO v_operation_id;
  
  FOR v_table_name, v_table_data IN SELECT * FROM jsonb_each(v_snapshot_data)
  LOOP
    IF p_restore_mode = 'replace' THEN
      EXECUTE format('DELETE FROM %I WHERE user_id = $1', v_table_name) USING p_user_id;
    END IF;
    
    IF v_table_data IS NOT NULL AND jsonb_array_length(v_table_data) > 0 THEN
      EXECUTE format(
        'INSERT INTO %I SELECT * FROM jsonb_populate_recordset(null::%I, $1)',
        v_table_name,
        v_table_name
      ) USING v_table_data;
      
      GET DIAGNOSTICS v_records_restored = ROW_COUNT;
    END IF;
  END LOOP;
  
  UPDATE public.fabricator_backup_operations
  SET 
    status = 'completed',
    records_restored = v_records_restored,
    completed_at = NOW()
  WHERE id = v_operation_id;
  
  RETURN v_records_restored;
END;
$$;

-- Fix get_slow_queries
CREATE OR REPLACE FUNCTION public.get_slow_queries(
  p_user_id UUID DEFAULT NULL,
  p_threshold_ms INTEGER DEFAULT 3000,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  operation_name TEXT,
  table_name TEXT,
  duration_ms DECIMAL,
  rows_affected INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fqm.id,
    fqm.operation_name,
    fqm.table_name,
    fqm.duration_ms,
    fqm.rows_affected,
    fqm.created_at
  FROM public.fabricator_query_metrics fqm
  WHERE fqm.duration_ms >= p_threshold_ms
    AND (p_user_id IS NULL OR fqm.user_id = p_user_id)
    AND fqm.is_slow_query = TRUE
  ORDER BY fqm.duration_ms DESC, fqm.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Fix cleanup_expired_backups
CREATE OR REPLACE FUNCTION public.cleanup_expired_backups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.fabricator_backup_snapshots
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND status = 'completed';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Fix maintain_fabricator_tables
CREATE OR REPLACE FUNCTION public.maintain_fabricator_tables()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_name TEXT;
  v_result TEXT := '';
BEGIN
  FOR v_table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename LIKE 'fabricator_%'
  LOOP
    EXECUTE format('VACUUM ANALYZE %I', v_table_name);
    v_result := v_result || format('Vacuumed and analyzed: %s\n', v_table_name);
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Fix 2: Remove SECURITY DEFINER from view
-- Views with SECURITY DEFINER can bypass RLS policies and are a security risk
-- Convert to a function with proper security or remove SECURITY DEFINER from view
-- Since this view queries pg_stat_activity (system catalog), we'll recreate it without SECURITY DEFINER
-- and restrict access via RLS or permissions instead

DROP VIEW IF EXISTS public.fabricator_connection_stats CASCADE;

-- Recreate view without SECURITY DEFINER
-- Note: This view may require elevated permissions to query pg_stat_activity
-- If access is needed, consider using a function with SECURITY DEFINER and proper access controls
CREATE VIEW public.fabricator_connection_stats AS
SELECT 
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid();

-- Revoke public access and only allow service_role to access this view
-- Regular users should not have access to connection statistics for security
REVOKE ALL ON public.fabricator_connection_stats FROM PUBLIC;
REVOKE ALL ON public.fabricator_connection_stats FROM anon;
REVOKE ALL ON public.fabricator_connection_stats FROM authenticated;

-- Only service_role can access this view
GRANT SELECT ON public.fabricator_connection_stats TO service_role;

COMMENT ON VIEW public.fabricator_connection_stats IS 'Connection pool statistics - restricted to service_role only (no SECURITY DEFINER)';

-- Fix 3: Revoke API access from materialized view
-- Materialized views should not be exposed via the API for security reasons
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_top_products' AND schemaname = 'public') THEN
    REVOKE SELECT ON public.mv_top_products FROM anon;
    REVOKE SELECT ON public.mv_top_products FROM authenticated;
    COMMENT ON MATERIALIZED VIEW public.mv_top_products IS 'Internal materialized view - not exposed via API for security';
  END IF;
END $$;

-- Fix 4: Note about anonymous access policies
-- The anonymous access warnings are informational - many tables intentionally allow
-- anonymous read access for public-facing features (products, categories, etc.)
-- These policies are correct for the application's requirements.
-- If you want to restrict anonymous access, you would need to review each policy
-- and modify them to require authentication.

-- Success message
SELECT 'Security warnings fixed: All functions now have SET search_path configured' as message;

