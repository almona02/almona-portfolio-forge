-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    severity VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster querying by timestamp and event type
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

-- Add comments
COMMENT ON TABLE security_events IS 'Audit log for security-related events';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (e.g., auth_failure, rate_limit_exceeded)';
COMMENT ON COLUMN security_events.severity IS 'Severity level: INFO, WARNING, ERROR, CRITICAL';

