-- Migration 023: Add function to calculate real stock from stock_movements
-- Calculates actual stock quantity by summing all stock movements
-- ============================================================================

-- Function to calculate current stock from stock_movements
-- This provides the "real" stock level based on all recorded movements
CREATE OR REPLACE FUNCTION public.calculate_stock_from_movements(
  p_user_id UUID,
  p_profile_id UUID
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock DECIMAL(10,2) := 0;
BEGIN
  -- Sum all movements for this profile
  -- 'in' movements add to stock, 'out' movements subtract
  -- Other movement types are handled based on their nature
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN movement_type IN ('in', 'return', 'transfer') THEN quantity
        WHEN movement_type IN ('out', 'production', 'remnant_used', 'damage', 'loss') THEN -quantity
        WHEN movement_type = 'adjustment' THEN 
          -- Adjustments can be positive or negative based on stock_after - stock_before
          (stock_after - stock_before)
        ELSE 0
      END
    ),
    0
  )
  INTO v_stock
  FROM public.stock_movements
  WHERE user_id = p_user_id
    AND profile_id = p_profile_id;
  
  RETURN GREATEST(v_stock, 0); -- Ensure non-negative
END;
$$;

-- Function to sync stock_quantity with calculated stock from movements
-- This can be called periodically or after important operations
CREATE OR REPLACE FUNCTION public.sync_stock_from_movements(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_calculated_stock DECIMAL(10,2);
  v_updated_count INTEGER := 0;
BEGIN
  -- Update all profiles for this user with calculated stock
  FOR v_profile IN 
    SELECT DISTINCT profile_id
    FROM public.stock_movements
    WHERE user_id = p_user_id
  LOOP
    v_calculated_stock := public.calculate_stock_from_movements(p_user_id, v_profile.profile_id);
    
    UPDATE public.fabricator_profiles
    SET 
      stock_quantity = v_calculated_stock,
      updated_at = NOW()
    WHERE id = v_profile.profile_id
      AND user_id = p_user_id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN v_updated_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_stock_from_movements(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_stock_from_movements(UUID) TO authenticated;

