-- Migration 007: Supabase Fabricator Schema Enhancement
-- Comprehensive schema with RLS, audit trails, performance optimizations, and backup procedures
-- Builds upon migrations 004, 005, and 006

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search performance

-- ============================================================================
-- 1. ENHANCED AUDIT TRAIL SYSTEM
-- ============================================================================

-- Enhanced audit logs table for fabricator operations
CREATE TABLE IF NOT EXISTS public.fabricator_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Operation details
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'BATCH_OPERATION')),
  table_name TEXT NOT NULL,
  record_id UUID,
  record_ids UUID[], -- For batch operations
  
  -- Data changes
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Context
  operation_type TEXT, -- 'profile_management', 'accessory_management', 'pricing', 'inventory', etc.
  operation_source TEXT DEFAULT 'web' CHECK (operation_source IN ('web', 'api', 'bulk_import', 'scheduled', 'system')),
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  request_id TEXT, -- For tracing requests across services
  
  -- Performance metrics
  operation_duration_ms INTEGER,
  records_affected INTEGER DEFAULT 1,
  
  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  error_code TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT valid_operation CHECK (
    (action = 'BATCH_OPERATION' AND record_ids IS NOT NULL) OR
    (action != 'BATCH_OPERATION' AND record_id IS NOT NULL)
  )
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_user ON public.fabricator_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_table ON public.fabricator_audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_record ON public.fabricator_audit_logs(record_id) WHERE record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_action ON public.fabricator_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_operation ON public.fabricator_audit_logs(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_status ON public.fabricator_audit_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_created ON public.fabricator_audit_logs(created_at DESC);

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_old_values ON public.fabricator_audit_logs USING GIN(old_values);
CREATE INDEX IF NOT EXISTS idx_fabricator_audit_new_values ON public.fabricator_audit_logs USING GIN(new_values);

-- ============================================================================
-- 2. BACKUP AND RECOVERY TABLES
-- ============================================================================

-- Backup snapshots table
CREATE TABLE IF NOT EXISTS public.fabricator_backup_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Snapshot metadata
  snapshot_name TEXT NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('full', 'incremental', 'manual', 'scheduled')),
  description TEXT,
  
  -- Scope
  tables_included TEXT[] NOT NULL, -- ['fabricator_profiles', 'fabricator_accessories', ...]
  
  -- Data
  snapshot_data JSONB NOT NULL, -- Complete snapshot of data
  
  -- Metadata
  record_count INTEGER DEFAULT 0,
  data_size_bytes BIGINT,
  compression_ratio DECIMAL(5,2),
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT,
  
  -- Retention
  expires_at TIMESTAMPTZ, -- Auto-cleanup after expiration
  retention_days INTEGER DEFAULT 30,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_snapshot CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  )
);

