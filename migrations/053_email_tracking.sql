/**
 * Email Tracking Migration
 * 
 * Creates tables for email tracking (opens, clicks) and email history.
 * Supports email analytics and delivery tracking.
 * 
 * Constitutional: Deterministic email tracking, no ML/AI
 * Tier: 3 Protected Determinism
 */
-- Email Tracking Table (for tracking opens and clicks)
CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);
-- Drop constraint if exists, then add it
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_tracking_event_type_check'
) THEN
ALTER TABLE email_tracking DROP CONSTRAINT email_tracking_event_type_check;
END IF;
END $$;
ALTER TABLE email_tracking
ADD CONSTRAINT email_tracking_event_type_check CHECK (
        event_type IN (
            'sent',
            'delivered',
            'opened',
            'clicked',
            'bounced',
            'failed'
        )
    );
-- Email History Table (for storing sent emails)
CREATE TABLE IF NOT EXISTS email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
-- Drop constraint if exists, then add it
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_history_status_check'
) THEN
ALTER TABLE email_history DROP CONSTRAINT email_history_status_check;
END IF;
END $$;
ALTER TABLE email_history
ADD CONSTRAINT email_history_status_check CHECK (
        status IN (
            'pending',
            'sent',
            'delivered',
            'failed',
            'bounced'
        )
    );
-- Indexes for email_tracking
CREATE INDEX IF NOT EXISTS idx_email_tracking_message_id ON email_tracking(message_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event_type ON email_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_timestamp ON email_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);
-- Indexes for email_history
CREATE INDEX IF NOT EXISTS idx_email_history_message_id ON email_history(message_id);
CREATE INDEX IF NOT EXISTS idx_email_history_recipient ON email_history(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_template_type ON email_history(template_type);
CREATE INDEX IF NOT EXISTS idx_email_history_created_at ON email_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at DESC);
-- RLS Policies for email_tracking
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
-- Drop policy if exists
DROP POLICY IF EXISTS "Users can view their own email tracking" ON email_tracking;
CREATE POLICY "Users can view their own email tracking" ON email_tracking FOR
SELECT USING (
        recipient_email IN (
            SELECT email
            FROM auth.users
            WHERE id = auth.uid()
        )
    );
-- Drop policy if exists
DROP POLICY IF EXISTS "Service can insert email tracking" ON email_tracking;
CREATE POLICY "Service can insert email tracking" ON email_tracking FOR
INSERT WITH CHECK (true);
-- Service role can insert
-- RLS Policies for email_history
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;
-- Drop policy if exists
DROP POLICY IF EXISTS "Users can view their own email history" ON email_history;
CREATE POLICY "Users can view their own email history" ON email_history FOR
SELECT USING (
        recipient_email IN (
            SELECT email
            FROM auth.users
            WHERE id = auth.uid()
        )
    );
-- Drop policy if exists
DROP POLICY IF EXISTS "Service can manage email history" ON email_history;
CREATE POLICY "Service can manage email history" ON email_history FOR ALL USING (true);
-- Service role can manage
-- Function to update email history status
CREATE OR REPLACE FUNCTION update_email_history_status(
        p_message_id VARCHAR(255),
        p_status VARCHAR(20),
        p_timestamp TIMESTAMP DEFAULT NOW()
    ) RETURNS void AS $$ BEGIN
UPDATE email_history
SET status = p_status,
    sent_at = CASE
        WHEN p_status = 'sent' THEN p_timestamp
        ELSE sent_at
    END,
    delivered_at = CASE
        WHEN p_status = 'delivered' THEN p_timestamp
        ELSE delivered_at
    END,
    opened_at = CASE
        WHEN p_status = 'opened' THEN p_timestamp
        ELSE opened_at
    END,
    clicked_at = CASE
        WHEN p_status = 'clicked' THEN p_timestamp
        ELSE clicked_at
    END
WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get email statistics
CREATE OR REPLACE FUNCTION get_email_statistics(
        p_template_type VARCHAR(50) DEFAULT NULL,
        p_start_date TIMESTAMP DEFAULT NULL,
        p_end_date TIMESTAMP DEFAULT NULL
    ) RETURNS TABLE (
        total_sent BIGINT,
        total_delivered BIGINT,
        total_opened BIGINT,
        total_clicked BIGINT,
        delivery_rate NUMERIC,
        open_rate NUMERIC,
        click_rate NUMERIC
    ) AS $$ BEGIN RETURN QUERY
SELECT COUNT(*) FILTER (
        WHERE status IN ('sent', 'delivered')
    )::BIGINT as total_sent,
    COUNT(*) FILTER (
        WHERE status = 'delivered'
    )::BIGINT as total_delivered,
    COUNT(*) FILTER (
        WHERE opened_at IS NOT NULL
    )::BIGINT as total_opened,
    COUNT(*) FILTER (
        WHERE clicked_at IS NOT NULL
    )::BIGINT as total_clicked,
    CASE
        WHEN COUNT(*) FILTER (
            WHERE status IN ('sent', 'delivered')
        ) > 0 THEN ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE status = 'delivered'
            )::NUMERIC / COUNT(*) FILTER (
                WHERE status IN ('sent', 'delivered')
            )::NUMERIC,
            2
        )
        ELSE 0
    END as delivery_rate,
    CASE
        WHEN COUNT(*) FILTER (
            WHERE status = 'delivered'
        ) > 0 THEN ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE opened_at IS NOT NULL
            )::NUMERIC / COUNT(*) FILTER (
                WHERE status = 'delivered'
            )::NUMERIC,
            2
        )
        ELSE 0
    END as open_rate,
    CASE
        WHEN COUNT(*) FILTER (
            WHERE opened_at IS NOT NULL
        ) > 0 THEN ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE clicked_at IS NOT NULL
            )::NUMERIC / COUNT(*) FILTER (
                WHERE opened_at IS NOT NULL
            )::NUMERIC,
            2
        )
        ELSE 0
    END as click_rate
FROM email_history
WHERE (
        p_template_type IS NULL
        OR template_type = p_template_type
    )
    AND (
        p_start_date IS NULL
        OR created_at >= p_start_date
    )
    AND (
        p_end_date IS NULL
        OR created_at <= p_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;