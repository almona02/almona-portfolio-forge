-- Migration: 050_activity_events.sql
-- Description: Create activity events table for enterprise audit trail
-- Date: 2026-01-05
-- Phase: Foundation - Week 1 Day 1

-- Activity Events Table
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Constraint to ensure valid entity types
  CONSTRAINT activity_events_entity_type_check 
    CHECK (entity_type IN ('customer', 'project', 'invoice', 'quote', 'workflow', 'production', 'inventory', 'profile', 'payment'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_entity_timestamp ON activity_events(entity_type, entity_id, timestamp DESC);

-- RLS Policies
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activities for their own records or organization records
CREATE POLICY "Users can view activities for their organization"
  ON activity_events FOR SELECT
  USING (
    -- Users can see their own activities
    auth.uid() = user_id 
    OR 
    -- Users can see activities for entities they own or have access to
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (
        -- Same organization (if organization_id exists)
        EXISTS (
          SELECT 1 FROM profiles p2 
          WHERE p2.id = activity_events.user_id 
          AND p2.organization_id = profiles.organization_id
        )
        OR
        -- Direct ownership check for specific entity types
        (activity_events.entity_type = 'customer' AND EXISTS (
          SELECT 1 FROM fabricator_customers 
          WHERE id = activity_events.entity_id 
          AND owner_user_id = auth.uid()
        ))
        OR
        (activity_events.entity_type = 'project' AND EXISTS (
          SELECT 1 FROM fabricator_positions 
          WHERE id = activity_events.entity_id 
          AND owner_user_id = auth.uid()
        ))
      )
    )
  );

-- Policy: Users can insert their own activities
CREATE POLICY "Users can insert activities"
  ON activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: System can update activities (for webhook processing, etc.)
CREATE POLICY "System can update activities"
  ON activity_events FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to automatically log activity (can be called from triggers)
CREATE OR REPLACE FUNCTION log_activity(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_event_type VARCHAR(100),
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Insert activity
  INSERT INTO activity_events (
    entity_type,
    entity_id,
    event_type,
    user_id,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_event_type,
    v_user_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- Comments for documentation
COMMENT ON TABLE activity_events IS 'Enterprise audit trail for all entity activities';
COMMENT ON COLUMN activity_events.entity_type IS 'Type of entity (customer, project, invoice, etc.)';
COMMENT ON COLUMN activity_events.entity_id IS 'UUID of the entity';
COMMENT ON COLUMN activity_events.event_type IS 'Type of event (created, updated, deleted, etc.)';
COMMENT ON COLUMN activity_events.metadata IS 'Additional event data in JSON format';
COMMENT ON COLUMN activity_events.timestamp IS 'When the activity occurred';
COMMENT ON FUNCTION log_activity IS 'Helper function to log activities from database triggers';

