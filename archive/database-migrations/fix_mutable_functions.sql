-- Fix for mutable function search paths

-- 1. Fix public.calculate_sla_dates
-- Ensure the search_path is explicitly set to prevent search path hijacking.
CREATE OR REPLACE FUNCTION public.calculate_sla_dates(ticket_priority_param ticket_priority, ticket_type_param ticket_type, created_at_param TIMESTAMPTZ)
RETURNS TABLE (response_due TIMESTAMPTZ, resolution_due TIMESTAMPTZ) AS $$
DECLARE
    sla_config RECORD;
BEGIN
    -- Get SLA configuration
    SELECT response_time_hours, resolution_time_hours
    INTO sla_config
    FROM public.sla_configurations
    WHERE priority = ticket_priority_param AND ticket_type = ticket_type_param AND is_active = TRUE;
    
    IF sla_config IS NULL THEN
        -- Default SLA if no specific configuration found
        response_due := created_at_param + INTERVAL '24 hours';
        resolution_due := created_at_param + INTERVAL '72 hours';
    ELSE
        response_due := created_at_param + (sla_config.response_time_hours || ' hours')::INTERVAL;
        resolution_due := created_at_param + (sla_config.resolution_time_hours || ' hours')::INTERVAL;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 2. Fix public.is_admin
-- Ensure the search_path is explicitly set to prevent search path hijacking.
-- This function checks if a user has the 'admin' role.
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = COALESCE(user_id_param, auth.uid()) AND role = 'admin'
  ) INTO is_admin_result;
  RETURN is_admin_result;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
