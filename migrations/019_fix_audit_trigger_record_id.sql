-- Migration 019: Fix audit trigger record_id type casting issue
-- The trigger was casting UUID to TEXT, causing type mismatch errors
-- ============================================================================

-- Fix the log_fabricator_changes function to properly handle UUID record_id
CREATE OR REPLACE FUNCTION log_fabricator_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[];
  v_old_json JSONB;
  v_new_json JSONB;
  v_user_id UUID;
  v_record_id UUID;
BEGIN
  -- Get user ID from JWT or session
  v_user_id := auth.uid();
  
  -- Get record_id as UUID (not TEXT)
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
  ELSE
    v_record_id := NEW.id;
  END IF;
  
  -- Determine changed fields
  IF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
    
    -- Find changed fields
    SELECT array_agg(key) INTO v_changed_fields
    FROM jsonb_each(v_new_json)
    WHERE value IS DISTINCT FROM v_old_json->key;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_json := to_jsonb(NEW);
    v_changed_fields := ARRAY[]::TEXT[];
  ELSIF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    v_changed_fields := ARRAY[]::TEXT[];
  END IF;
  
  -- Insert audit log with proper UUID type
  INSERT INTO public.fabricator_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changed_fields,
    operation_type,
    operation_source,
    status
  ) VALUES (
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,  -- Already UUID type, no casting needed
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN v_old_json ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN v_new_json ELSE NULL END,
    v_changed_fields,
    'fabricator_operation',
    'system',
    'success'
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'log_fabricator_changes' 
    AND prosrc NOT LIKE '%::TEXT%'
  ) THEN
    RAISE NOTICE 'Trigger function log_fabricator_changes has been fixed';
  END IF;
END $$;
