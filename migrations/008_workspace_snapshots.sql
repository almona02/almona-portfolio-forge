-- Migration: Add workspace snapshots table for multi-user support

-- This enables FabricatorWorkspaceContext to sync across devices

CREATE TABLE IF NOT EXISTS workspace_snapshots (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_data JSONB NOT NULL,
  last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for efficient querying
  CONSTRAINT valid_workspace_data CHECK (jsonb_typeof(workspace_data) = 'object')
);

-- Enable RLS
ALTER TABLE workspace_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only access their own workspace snapshots
CREATE POLICY "Users manage own workspace snapshots"
ON workspace_snapshots
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_user_id 
ON workspace_snapshots(user_id);

-- Add to audit logging (optional but recommended)
COMMENT ON TABLE workspace_snapshots IS 'Stores Fabricator workspace state for multi-device sync';


