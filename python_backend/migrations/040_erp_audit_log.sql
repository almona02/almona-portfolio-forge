-- ERP transaction audit log (financial event reliability layer)
-- Safe for Supabase/Postgres. Tracks idempotent dispatches to external ERPs.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS erp_transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID,

    -- Event classification
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('INVOICE', 'PURCHASE_ORDER', 'INVENTORY_SYNC', 'CUSTOMER_SYNC')),
    target_system VARCHAR(50) NOT NULL CHECK (target_system IN ('ODOO', 'XERO', 'QUICKBOOKS', 'ETA', 'MOCK')),

    -- Idempotency & lifecycle
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,

    -- Payloads
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    error_log TEXT,

    -- Compliance (Egyptian e-invoice)
    egyptian_compliance_ready BOOLEAN DEFAULT FALSE,
    einvoice_xml TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Optional FK (quotes table); left nullable to allow staging data
-- ALTER TABLE erp_transaction_log
--     ADD CONSTRAINT fk_erp_log_quote FOREIGN KEY (quote_id) REFERENCES quotes(id);

CREATE INDEX IF NOT EXISTS idx_erp_log_quote_id ON erp_transaction_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_erp_log_status ON erp_transaction_log(status) WHERE status IN ('PENDING', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_erp_log_idempotency ON erp_transaction_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_erp_log_created ON erp_transaction_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_log_status_retry ON erp_transaction_log(status, next_retry_at);

-- Maintain updated_at automatically
CREATE OR REPLACE FUNCTION update_erp_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS erp_log_updated_at ON erp_transaction_log;
CREATE TRIGGER erp_log_updated_at
    BEFORE UPDATE ON erp_transaction_log
    FOR EACH ROW
    EXECUTE FUNCTION update_erp_log_updated_at();

-- Set lifecycle timestamps when status changes
CREATE OR REPLACE FUNCTION update_erp_log_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Mark completion time once when entering a terminal state
        IF NEW.status IN ('SUCCESS', 'FAILED') AND COALESCE(OLD.status, '') <> NEW.status THEN
            IF NEW.processed_at IS NULL THEN
                NEW.processed_at = NOW();
            END IF;
        END IF;

        -- Track last error time when failing or retrying
        IF NEW.status IN ('FAILED', 'RETRYING') THEN
            IF NEW.last_error_at IS NULL OR COALESCE(OLD.status, '') <> NEW.status THEN
                NEW.last_error_at = NOW();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS erp_log_lifecycle ON erp_transaction_log;
CREATE TRIGGER erp_log_lifecycle
    BEFORE UPDATE ON erp_transaction_log
    FOR EACH ROW
    EXECUTE FUNCTION update_erp_log_lifecycle();

-- Simple monitoring view
CREATE OR REPLACE VIEW erp_transaction_summary AS
SELECT
    DATE(created_at) AS day,
    target_system,
    event_type,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') AS success_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000), 2) AS avg_processing_ms
FROM erp_transaction_log
GROUP BY DATE(created_at), target_system, event_type
ORDER BY day DESC;
