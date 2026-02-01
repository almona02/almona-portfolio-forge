/**
 * Workflows Migration
 * 
 * Creates tables for workflow builder: workflow definitions, executions, and execution logs.
 * Enables users to create, manage, and execute custom workflows for business process automation.
 * 
 * Constitutional: Deterministic workflow storage and execution, no ML/AI
 * Tier: 3 Protected Determinism
 */
-- Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (
    category IN ('business', 'automation', 'approval', 'custom')
  ),
  workflow_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  version VARCHAR(50) DEFAULT '1.0.0',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  triggered_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled'
    )
  ),
  execution_data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Workflow Execution Logs Table
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'running',
      'completed',
      'failed',
      'skipped'
    )
  ),
  input_data JSONB,
  output_data JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for workflows
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_public ON workflows(is_public)
WHERE is_public = TRUE
  AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active)
WHERE is_active = TRUE
  AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_template ON workflows(is_template)
WHERE is_template = TRUE
  AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_deleted ON workflows(deleted_at)
WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflows_user_name_unique ON workflows(user_id, name)
WHERE deleted_at IS NULL;
-- Indexes for workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status)
WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started ON workflow_executions(started_at DESC);
-- Indexes for workflow_execution_logs
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_node ON workflow_execution_logs(node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_status ON workflow_execution_logs(status);
-- RLS Policies for workflows
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view public workflows" ON workflows;
CREATE POLICY "Users can view public workflows" ON workflows FOR
SELECT USING (
    is_public = TRUE
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can view their own workflows" ON workflows;
CREATE POLICY "Users can view their own workflows" ON workflows FOR
SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can create their own workflows" ON workflows;
CREATE POLICY "Users can create their own workflows" ON workflows FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own workflows" ON workflows;
CREATE POLICY "Users can update their own workflows" ON workflows FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );
DROP POLICY IF EXISTS "Users can delete their own workflows" ON workflows;
CREATE POLICY "Users can delete their own workflows" ON workflows FOR
UPDATE USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  ) WITH CHECK (auth.uid() = user_id);
-- RLS Policies for workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own workflow executions" ON workflow_executions;
CREATE POLICY "Users can view their own workflow executions" ON workflow_executions FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own workflow executions" ON workflow_executions;
CREATE POLICY "Users can create their own workflow executions" ON workflow_executions FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own workflow executions" ON workflow_executions;
CREATE POLICY "Users can update their own workflow executions" ON workflow_executions FOR
UPDATE USING (auth.uid() = user_id);
-- Allow service role to update executions (for background workers)
DROP POLICY IF EXISTS "Service role can update all workflow executions" ON workflow_executions;
CREATE POLICY "Service role can update all workflow executions" ON workflow_executions FOR
UPDATE USING (auth.jwt()->>'role' = 'service_role');
-- RLS Policies for workflow_execution_logs
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view logs for their executions" ON workflow_execution_logs;
CREATE POLICY "Users can view logs for their executions" ON workflow_execution_logs FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM workflow_executions
      WHERE workflow_executions.id = workflow_execution_logs.execution_id
        AND workflow_executions.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Service role can insert execution logs" ON workflow_execution_logs;
CREATE POLICY "Service role can insert execution logs" ON workflow_execution_logs FOR
INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');
DROP POLICY IF EXISTS "Service role can update execution logs" ON workflow_execution_logs;
CREATE POLICY "Service role can update execution logs" ON workflow_execution_logs FOR
UPDATE USING (auth.jwt()->>'role' = 'service_role');
-- Updated at triggers
CREATE OR REPLACE FUNCTION update_workflows_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_workflow_executions_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_workflows_updated_at ON workflows;
CREATE TRIGGER trigger_update_workflows_updated_at BEFORE
UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_workflows_updated_at();
DROP TRIGGER IF EXISTS trigger_update_workflow_executions_updated_at ON workflow_executions;
CREATE TRIGGER trigger_update_workflow_executions_updated_at BEFORE
UPDATE ON workflow_executions FOR EACH ROW EXECUTE FUNCTION update_workflow_executions_updated_at();