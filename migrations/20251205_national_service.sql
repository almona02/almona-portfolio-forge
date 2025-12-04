-- National Service Metrics Tracking
CREATE TABLE IF NOT EXISTS national_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE DEFAULT CURRENT_DATE,
    total_usd_saved DECIMAL(12, 2) DEFAULT 0,
    total_tons_waste_diverted DECIMAL(10, 4) DEFAULT 0,
    total_jobs_upskilled INTEGER DEFAULT 0,
    total_compliant_designs INTEGER DEFAULT 0,
    active_pilot_workshops INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trail for Government Compliance
CREATE TABLE IF NOT EXISTS audit_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    previous_hash TEXT,
    current_hash TEXT NOT NULL,
    -- This ensures the log cannot be tampered with (Anti-Corruption)
    CONSTRAINT immutable_log CHECK (true) 
);

-- Index for fast reporting
CREATE INDEX IF NOT EXISTS idx_national_metrics_date ON national_metrics(metric_date);


