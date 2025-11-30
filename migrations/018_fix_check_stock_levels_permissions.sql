-- Migration 018: Fix check_stock_levels RPC function permissions
-- Addresses 403 Forbidden errors when calling check_stock_levels RPC
-- ============================================================================

-- Recreate the function with SECURITY DEFINER to bypass RLS
-- This allows the function to access fabricator_profiles and material_remnants
-- tables even when RLS policies would normally restrict access
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_stock_levels(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_stock_levels(UUID) IS 
  'Checks all profiles for a user and creates/updates stock alerts as needed. Requires SECURITY DEFINER to access RLS-protected tables.';
