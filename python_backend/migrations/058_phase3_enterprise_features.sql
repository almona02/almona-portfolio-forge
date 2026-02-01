-- Phase 3 Enterprise Features Database Migration
-- Date: January 2026
-- Creates tables for: Filter Presets, Bulk Operations, Project Templates, Project Activities
-- ============================================================================
-- 1. Filter Presets
-- ============================================================================
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(20) NOT NULL CHECK (domain IN ('projects', 'positions')),
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_preset_name UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_domain ON filter_presets(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_updated ON filter_presets(user_id, updated_at DESC);
-- Enable Row Level Security
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own filter presets" ON filter_presets;
CREATE POLICY "Users can view their own filter presets" ON filter_presets FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own filter presets" ON filter_presets;
CREATE POLICY "Users can create their own filter presets" ON filter_presets FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own filter presets" ON filter_presets;
CREATE POLICY "Users can update their own filter presets" ON filter_presets FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own filter presets" ON filter_presets;
CREATE POLICY "Users can delete their own filter presets" ON filter_presets FOR DELETE USING (auth.uid() = user_id);
COMMENT ON TABLE filter_presets IS 'Stores user filter presets for projects and positions';
COMMENT ON COLUMN filter_presets.filters IS 'JSONB filter set matching FilterSet interface';
-- ============================================================================
-- 2. Bulk Operation Jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_operation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (
    status IN (
      'queued',
      'running',
      'completed',
      'failed',
      'canceled'
    )
  ),
  operation_type VARCHAR(50) NOT NULL,
  operation_params JSONB NOT NULL,
  item_ids UUID [] NOT NULL,
  item_count INTEGER NOT NULL,
  progress_completed INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL,
  result_succeeded INTEGER DEFAULT 0,
  result_failed INTEGER DEFAULT 0,
  result_errors JSONB DEFAULT '[]'::jsonb,
  result_download_url TEXT,
  result_download_expires_at TIMESTAMP WITH TIME ZONE,
  original_job_id UUID REFERENCES bulk_operation_jobs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_user_status ON bulk_operation_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_user_created ON bulk_operation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operation_jobs(status)
WHERE status IN ('queued', 'running');
-- Enable Row Level Security
ALTER TABLE bulk_operation_jobs ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own bulk operation jobs" ON bulk_operation_jobs;
CREATE POLICY "Users can view their own bulk operation jobs" ON bulk_operation_jobs FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own bulk operation jobs" ON bulk_operation_jobs;
CREATE POLICY "Users can create their own bulk operation jobs" ON bulk_operation_jobs FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own bulk operation jobs" ON bulk_operation_jobs;
CREATE POLICY "Users can update their own bulk operation jobs" ON bulk_operation_jobs FOR
UPDATE USING (auth.uid() = user_id);
-- Allow service role to update jobs (for background workers)
DROP POLICY IF EXISTS "Service role can update all bulk operation jobs" ON bulk_operation_jobs;
CREATE POLICY "Service role can update all bulk operation jobs" ON bulk_operation_jobs FOR
UPDATE USING (auth.jwt()->>'role' = 'service_role');
COMMENT ON TABLE bulk_operation_jobs IS 'Tracks async bulk operations with progress and results';
COMMENT ON COLUMN bulk_operation_jobs.operation_type IS 'Type: edit, export, delete, status_change';
COMMENT ON COLUMN bulk_operation_jobs.operation_params IS 'JSONB operation parameters';
COMMENT ON COLUMN bulk_operation_jobs.result_errors IS 'Array of {itemId, message} error objects';
-- ============================================================================
-- 3. Project Templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL CHECK (
    category IN (
      'residential',
      'commercial',
      'custom',
      'standard',
      'user'
    )
  ),
  tags TEXT [] DEFAULT '{}',
  thumbnail TEXT,
  project_data JSONB NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
-- Note: Case-insensitive uniqueness for template names should be handled in application logic
CREATE INDEX IF NOT EXISTS idx_project_templates_author_name ON project_templates(author_id, name)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_templates_tags ON project_templates USING GIN(tags)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_templates_author ON project_templates(author_id, category)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_templates_public ON project_templates(is_public, category, usage_count DESC)
WHERE deleted_at IS NULL
  AND is_public = true;
-- Note: Full-text search index removed - to_tsvector with concatenation requires careful handling. 
-- Full-text search can be implemented using PostgreSQL's built-in search or application-level search.
-- Enable Row Level Security
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Users can view public templates" ON project_templates;
CREATE POLICY "Users can view public templates" ON project_templates FOR
SELECT USING (
    is_public = true
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can view their own templates" ON project_templates;
CREATE POLICY "Users can view their own templates" ON project_templates FOR
SELECT USING (
    auth.uid() = author_id
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can create templates" ON project_templates;
CREATE POLICY "Users can create templates" ON project_templates FOR
INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update their own templates" ON project_templates;
CREATE POLICY "Users can update their own templates" ON project_templates FOR
UPDATE USING (
    auth.uid() = author_id
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can delete their own templates" ON project_templates;
CREATE POLICY "Users can delete their own templates" ON project_templates FOR DELETE USING (
  auth.uid() = author_id
  AND is_system = false
);
COMMENT ON TABLE project_templates IS 'Project templates for cloning and reuse';
COMMENT ON COLUMN project_templates.project_data IS 'Full project structure/snapshot (JSONB)';
COMMENT ON COLUMN project_templates.tags IS 'Array of tag strings for filtering';
-- ============================================================================
-- 4. Project Activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  -- References projects (foreign key constraint can be added after projects table is created)
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE
  SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reverted_by UUID REFERENCES auth.users(id) ON DELETE
  SET NULL,
    reverted_at TIMESTAMP WITH TIME ZONE,
    reverted_activity_id UUID REFERENCES project_activities(id)
);
CREATE INDEX IF NOT EXISTS idx_activities_project_created ON project_activities(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_type ON project_activities(project_id, type);
CREATE INDEX IF NOT EXISTS idx_activities_project_user ON project_activities(project_id, user_id);
-- Note: DATE(created_at) index removed - DATE() function is not IMMUTABLE. Use created_at index for date filtering.
-- Enable Row Level Security
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Note: Project access control should be implemented at the application/service layer.
-- These policies allow users to view activities they created, and allow service role for system activities.
DROP POLICY IF EXISTS "Users can view their own activities" ON project_activities;
CREATE POLICY "Users can view their own activities" ON project_activities FOR
SELECT USING (auth.uid() = user_id);
-- Service role can view all activities
DROP POLICY IF EXISTS "Service role can view all activities" ON project_activities;
CREATE POLICY "Service role can view all activities" ON project_activities FOR
SELECT USING (auth.jwt()->>'role' = 'service_role');
-- Service role can insert activities (for system-generated activities)
DROP POLICY IF EXISTS "Service role can insert activities" ON project_activities;
CREATE POLICY "Service role can insert activities" ON project_activities FOR
INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');
-- Authenticated users can insert activities (project access validated at application layer)
DROP POLICY IF EXISTS "Users can create activities" ON project_activities;
CREATE POLICY "Users can create activities" ON project_activities FOR
INSERT WITH CHECK (auth.uid() = user_id);
COMMENT ON TABLE project_activities IS 'Project activity/audit log for timeline display';
COMMENT ON COLUMN project_activities.type IS 'Activity type: project_created, field_changed, status_changed, file_uploaded, comment_added, bulk_operation, reverted';
COMMENT ON COLUMN project_activities.metadata IS 'Activity-specific metadata (field changes, file info, etc.)';
-- ============================================================================
-- 5. Activity Comments
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (
    char_length(text) > 0
    AND char_length(text) <= 5000
  ),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE
  SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_activity ON activity_comments(activity_id, created_at ASC);
-- Enable Row Level Security
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
-- RLS Policies (Users can view comments for activities they can see)
DROP POLICY IF EXISTS "Users can view activity comments" ON activity_comments;
CREATE POLICY "Users can view activity comments" ON activity_comments FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM project_activities
      WHERE project_activities.id = activity_comments.activity_id -- Activities are visible if the project is accessible (inherited from activities policy)
    )
  );
DROP POLICY IF EXISTS "Users can create activity comments" ON activity_comments;
CREATE POLICY "Users can create activity comments" ON activity_comments FOR
INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM project_activities
      WHERE project_activities.id = activity_comments.activity_id -- Users can comment on activities they can view
    )
  );
COMMENT ON TABLE activity_comments IS 'Comments attached to project activities';
-- ============================================================================
-- Functions and Triggers
-- ============================================================================
-- Update updated_at timestamp for filter_presets
CREATE OR REPLACE FUNCTION update_filter_presets_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_filter_presets_updated_at ON filter_presets;
CREATE TRIGGER trigger_update_filter_presets_updated_at BEFORE
UPDATE ON filter_presets FOR EACH ROW EXECUTE FUNCTION update_filter_presets_updated_at();
-- Update updated_at timestamp for project_templates
CREATE OR REPLACE FUNCTION update_project_templates_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_project_templates_updated_at ON project_templates;
CREATE TRIGGER trigger_update_project_templates_updated_at BEFORE
UPDATE ON project_templates FOR EACH ROW EXECUTE FUNCTION update_project_templates_updated_at();