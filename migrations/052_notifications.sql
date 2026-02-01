/**
 * Notifications System Migration
 * 
 * Creates tables for unified notification system supporting multiple channels
 * (email, in-app, push, SMS) with rule-based triggers.
 * 
 * Constitutional: Deterministic notification system, no ML/AI
 * Tier: 3 Protected Determinism
 */

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'in_app', 'push', 'sms')),
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT notifications_channel_check CHECK (channel IN ('email', 'in_app', 'push', 'sms'))
);

-- Notification Rules Table (for rule-based triggers)
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_event VARCHAR(100) NOT NULL,
  conditions JSONB DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Indexes for notification_rules
CREATE INDEX IF NOT EXISTS idx_notification_rules_user ON notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON notification_rules(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_notification_rules_trigger ON notification_rules(trigger_event);

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_rules
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification rules"
  ON notification_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification rules"
  ON notification_rules FOR ALL
  USING (auth.uid() = user_id);

-- Updated at trigger for notification_rules
CREATE OR REPLACE FUNCTION update_notification_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_rules_updated_at();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE user_id = user_id_param AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

