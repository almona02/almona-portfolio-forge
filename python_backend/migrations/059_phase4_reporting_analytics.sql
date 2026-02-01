-- Phase 4 Reporting & Analytics Database Migration
-- Date: January 2026
-- Creates tables for: Report Templates, Report Generation Jobs, Analytics Metrics Cache, Analytics Query Logs
-- ============================================================================
-- 1. Report Templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (
    category IN (
      'revenue',
      'conversion',
      'customer',
      'profitability',
      'pipeline',
      'executive',
      'custom'
    )
  ),
  template_schema JSONB NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_templates_user_name_unique ON report_templates(user_id, name)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_templates_user_category ON report_templates(user_id, category)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category)
WHERE deleted_at IS NULL
  AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_report_templates_user_updated ON report_templates(user_id, updated_at DESC)
WHERE deleted_at IS NULL;
-- Enable Row Level Security
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Users can view public report templates" ON report_templates;
CREATE POLICY "Users can view public report templates" ON report_templates FOR
SELECT USING (
    is_public = true
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can view their own report templates" ON report_templates;
CREATE POLICY "Users can view their own report templates" ON report_templates FOR
SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can create report templates" ON report_templates;
CREATE POLICY "Users can create report templates" ON report_templates FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own report templates" ON report_templates;
CREATE POLICY "Users can update their own report templates" ON report_templates FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can delete their own report templates" ON report_templates;
CREATE POLICY "Users can delete their own report templates" ON report_templates FOR DELETE USING (
  auth.uid() = user_id
  AND is_system = false
);
COMMENT ON TABLE report_templates IS 'Stores report templates with JSON schema';
COMMENT ON COLUMN report_templates.template_schema IS 'JSONB template schema matching ReportTemplate interface';
-- ============================================================================
-- 2. Report Generation Jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE
  SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (
      status IN (
        'queued',
        'processing',
        'completed',
        'failed',
        'canceled'
      )
    ),
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv')),
    file_size_bytes BIGINT,
    page_count INTEGER,
    download_url TEXT,
    download_expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    generation_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_report_jobs_user_status ON report_generation_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_user_created ON report_generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_jobs_template ON report_generation_jobs(template_id)
WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_generation_jobs(status)
WHERE status IN ('queued', 'processing');
-- Enable Row Level Security
ALTER TABLE report_generation_jobs ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own report generation jobs" ON report_generation_jobs;
CREATE POLICY "Users can view their own report generation jobs" ON report_generation_jobs FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own report generation jobs" ON report_generation_jobs;
CREATE POLICY "Users can create their own report generation jobs" ON report_generation_jobs FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can update report generation jobs" ON report_generation_jobs;
CREATE POLICY "Service role can update report generation jobs" ON report_generation_jobs FOR
UPDATE USING (auth.jwt()->>'role' = 'service_role');
COMMENT ON TABLE report_generation_jobs IS 'Tracks report generation jobs for background processing';
-- ============================================================================
-- 3. Analytics Metrics Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metric_data JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(metric_key, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_key_period ON analytics_metrics_cache(metric_key, period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_expires ON analytics_metrics_cache(expires_at);
-- Enable Row Level Security (service role only - metrics are system-generated)
ALTER TABLE analytics_metrics_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage analytics metrics cache" ON analytics_metrics_cache;
CREATE POLICY "Service role can manage analytics metrics cache" ON analytics_metrics_cache FOR ALL USING (auth.jwt()->>'role' = 'service_role');
COMMENT ON TABLE analytics_metrics_cache IS 'Caches pre-calculated analytics metrics for performance';
-- ============================================================================
-- 4. Analytics Query Logs (for audit and optimization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE
  SET NULL,
    query_type VARCHAR(50) NOT NULL,
    query_params JSONB NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    result_count INTEGER,
    cache_hit BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_query_logs_user_created ON analytics_query_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_query_logs_type ON analytics_query_logs(query_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_query_logs_performance ON analytics_query_logs(execution_time_ms DESC)
WHERE execution_time_ms > 1000;
-- Enable Row Level Security
ALTER TABLE analytics_query_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own query logs" ON analytics_query_logs;
CREATE POLICY "Users can view their own query logs" ON analytics_query_logs FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can insert query logs" ON analytics_query_logs;
CREATE POLICY "Service role can insert query logs" ON analytics_query_logs FOR
INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');
COMMENT ON TABLE analytics_query_logs IS 'Logs analytics queries for performance monitoring and optimization';
-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_report_templates_updated_at BEFORE
UPDATE ON report_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();