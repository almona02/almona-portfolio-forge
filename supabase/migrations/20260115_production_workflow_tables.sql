-- Create production workflow tables for RA Workshop parity
-- Tables: production_projects, production_project_items, production_reports
-- Safe to run multiple times
-- Production projects table (persisted production projects with grouping)
CREATE TABLE IF NOT EXISTS production_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  grouping_mode TEXT NOT NULL CHECK (
    grouping_mode IN ('color', 'type', 'profile', 'none')
  ),
  filters JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'queued',
      'in_progress',
      'completed',
      'cancelled'
    )
  ),
  window_count INTEGER DEFAULT 0,
  total_bom_cost DECIMAL(10, 2) DEFAULT 0,
  total_labor_hours DECIMAL(6, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);
-- Production project items table (many-to-many between production projects and window units)
CREATE TABLE IF NOT EXISTS production_project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_project_id UUID NOT NULL REFERENCES production_projects(id) ON DELETE CASCADE,
  window_unit_id TEXT NOT NULL,
  -- References window unit ID (not a foreign key since window units may be ephemeral)
  window_order INTEGER NOT NULL,
  -- Order within the project
  group_key TEXT,
  -- Grouping key (color, type, profile value)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Production reports table (stored report snapshots for auditability)
CREATE TABLE IF NOT EXISTS production_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_project_id UUID NOT NULL REFERENCES production_projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (
    report_type IN (
      'execution_plan',
      'cutting_list',
      'purchase_order',
      'labor_summary',
      'waste_summary'
    )
  ),
  payload_json JSONB NOT NULL,
  file_size_bytes INTEGER,
  page_count INTEGER,
  generated_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_projects_user_id ON production_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_production_projects_status ON production_projects(status);
CREATE INDEX IF NOT EXISTS idx_production_projects_updated_at ON production_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_project_items_project_id ON production_project_items(production_project_id);
CREATE INDEX IF NOT EXISTS idx_production_project_items_group_key ON production_project_items(group_key);
CREATE INDEX IF NOT EXISTS idx_production_reports_project_id ON production_reports(production_project_id);
CREATE INDEX IF NOT EXISTS idx_production_reports_type ON production_reports(report_type);
-- Enable Row Level Security
ALTER TABLE production_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_reports ENABLE ROW LEVEL SECURITY;
-- RLS Policies for production_projects
DROP POLICY IF EXISTS "Users can view their own production projects" ON production_projects;
CREATE POLICY "Users can view their own production projects" ON production_projects FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own production projects" ON production_projects;
CREATE POLICY "Users can insert their own production projects" ON production_projects FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own production projects" ON production_projects;
CREATE POLICY "Users can update their own production projects" ON production_projects FOR
UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own production projects" ON production_projects;
CREATE POLICY "Users can delete their own production projects" ON production_projects FOR DELETE USING (auth.uid() = user_id);
-- RLS Policies for production_project_items (users can access items for their projects)
DROP POLICY IF EXISTS "Users can view production project items for their projects" ON production_project_items;
CREATE POLICY "Users can view production project items for their projects" ON production_project_items FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM production_projects
      WHERE production_projects.id = production_project_items.production_project_id
        AND production_projects.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can insert production project items for their projects" ON production_project_items;
CREATE POLICY "Users can insert production project items for their projects" ON production_project_items FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM production_projects
      WHERE production_projects.id = production_project_items.production_project_id
        AND production_projects.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can update production project items for their projects" ON production_project_items;
CREATE POLICY "Users can update production project items for their projects" ON production_project_items FOR
UPDATE USING (
    EXISTS (
      SELECT 1
      FROM production_projects
      WHERE production_projects.id = production_project_items.production_project_id
        AND production_projects.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can delete production project items for their projects" ON production_project_items;
CREATE POLICY "Users can delete production project items for their projects" ON production_project_items FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM production_projects
    WHERE production_projects.id = production_project_items.production_project_id
      AND production_projects.user_id = auth.uid()
  )
);
-- RLS Policies for production_reports (users can access reports for their projects)
DROP POLICY IF EXISTS "Users can view production reports for their projects" ON production_reports;
CREATE POLICY "Users can view production reports for their projects" ON production_reports FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM production_projects
      WHERE production_projects.id = production_reports.production_project_id
        AND production_projects.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can insert production reports for their projects" ON production_reports;
CREATE POLICY "Users can insert production reports for their projects" ON production_reports FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM production_projects
      WHERE production_projects.id = production_reports.production_project_id
        AND production_projects.user_id = auth.uid()
    )
  );
-- Updated_at trigger for production_projects
DROP TRIGGER IF EXISTS update_production_projects_updated_at ON production_projects;
CREATE TRIGGER update_production_projects_updated_at BEFORE
UPDATE ON production_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();