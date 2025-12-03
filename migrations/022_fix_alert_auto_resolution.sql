-- Migration 022: Fix alert auto-resolution in check_stock_levels
-- Automatically resolves alerts when stock levels are restored above thresholds
-- ============================================================================

-- Update check_stock_levels to also resolve alerts when stock is restored
CREATE OR REPLACE FUNCTION public.check_stock_levels(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_alert_count INTEGER := 0;
  v_alert_type TEXT;
  v_severity TEXT;
  v_reorder_qty DECIMAL;
  v_query TEXT;
  v_resolved_count INTEGER := 0;
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
    -- First, resolve any existing alerts if stock is now above thresholds
    IF v_profile.stock_quantity > v_profile.min_stock_level AND v_profile.stock_quantity > 0 THEN
      -- Stock is healthy - resolve any existing alerts for this profile
      UPDATE public.stock_alerts
      SET is_resolved = TRUE,
          resolved_at = NOW(),
          resolved_by = p_user_id
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND is_resolved = FALSE
        AND (alert_type = 'low_stock' OR alert_type = 'out_of_stock');
      
      GET DIAGNOSTICS v_resolved_count = ROW_COUNT;
      -- Continue to next profile since stock is healthy
      CONTINUE;
    END IF;

    -- Stock is low or out - create or update alerts
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
          severity = v_severity,
          is_resolved = FALSE,
          resolved_at = NULL,
          resolved_by = NULL
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE;
    END IF;
  END LOOP;

  RETURN v_alert_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_stock_levels(UUID) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.check_stock_levels(UUID) IS 
  'Checks all profiles for a user, creates/updates stock alerts when stock is low, and automatically resolves alerts when stock is restored above thresholds. Requires SECURITY DEFINER to access RLS-protected tables.';