-- Backup operations log
CREATE TABLE IF NOT EXISTS public.fabricator_backup_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN ('backup', 'restore', 'verify', 'cleanup')),
  snapshot_id UUID REFERENCES public.fabricator_backup_snapshots(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Results
  records_backed_up INTEGER DEFAULT 0,
  records_restored INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  
  -- Metadata
  source_backup_id UUID REFERENCES public.fabricator_backup_snapshots(id),
  restore_point TIMESTAMPTZ, -- Point in time for restore
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for backup tables
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_user ON public.fabricator_backup_snapshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_type ON public.fabricator_backup_snapshots(snapshot_type, status);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_expires ON public.fabricator_backup_snapshots(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backup_operations_user ON public.fabricator_backup_operations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_operations_snapshot ON public.fabricator_backup_operations(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_backup_operations_status ON public.fabricator_backup_operations(status, created_at DESC);

-- ============================================================================
-- 3. PERFORMANCE MONITORING TABLES
-- ============================================================================

-- Query performance metrics
CREATE TABLE IF NOT EXISTS public.fabricator_query_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Query details
  operation_name TEXT NOT NULL,
  table_name TEXT,
  query_type TEXT CHECK (query_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'BATCH')),
  
  -- Performance metrics
  duration_ms DECIMAL(10,2) NOT NULL,
  rows_affected INTEGER,
  rows_returned INTEGER,
  
  -- Query details
  query_text TEXT, -- Sanitized query for analysis
  query_params JSONB,
  
  -- Performance classification
  is_slow_query BOOLEAN DEFAULT FALSE,
  slow_query_threshold_ms INTEGER DEFAULT 3000,
  
  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  error_message TEXT,
  
  -- Index usage (if available)
  indexes_used TEXT[],
  full_table_scan BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query metrics
CREATE INDEX IF NOT EXISTS idx_query_metrics_user ON public.fabricator_query_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_metrics_operation ON public.fabricator_query_metrics(operation_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_metrics_slow ON public.fabricator_query_metrics(is_slow_query, created_at DESC) WHERE is_slow_query = TRUE;
CREATE INDEX IF NOT EXISTS idx_query_metrics_table ON public.fabricator_query_metrics(table_name, created_at DESC) WHERE table_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_metrics_duration ON public.fabricator_query_metrics(duration_ms DESC, created_at DESC);

-- ============================================================================
-- 4. CONNECTION POOLING CONFIGURATION
-- ============================================================================

-- Connection pool statistics (read-only view for monitoring)
CREATE OR REPLACE VIEW public.fabricator_connection_stats AS
SELECT 
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid();

-- ============================================================================
-- 5. ENHANCED INDEXES FOR EXISTING TABLES
-- ============================================================================

-- Additional indexes for fabricator_profiles
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_material ON public.fabricator_profiles(user_id, material);
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_user_stock ON public.fabricator_profiles(user_id, stock_quantity) WHERE stock_quantity < min_stock_level;
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_name_trgm ON public.fabricator_profiles USING GIN(name gin_trgm_ops); -- Text search
CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_updated ON public.fabricator_profiles(updated_at DESC);

-- Additional indexes for fabricator_accessories
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_type ON public.fabricator_accessories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_name_trgm ON public.fabricator_accessories USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_updated ON public.fabricator_accessories(updated_at DESC);

-- Additional indexes for profile_accessory_compatibility
CREATE INDEX IF NOT EXISTS idx_compatibility_both ON public.profile_accessory_compatibility(profile_id, accessory_id);

-- Additional indexes for pricing_configurations
CREATE INDEX IF NOT EXISTS idx_pricing_configs_user_active ON public.pricing_configurations(user_id, is_active, updated_at DESC);

-- Additional indexes for material_pricing_rules
CREATE INDEX IF NOT EXISTS idx_material_pricing_validity ON public.material_pricing_rules(valid_from, valid_until) WHERE is_active = TRUE;

-- ============================================================================
-- 6. AUDIT TRIGGER FUNCTIONS
-- ============================================================================

-- Function to automatically log changes to fabricator tables
CREATE OR REPLACE FUNCTION log_fabricator_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[];
  v_old_json JSONB;
  v_new_json JSONB;
  v_user_id UUID;
BEGIN
  -- Get user ID from JWT or session
  v_user_id := auth.uid();
  
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
  
  -- Insert audit log
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
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
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

-- ============================================================================
-- 7. APPLY AUDIT TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_fabricator_profiles ON public.fabricator_profiles;
DROP TRIGGER IF EXISTS audit_fabricator_accessories ON public.fabricator_accessories;
DROP TRIGGER IF EXISTS audit_profile_accessory_compatibility ON public.profile_accessory_compatibility;
DROP TRIGGER IF EXISTS audit_pricing_configurations ON public.pricing_configurations;
DROP TRIGGER IF EXISTS audit_material_pricing_rules ON public.material_pricing_rules;

-- Create audit triggers
CREATE TRIGGER audit_fabricator_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.fabricator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_fabricator_changes();

CREATE TRIGGER audit_fabricator_accessories
  AFTER INSERT OR UPDATE OR DELETE ON public.fabricator_accessories
  FOR EACH ROW
  EXECUTE FUNCTION log_fabricator_changes();

CREATE TRIGGER audit_profile_accessory_compatibility
  AFTER INSERT OR UPDATE OR DELETE ON public.profile_accessory_compatibility
  FOR EACH ROW
  EXECUTE FUNCTION log_fabricator_changes();

CREATE TRIGGER audit_pricing_configurations
  AFTER INSERT OR UPDATE OR DELETE ON public.pricing_configurations
  FOR EACH ROW
  EXECUTE FUNCTION log_fabricator_changes();

CREATE TRIGGER audit_material_pricing_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.material_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION log_fabricator_changes();

-- ============================================================================
-- 8. BACKUP AND RECOVERY FUNCTIONS
-- ============================================================================

-- Function to create a backup snapshot
CREATE OR REPLACE FUNCTION create_fabricator_backup(
  p_user_id UUID,
  p_snapshot_name TEXT,
  p_snapshot_type TEXT DEFAULT 'manual',
  p_description TEXT DEFAULT NULL,
  p_tables TEXT[] DEFAULT ARRAY['fabricator_profiles', 'fabricator_accessories', 'profile_accessory_compatibility', 'pricing_configurations', 'material_pricing_rules']
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_snapshot_data JSONB := '{}'::jsonb;
  v_table_name TEXT;
  v_table_data JSONB;
  v_record_count INTEGER := 0;
BEGIN
  -- Create snapshot record
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
  
  -- Backup each table
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
  
  -- Update snapshot with data
  UPDATE public.fabricator_backup_snapshots
  SET 
    snapshot_data = v_snapshot_data,
    record_count = v_record_count,
    data_size_bytes = pg_column_size(v_snapshot_data),
    status = 'completed',
    completed_at = NOW(),
    expires_at = NOW() + (retention_days || ' days')::INTERVAL
  WHERE id = v_snapshot_id;
  
  -- Log backup operation
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore from backup
CREATE OR REPLACE FUNCTION restore_fabricator_backup(
  p_user_id UUID,
  p_snapshot_id UUID,
  p_restore_mode TEXT DEFAULT 'merge'
)
RETURNS INTEGER AS $$
DECLARE
  v_snapshot_data JSONB;
  v_table_name TEXT;
  v_table_data JSONB;
  v_records_restored INTEGER := 0;
  v_operation_id UUID;
BEGIN
  -- Validate restore_mode parameter
  IF p_restore_mode NOT IN ('replace', 'merge', 'append') THEN
    RAISE EXCEPTION 'Invalid restore_mode: %. Must be one of: replace, merge, append', p_restore_mode;
  END IF;
  
  -- Get snapshot data
  SELECT snapshot_data INTO v_snapshot_data
  FROM public.fabricator_backup_snapshots
  WHERE id = p_snapshot_id AND user_id = p_user_id;
  
  IF v_snapshot_data IS NULL THEN
    RAISE EXCEPTION 'Backup snapshot not found or access denied';
  END IF;
  
  -- Create restore operation log
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
  
  -- Restore each table
  FOR v_table_name, v_table_data IN SELECT * FROM jsonb_each(v_snapshot_data)
  LOOP
    IF p_restore_mode = 'replace' THEN
      -- Delete existing records
      EXECUTE format('DELETE FROM %I WHERE user_id = $1', v_table_name) USING p_user_id;
    END IF;
    
    -- Insert restored records
    IF v_table_data IS NOT NULL AND jsonb_array_length(v_table_data) > 0 THEN
      EXECUTE format(
        'INSERT INTO %I SELECT * FROM jsonb_populate_recordset(null::%I, $1)',
        v_table_name,
        v_table_name
      ) USING v_table_data;
      
      GET DIAGNOSTICS v_records_restored = ROW_COUNT;
    END IF;
  END LOOP;
  
  -- Update operation log
  UPDATE public.fabricator_backup_operations
  SET 
    status = 'completed',
    records_restored = v_records_restored,
    completed_at = NOW()
  WHERE id = v_operation_id;
  
  RETURN v_records_restored;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.fabricator_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_backup_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_query_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.fabricator_audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.fabricator_audit_logs;
DROP POLICY IF EXISTS "Service role can view all audit logs" ON public.fabricator_audit_logs;

DROP POLICY IF EXISTS "Users can view their own backups" ON public.fabricator_backup_snapshots;
DROP POLICY IF EXISTS "Users can manage their own backups" ON public.fabricator_backup_snapshots;

DROP POLICY IF EXISTS "Users can view their own backup operations" ON public.fabricator_backup_operations;
DROP POLICY IF EXISTS "Users can insert their own backup operations" ON public.fabricator_backup_operations;

DROP POLICY IF EXISTS "Users can view their own query metrics" ON public.fabricator_query_metrics;
DROP POLICY IF EXISTS "Users can insert their own query metrics" ON public.fabricator_query_metrics;
DROP POLICY IF EXISTS "Service role can view all query metrics" ON public.fabricator_query_metrics;

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON public.fabricator_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON public.fabricator_audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can view all audit logs" ON public.fabricator_audit_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Backup snapshots policies
CREATE POLICY "Users can view their own backups" ON public.fabricator_backup_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own backups" ON public.fabricator_backup_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Backup operations policies
CREATE POLICY "Users can view their own backup operations" ON public.fabricator_backup_operations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup operations" ON public.fabricator_backup_operations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Query metrics policies
CREATE POLICY "Users can view their own query metrics" ON public.fabricator_query_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own query metrics" ON public.fabricator_query_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can view all query metrics" ON public.fabricator_query_metrics
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 10. PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION analyze_fabricator_tables()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT,
  last_vacuum TIMESTAMPTZ,
  last_analyze TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to vacuum and analyze fabricator tables
CREATE OR REPLACE FUNCTION maintain_fabricator_tables()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.fabricator_audit_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND status = 'success'; -- Keep failed operations longer
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old query metrics
CREATE OR REPLACE FUNCTION cleanup_old_query_metrics(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Keep slow queries longer
  DELETE FROM public.fabricator_query_metrics
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND (is_slow_query = FALSE OR created_at < NOW() - (p_retention_days * 2 || ' days')::INTERVAL);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.fabricator_audit_logs IS 'Comprehensive audit trail for all fabricator operations with change tracking';
COMMENT ON TABLE public.fabricator_backup_snapshots IS 'Backup snapshots for fabricator data with retention policies';
COMMENT ON TABLE public.fabricator_backup_operations IS 'Log of backup and restore operations';
COMMENT ON TABLE public.fabricator_query_metrics IS 'Performance metrics for fabricator database queries';

COMMENT ON FUNCTION create_fabricator_backup(UUID, TEXT, TEXT, TEXT, TEXT[]) IS 'Creates a backup snapshot of fabricator data for a user';
COMMENT ON FUNCTION restore_fabricator_backup(UUID, UUID, TEXT) IS 'Restores fabricator data from a backup snapshot';
COMMENT ON FUNCTION cleanup_expired_backups() IS 'Removes expired backup snapshots based on retention policy';
COMMENT ON FUNCTION analyze_fabricator_tables() IS 'Analyzes table statistics for fabricator tables';
COMMENT ON FUNCTION get_slow_queries(UUID, INTEGER, INTEGER) IS 'Returns slow query metrics for performance analysis';
COMMENT ON FUNCTION maintain_fabricator_tables() IS 'Performs VACUUM and ANALYZE on all fabricator tables';
COMMENT ON FUNCTION cleanup_old_audit_logs(INTEGER) IS 'Removes old audit log entries based on retention policy';
COMMENT ON FUNCTION cleanup_old_query_metrics(INTEGER) IS 'Removes old query metrics based on retention policy';

-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION create_fabricator_backup(UUID, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_fabricator_backup(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_fabricator_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries(UUID, INTEGER, INTEGER) TO authenticated;

-- Grant execute permissions on maintenance functions to service role only
GRANT EXECUTE ON FUNCTION cleanup_expired_backups() TO service_role;
GRANT EXECUTE ON FUNCTION maintain_fabricator_tables() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_query_metrics(INTEGER) TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

