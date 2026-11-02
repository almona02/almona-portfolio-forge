-- Add execution workflow tables for Phase 2: Closed-Loop Production
-- Tables: execution_stages, execution_logs, inventory_consumption
-- Safe to run multiple times

-- Execution stages table (tracks production execution stages per project)
CREATE TABLE IF NOT EXISTS execution_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_project_id UUID NOT NULL REFERENCES production_projects(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL, -- 'material_prep', 'frame_assembly', 'sash_assembly', 'glazing', 'hardware_install', 'quality_check'
  stage_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_operator TEXT,
  notes TEXT,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution logs table (detailed logs of production activities)
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_stage_id UUID NOT NULL REFERENCES execution_stages(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN ('info', 'warning', 'error', 'completion', 'rework', 'rejection')),
  message TEXT NOT NULL,
  operator_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory consumption table (tracks material usage during production)
CREATE TABLE IF NOT EXISTS inventory_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_stage_id UUID NOT NULL REFERENCES execution_stages(id) ON DELETE CASCADE,
  bom_item_id TEXT NOT NULL, -- References BOM item ID
  item_category TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  planned_quantity DECIMAL(10,3) NOT NULL,
  actual_quantity DECIMAL(10,3),
  unit TEXT NOT NULL DEFAULT 'piece',
  wastage_quantity DECIMAL(10,3) DEFAULT 0,
  wastage_reason TEXT,
  supplier TEXT,
  batch_number TEXT,
  quality_check_passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_execution_stages_project_id ON execution_stages(production_project_id);
CREATE INDEX IF NOT EXISTS idx_execution_stages_status ON execution_stages(status);
CREATE INDEX IF NOT EXISTS idx_execution_stages_stage_id ON execution_stages(stage_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_stage_id ON execution_logs(execution_stage_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_type ON execution_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_stage_id ON inventory_consumption(execution_stage_id);
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_category ON inventory_consumption(item_category);
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_code ON inventory_consumption(item_code);

-- Enable Row Level Security
ALTER TABLE execution_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_consumption ENABLE ROW LEVEL SECURITY;

-- RLS Policies for execution_stages
DROP POLICY IF EXISTS "Users can view execution stages for their projects" ON execution_stages;
CREATE POLICY "Users can view execution stages for their projects" ON execution_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM production_projects
      WHERE production_projects.id = execution_stages.production_project_id
      AND production_projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert execution stages for their projects" ON execution_stages;
CREATE POLICY "Users can insert execution stages for their projects" ON execution_stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM production_projects
      WHERE production_projects.id = execution_stages.production_project_id
      AND production_projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update execution stages for their projects" ON execution_stages;
CREATE POLICY "Users can update execution stages for their projects" ON execution_stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM production_projects
      WHERE production_projects.id = execution_stages.production_project_id
      AND production_projects.user_id = auth.uid()
    )
  );

-- RLS Policies for execution_logs (inherit from execution_stages)
DROP POLICY IF EXISTS "Users can view execution logs for their projects" ON execution_logs;
CREATE POLICY "Users can view execution logs for their projects" ON execution_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM execution_stages es
      JOIN production_projects pp ON pp.id = es.production_project_id
      WHERE es.id = execution_logs.execution_stage_id
      AND pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert execution logs for their projects" ON execution_logs;
CREATE POLICY "Users can insert execution logs for their projects" ON execution_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM execution_stages es
      JOIN production_projects pp ON pp.id = es.production_project_id
      WHERE es.id = execution_logs.execution_stage_id
      AND pp.user_id = auth.uid()
    )
  );

-- RLS Policies for inventory_consumption (inherit from execution_stages)
DROP POLICY IF EXISTS "Users can view inventory consumption for their projects" ON inventory_consumption;
CREATE POLICY "Users can view inventory consumption for their projects" ON inventory_consumption
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM execution_stages es
      JOIN production_projects pp ON pp.id = es.production_project_id
      WHERE es.id = inventory_consumption.execution_stage_id
      AND pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert inventory consumption for their projects" ON inventory_consumption;
CREATE POLICY "Users can insert inventory consumption for their projects" ON inventory_consumption
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM execution_stages es
      JOIN production_projects pp ON pp.id = es.production_project_id
      WHERE es.id = inventory_consumption.execution_stage_id
      AND pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update inventory consumption for their projects" ON inventory_consumption;
CREATE POLICY "Users can update inventory consumption for their projects" ON inventory_consumption
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM execution_stages es
      JOIN production_projects pp ON pp.id = es.production_project_id
      WHERE es.id = inventory_consumption.execution_stage_id
      AND pp.user_id = auth.uid()
    )
  );

-- Updated_at trigger for execution_stages
DROP TRIGGER IF EXISTS update_execution_stages_updated_at ON execution_stages;
CREATE TRIGGER update_execution_stages_updated_at
  BEFORE UPDATE ON execution_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for inventory_consumption
DROP TRIGGER IF EXISTS update_inventory_consumption_updated_at ON inventory_consumption;
CREATE TRIGGER update_inventory_consumption_updated_at
  BEFORE UPDATE ON inventory_consumption
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();