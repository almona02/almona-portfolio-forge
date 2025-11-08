-- Migration: Add collaboration sessions table for multi-user 3D viewing
-- Created: 2024-01-XX
-- Purpose: Enable real-time collaborative 3D model viewing and annotation

-- Create collaboration_sessions table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participants UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collaboration_annotations table
CREATE TABLE IF NOT EXISTS collaboration_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position JSONB NOT NULL, -- {x, y, z} coordinates
  text TEXT NOT NULL,
  color TEXT DEFAULT '#ff6b35', -- Orange theme color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active 
ON collaboration_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_created_by 
ON collaboration_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_collaboration_annotations_session 
ON collaboration_annotations(session_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_annotations_author 
ON collaboration_annotations(author_id);

-- Enable Row Level Security
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can view sessions they participate in" ON collaboration_sessions
  FOR SELECT USING (
    auth.uid() = ANY(participants) OR 
    auth.uid() = created_by
  );

CREATE POLICY "Users can create sessions" ON collaboration_sessions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Session creators can update their sessions" ON collaboration_sessions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Session creators can delete their sessions" ON collaboration_sessions
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for collaboration_annotations
CREATE POLICY "Users can view annotations in sessions they participate in" ON collaboration_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collaboration_sessions 
      WHERE id = session_id 
      AND (auth.uid() = ANY(participants) OR auth.uid() = created_by)
    )
  );

CREATE POLICY "Users can create annotations in sessions they participate in" ON collaboration_annotations
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM collaboration_sessions 
      WHERE id = session_id 
      AND (auth.uid() = ANY(participants) OR auth.uid() = created_by)
    )
  );

CREATE POLICY "Users can update their own annotations" ON collaboration_annotations
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own annotations" ON collaboration_annotations
  FOR DELETE USING (auth.uid() = author_id);

-- Enable real-time for collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_annotations;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_collaboration_sessions_updated_at 
  BEFORE UPDATE ON collaboration_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_annotations_updated_at 
  BEFORE UPDATE ON collaboration_annotations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old inactive sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_collaboration_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM collaboration_sessions 
  WHERE is_active = false 
  AND updated_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE collaboration_sessions IS 'Stores active 3D model collaboration sessions';
COMMENT ON TABLE collaboration_annotations IS 'Stores annotations made during 3D model collaboration sessions';
COMMENT ON COLUMN collaboration_sessions.model_path IS 'Path to the 3D model file being viewed';
COMMENT ON COLUMN collaboration_sessions.participants IS 'Array of user IDs currently in the session';
COMMENT ON COLUMN collaboration_annotations.position IS '3D coordinates where annotation is placed';
COMMENT ON COLUMN collaboration_annotations.color IS 'Color of the annotation marker';
